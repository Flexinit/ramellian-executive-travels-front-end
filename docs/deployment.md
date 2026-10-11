# Deploying the frontend (VPS + Jenkins + Docker)

How the frontend goes live on the VPS. The VPS already runs Jenkins and Docker, and other Ramellian projects already
deploy through them. The frontend is added as one more Jenkins job that builds a Docker image and runs it next to the backend.

**Deploying is automatic: push to `master` and it goes live.**

```
git push origin master
  → GitHub webhook calls Jenkins
  → Jenkins: tests → installs the Nginx site from the repo → builds the Docker image
             → replaces the container → smoke test
  → live at ramellianexecutivetravels.co.ke
```

Everything about the server's web setup comes from the repo on each push: the Nginx site, its routing, and whether it
serves http or https. What's left is a short one-time setup. None of it can come from a push, because it has to exist
before a push can trigger anything, or because it lives outside the server:

| One-time | Where | Step |
|---|---|---|
| Point the root `A` record at the VPS | DNS Management | [1](#step-1-point-the-domain-at-the-vps) |
| Check Docker access and port 8085; allow Jenkins to update Nginx | VPS, as root | [2](#step-2-prepare-the-vps) |
| Google client ID credential, `ramellian-frontend` job | Jenkins | [3](#step-3-connect-the-repo-to-jenkins) |
| Push webhook | GitHub repo settings | [3](#step-3-connect-the-repo-to-jenkins) |
| Get the HTTPS certificate (one command, once DNS has moved) | VPS, as root | [4](#step-4-turn-on-https) |
| Google OAuth origins, Pesapal URLs, backend links | Outside services | [6](#step-6-outside-services-that-need-the-new-address) |

## How it fits together

```
Browser ──▶ Host Nginx on the VPS (site installed by Jenkins from deploy/nginx/)
              ├── /api/...      ──▶ backend (Spring Boot) 127.0.0.1:8090
              ├── /uploads/...  ──▶ backend (photos, chat media)
              └── everything    ──▶ frontend container 127.0.0.1:8085 (Nginx + built site)

GitHub (master) ──▶ Jenkins on the VPS ──▶ docker build ──▶ replaces the frontend container
```

- The frontend calls `${VITE_API_BASE_URL}/api/v1/...` and loads photos from `${VITE_API_BASE_URL}/uploads/...`.
- The pipeline picks `VITE_API_BASE_URL` itself on every build:
  - **Before HTTPS** (no certificate yet): the backend directly, `http://102.68.87.231:8090` (`DIRECT_API_URL` in the
    `Jenkinsfile`, also the `Dockerfile` default). The site is on plain http, and the backend must allow CORS from the
    site's address, because the site and the API are then different origins.
  - **After HTTPS**: the site itself, `https://ramellianexecutivetravels.co.ke` (`SITE_URL`). Host Nginx forwards `/api`
    and `/uploads` to the backend, so both share one origin: no CORS, and no "mixed content" blocking (browsers refuse
    an https page calling an http API).
- `VITE_*` values are baked into the files at **build** time. Changing one means running the Jenkins job again;
  restarting the container is not enough.

### Why Docker

It matches the existing Jenkins + Docker setup:

- The VPS needs no Node.js install; the Node version is pinned in the `Dockerfile`.
- Every build is a tagged image (`ramellian-frontend:<build number>`). The last 5 are kept, so rolling back takes one command (see [Rolling back](#rolling-back)).
- The site runs in its own container, apart from the backend and Jenkins.

### Files involved

| File | What it does |
|---|---|
| [`Jenkinsfile`](../Jenkinsfile) | Test → Host Nginx → build image → replace container → smoke test |
| [`Dockerfile`](../Dockerfile) | Installs, tests (`--target test`), builds and packs the site into an Nginx image |
| [`.dockerignore`](../.dockerignore) | Keeps `node_modules`, `dist` and local `.env` files out of the image |
| [`deploy/nginx/frontend-container.conf`](../deploy/nginx/frontend-container.conf) | Nginx inside the container: client-side routes and caching |
| [`deploy/nginx/install-host-site.sh`](../deploy/nginx/install-host-site.sh) | Run by the pipeline: installs the host site, checks it with `nginx -t` (puts the old one back if it fails), reloads Nginx only when something changed |
| [`deploy/nginx/ramellian-locations.conf`](../deploy/nginx/ramellian-locations.conf) | The routing: `/api` and `/uploads` to the backend, the rest to the container |
| [`deploy/nginx/host-site.conf`](../deploy/nginx/host-site.conf) | Host site on plain http, used until a certificate exists |
| [`deploy/nginx/host-site-https.conf`](../deploy/nginx/host-site-https.conf) | Host site on https (http redirects to it), used once the certificate exists |
| [`deploy/sudoers/jenkins-ramellian`](../deploy/sudoers/jenkins-ramellian) | Lets the `jenkins` user run exactly the Nginx commands the script needs |

To change the server's routing, edit the files in `deploy/nginx/` and push. Don't edit them on the server: the next
deploy overwrites them.

---

## Step 1: Point the domain at the VPS

The domain's DNS stays with the current host (its **DNS Management** page), and the domain's email stays on the cPanel server.

1. Open **DNS Management** for `ramellianexecutivetravels.co.ke`.
2. Edit **one** record, the root `A` record:

   | Name | Type | From | To |
   |---|---|---|---|
   | `ramellianexecutivetravels.co.ke.` | A | `102.209.117.206` | `102.68.87.231` |

3. Leave everything else as it is:
   - `www` is a CNAME to the root, so it follows it to the VPS by itself.
   - `mail`, `smtp`, `pop` and `ftp` have their own `A` records on the cPanel server (`102.209.117.206`), and `MX` points to `mail`, so email and FTP keep working.
   - The SPF `TXT` record already lists `ip4:102.209.117.206`, so cPanel can still send mail.
   - Don't touch `NS`, `_acme-challenge` or the DKIM `TXT` (`x._domainkey`).
4. Wait until `nslookup ramellianexecutivetravels.co.ke 8.8.8.8` returns `102.68.87.231`. The records' TTL is 3600, so this can take up to an hour.

## Step 2: Prepare the VPS

Jenkins, Docker and Nginx are already there, so this is mostly a check. As root:

```bash
sudo -u jenkins docker ps                   # the jenkins user can run docker: prints a table, not "permission denied"
ss -ltnp | grep -E ':8085|:80 |:443 '       # 8085 must be free; see what already serves web traffic
ps -o user= -p "$(pgrep -f jenkins.war | head -1)"   # which user Jenkins runs as
```

**Let Jenkins update Nginx.** The pipeline installs the site with root rights, using only the commands listed in
[`deploy/sudoers/jenkins-ramellian`](../deploy/sudoers/jenkins-ramellian): writing the two site files, enabling the
site, `nginx -t`, reloading Nginx, and checking whether the certificate exists. Skip this if Jenkins runs as `root`.
Otherwise, copy that file to the VPS and run:

```bash
apt install -y sudo        # only if `sudo` isn't installed
install -m 440 jenkins-ramellian /etc/sudoers.d/jenkins-ramellian && visudo -c
```

`visudo -c` must say the files "parsed OK".

Anyone who can push to `master` can change this Nginx site (but nothing else on the server). That is the same people
who can already change what the site serves.

Other cases:

- **8085 already in use:** pick a free port and change it in two places: `HOST_PORT` in the `Jenkinsfile`, and the `location /` `proxy_pass` in `deploy/nginx/ramellian-locations.conf`.
- **Ports 80/443 are taken by something other than Nginx** (for example a proxy container used by another project): the
  automatic Nginx stage won't work. Add the `location` blocks from `deploy/nginx/ramellian-locations.conf` to that proxy instead.
- **Firewall:** 80 and 443 must be open (`ufw allow 'Nginx Full'`). Until HTTPS is on, 8090 must be open too, because the site calls the backend directly.
- **If Jenkins runs in a Docker container** (and builds through the host's `/var/run/docker.sock`), it can't reach the
  host's Nginx, and `127.0.0.1` in the smoke test is the Jenkins container, not the host. Tell me and the pipeline can be adapted.

You don't need to remove `/etc/nginx/sites-enabled/default`: requests for `ramellianexecutivetravels.co.ke` go to this
site by name. Remove it only if nothing else uses it and you want other names to get no answer.

## Step 3: Connect the repo to Jenkins

Jenkins is reachable from the internet, so a GitHub webhook can start a deploy the moment `master` changes.

1. **Credential for the Google client ID**: *Manage Jenkins → Credentials → (global) → Add Credentials*
   - Kind: **Secret text**
   - Secret: the value of `VITE_GOOGLE_CLIENT_ID` from `.env.example`
   - ID: **`ramellian-google-client-id`** (the `Jenkinsfile` looks it up by this exact ID)

2. **The job**: *New Item → **Multibranch Pipeline***, name `ramellian-frontend`:
   - Branch Sources → **GitHub** → `https://github.com/Flexinit/ramellian-executive-travels-front-end.git`,
     with the **same GitHub credential the existing jobs use**.
   - Build Configuration → by **Jenkinsfile** (path `Jenkinsfile`).
   - Save. Jenkins scans the repo straight away.

   It must be **Multibranch**, even if the existing jobs are plain Pipelines. The Host Nginx, Deploy and Smoke test
   stages run only on `master`, and Jenkins knows the branch name only in multibranch jobs. In a plain Pipeline they are
   always skipped. Other branches are still tested and built, but not deployed.

3. **The webhook**: on GitHub, the repo → **Settings → Webhooks → Add webhook**:
   - Payload URL: `https://<jenkins-address>/github-webhook/` (keep the trailing slash; needs Jenkins' GitHub plugin)
   - Content type: `application/json`
   - Which events: **Just the push event**
   - Save. A green tick next to the webhook in GitHub means Jenkins answered. A red one shows the error under
     *Recent Deliveries*.

From here on, every push to `master` deploys. The first one puts the site up on plain http.

## Step 4: Turn on HTTPS

Do this once `nslookup ramellianexecutivetravels.co.ke 8.8.8.8` shows `102.68.87.231` and a deploy has run, so the
http site is already installed. Let's Encrypt checks the domain over port 80 on this server, so it fails until DNS has
moved. As root:

```bash
apt update && apt install -y certbot python3-certbot-nginx
certbot certonly --nginx -d ramellianexecutivetravels.co.ke -d www.ramellianexecutivetravels.co.ke
```

Use **`certonly`**: it only gets the certificate and leaves the site files alone. The https site comes from the repo
(`deploy/nginx/host-site-https.conf`). Certbot renews the certificate by itself.

Then push to `master`, or click **Build Now** on `master`. The pipeline sees the certificate and switches everything
in one go:

- it installs the https site (http now redirects to https)
- it builds with `VITE_API_BASE_URL=https://ramellianexecutivetravels.co.ke`, so API calls go through Nginx on the same origin.

Check: `curl -I https://ramellianexecutivetravels.co.ke/swagger-ui/index.html`.

## Step 5: The live values

These live in the `Jenkinsfile`'s `environment` block. Change one by editing it and pushing.

| Setting | Value |
|---|---|
| `SITE_URL` | `https://ramellianexecutivetravels.co.ke`, used as the API address once HTTPS is on |
| `DIRECT_API_URL` | `http://102.68.87.231:8090`, used as the API address until then |
| `VITE_PESAPAL_ENV` | `live` (use `sandbox` while testing payments) |
| `VITE_ENABLE_WHATSAPP_VERIFICATION` | `false` until WhatsApp verification is switched on |

## Step 6: Outside services that need the new address

- **Google Cloud Console** → APIs & Services → Credentials → the OAuth client → **Authorised JavaScript origins**:
  add `https://ramellianexecutivetravels.co.ke` and `https://www.ramellianexecutivetravels.co.ke`. Without this, "Continue with Google" fails.
- **Pesapal** (live account): register the callback and IPN URLs on `https://ramellianexecutivetravels.co.ke/...`.
- **Backend config**: links it puts in emails (verify email, reset password), and any allowed origins, must use the https domain.
  Until HTTPS is on, the backend must also allow CORS from `http://ramellianexecutivetravels.co.ke`.

## Step 7: First deploy and checks

1. Push to `master`. The webhook starts the build within seconds (or use the job → `master` → **Build Now**).
2. Watch the stages in Jenkins: **Test → Host Nginx → Build image → Deploy → Smoke test** should all go green.
   The Host Nginx log ends with `Site scheme: http` or `Site scheme: https`, and Build image prints the API address it used.
3. On the VPS: `docker ps` shows `ramellian-frontend` running on `127.0.0.1:8085`.
4. Before HTTPS, in a browser at `http://ramellianexecutivetravels.co.ke`:
   - The home page loads with no console errors.
   - Open a deep link (e.g. `/auth/login`) and **refresh**: it loads, not 404.
   - Log in: requests go to `http://102.68.87.231:8090/api/v1/...` (DevTools → Network) with no CORS errors.
   - Vehicle photos load (`/uploads/...`).
5. After HTTPS (Step 4), repeat at `https://ramellianexecutivetravels.co.ke`. Requests should now go to
   `https://ramellianexecutivetravels.co.ke/api/v1/...`, `http://` should redirect to `https://`, and
   "Continue with Google" should open Google's sign-in (it needs https and the authorised origins from Step 6).

## Everyday use

- **Deploy**: merge or push to `master`. Jenkins tests, updates the Nginx site if it changed, builds and swaps the
  container. Downtime is a second or two while the container restarts.
- **Change routing** (paths, upload size, ports): edit `deploy/nginx/` and push. A broken config fails `nginx -t`, the
  previous one is put back, and the build stops before deploying.
- **Change a `VITE_*` value**: edit the `Jenkinsfile`, push, and the new build carries it.
- **Logs**: `docker logs -f ramellian-frontend` (frontend container), `/var/log/nginx/` (host Nginx), Jenkins console output (builds).

### Rolling back

The last 5 builds are kept as images. To go back to build 41:

```bash
docker images ramellian-frontend            # see which build numbers exist
docker rm -f ramellian-frontend
docker run -d --name ramellian-frontend --restart unless-stopped \
  -p 127.0.0.1:8085:80 ramellian-frontend:41
```

The next successful Jenkins deploy replaces it again.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Pushing to `master` starts no build | Webhook missing or failing: GitHub → Settings → Webhooks → *Recent Deliveries*. The URL must end in `/github-webhook/` (Step 3) |
| `permission denied ... docker.sock` in Jenkins | The job runs on an agent/user without Docker access. Run it where the existing Docker jobs run (Step 2) |
| Host Nginx fails with `sudo: a password is required` or `sudo: not found` | The sudoers rule isn't installed, or `sudo` isn't (Step 2) |
| Host Nginx fails after `nginx -t` errors | A config in `deploy/nginx/` is broken; the old one was put back. Fix it and push. The log shows the line |
| `Could not find credentials entry with ID 'ramellian-google-client-id'` | Credential missing or named differently (Step 3) |
| Host Nginx, Deploy and Smoke test show as skipped | Job is a plain Pipeline, not a Multibranch Pipeline, or the branch isn't `master` (Step 3) |
| Still on http after running certbot | No deploy since: push or click **Build Now**. Check the Host Nginx log says `Site scheme: https` |
| certbot fails | DNS doesn't point at the VPS yet, or port 80 is closed. Check `nslookup` (Step 1) and the firewall (Step 2) |
| 502 Bad Gateway on `/` | Frontend container isn't running: `docker ps -a`, `docker logs ramellian-frontend` |
| 502 on `/api/...` | Backend isn't running on `127.0.0.1:8090` |
| 404 when refreshing a page | Request isn't reaching the container's Nginx config; check `location /` in `deploy/nginx/ramellian-locations.conf` |
| Console shows "Mixed Content … blocked" | The page is on https but was built with the http API address. Run the job again; Build image should print the https address |
| Console shows a CORS error | Before HTTPS the site calls the backend directly; the backend must allow `http://ramellianexecutivetravels.co.ke` |
| "413 Request Entity Too Large" on photo upload | Raise `client_max_body_size` in `deploy/nginx/ramellian-locations.conf` (and the backend's own upload limit) |
| Typing indicator in chat never shows | The SSE `location` block in `deploy/nginx/ramellian-locations.conf` is missing or `proxy_buffering` is on |
| Test stage fails | A test is failing. Run `npm test` locally, fix it, then push |
