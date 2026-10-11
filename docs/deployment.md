# Deploying the frontend (GitHub Actions + Jenkins + Docker)

How the frontend goes live on the VPS. The VPS is small, so it builds nothing: GitHub Actions tests the code and
builds the Docker image on GitHub's machines, and Jenkins on the VPS only pulls that image and runs it next to the backend.

**Deploying is automatic: push to `master` and it goes live.**

```
git push origin master
  ├─▶ GitHub Actions (GitHub's machines): npm ci → full test suite → build image → publish to ghcr.io   ~5–10 min
  └─▶ GitHub webhook → Jenkins on the VPS: waits for that image → installs the Nginx site from the repo
                                           → pulls the image → replaces the container → smoke test    ~1 min of work
  → live at ramellianexecutivetravels.co.ke
```

If the tests fail on GitHub, no image is published for that commit, so Jenkins has nothing to deploy and the live site
stays as it was.

The one-time setup is below. None of it can come from a push, because it has to exist before a push can trigger
anything, or because it lives outside the server:

| One-time | Where | Step |
|---|---|---|
| Point the root `A` record at the VPS | DNS Management | [1](#step-1-point-the-domain-at-the-vps) |
| Check Docker access and port 8085; allow Jenkins to update Nginx | VPS, as root | [2](#step-2-prepare-the-vps) |
| Make the image package public (after the first Actions run) | GitHub | [3](#step-3-github-actions-and-the-image) |
| `ramellian-frontend` job, push webhook | Jenkins, GitHub repo settings | [4](#step-4-connect-the-repo-to-jenkins) |
| Get the HTTPS certificate (one command, once DNS has moved) | VPS, as root | [5](#step-5-turn-on-https) |
| Google OAuth origins, Pesapal URLs, backend links | Outside services | [7](#step-7-outside-services-that-need-the-new-address) |

## How it fits together

```
Browser ──▶ Host Nginx on the VPS (site installed by Jenkins from deploy/nginx/)
              ├── /api/...      ──▶ backend (Spring Boot) 127.0.0.1:8090
              ├── /uploads/...  ──▶ backend (photos, chat media)
              └── everything    ──▶ frontend container 127.0.0.1:8085 (Nginx + built site)
```

- The site calls the API on **its own address**: `VITE_API_BASE_URL` is empty, so requests go to `/api/v1/...` and
  photos to `/uploads/...` on whichever address the page was opened from, http or https. Host Nginx forwards them to
  the backend.
- Nginx drops the browser's `Origin` header on the way. The backend's CORS settings refuse every browser origin
  (`403 Invalid CORS request`), so without this the browser could not log in. Because the requests are same-site,
  dropping it is safe, and there's also no "mixed content" problem (an https page calling an http API).
- Local development works the same way: `npm run dev` forwards `/api` and `/uploads` to `DEV_API_PROXY_TARGET`
  from `.env` and drops `Origin` too (`vite.config.js`).
- `VITE_*` values are baked into the files when the image is **built** (in the GitHub Actions workflow). Changing one
  means pushing a new commit; restarting the container is not enough.

### What runs where

| | GitHub Actions | VPS |
|---|---|---|
| Install packages, run all 1,452 tests | ✓ (~5 min) | — |
| Vite build (needs ~768 MB of memory) | ✓ | — |
| Build and store the Docker image | ✓ (ghcr.io) | — |
| Pull the image (~25 MB), run it | — | ✓ |
| Install the Nginx site | — | ✓ |

The VPS's share is a pull, a container restart and an Nginx reload: seconds of work, and a few MB of memory for the
running site.

### Files involved

| File | What it does |
|---|---|
| [`.github/workflows/frontend-image.yml`](../.github/workflows/frontend-image.yml) | On every push and pull request: full test suite. On `master`: also builds the image and publishes it as `ghcr.io/flexinit/ramellian-executive-travels-front-end:sha-<commit>` (and `:latest`) |
| [`Jenkinsfile`](../Jenkinsfile) | Wait for image → Host Nginx → replace container → smoke test |
| [`Dockerfile`](../Dockerfile) | Builds the site and packs it into a small Nginx image (used by the workflow) |
| [`.dockerignore`](../.dockerignore) | Keeps `node_modules`, `dist` and local `.env` files out of the image |
| [`deploy/nginx/frontend-container.conf`](../deploy/nginx/frontend-container.conf) | Nginx inside the container: client-side routes and caching |
| [`deploy/nginx/install-host-site.sh`](../deploy/nginx/install-host-site.sh) | Run by Jenkins: installs the host site, checks it with `nginx -t` (puts the old one back if it fails), reloads Nginx only when something changed |
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
```

**Let Jenkins update Nginx.** Jenkins installs the site with root rights, using only the commands listed in
[`deploy/sudoers/jenkins-ramellian`](../deploy/sudoers/jenkins-ramellian): writing the two site files, enabling the
site, `nginx -t`, reloading Nginx, and checking whether the certificate exists. Jenkins already has the file in its
workspace once the job has run; as root:

```bash
F=$(ls -d /var/lib/jenkins/workspace/*/deploy/sudoers/jenkins-ramellian | head -1)
install -m 440 "$F" /etc/sudoers.d/jenkins-ramellian && visudo -c     # must say "parsed OK"
sudo -u jenkins sudo -n /usr/sbin/nginx -t                              # works without a password prompt
```

Anyone who can push to `master` can change this Nginx site (but nothing else on the server). That is the same people
who can already change what the site serves.

Other cases:

- **8085 already in use:** pick a free port and change it in two places: `HOST_PORT` in the `Jenkinsfile`, and the `location /` `proxy_pass` in `deploy/nginx/ramellian-locations.conf`.
- **Ports 80/443 are taken by something other than Nginx** (for example a proxy container used by another project): the
  automatic Nginx stage won't work. Add the `location` blocks from `deploy/nginx/ramellian-locations.conf` to that proxy instead.
- **Firewall:** 80 and 443 must be open (`ufw allow 'Nginx Full'`). The site reaches the backend through Nginx, so 8090 doesn't need to be public for it.

You don't need to remove `/etc/nginx/sites-enabled/default`: requests for `ramellianexecutivetravels.co.ke` go to this
site by name. Remove it only if nothing else uses it and you want other names to get no answer.

## Step 3: GitHub Actions and the image

The workflow needs no secrets: it publishes to GitHub's registry with the token GitHub gives every run.

1. Push to `master`, then open the repo's **Actions** tab. The **Frontend image** run should go green
   (**test** → **image**).
2. **Check the image is public, once.** The repository is public and the image is linked to it, so the package is
   normally public too. If it shows as private, the VPS would need a login to pull it. Make it public: your profile
   or organisation → **Packages** → `ramellian-executive-travels-front-end` → **Package settings** → *Danger Zone* →
   **Change visibility** → **Public**. The image only contains the built website, which anyone visiting the site
   downloads anyway.

Check from the VPS: `docker pull ghcr.io/flexinit/ramellian-executive-travels-front-end:latest` works without logging in.

If **Actions** is switched off for the repo (*Settings → Actions → General*), allow it there.

## Step 4: Connect the repo to Jenkins

Jenkins is reachable from the internet, so the GitHub webhook starts it the moment `master` changes. It then waits for
the image from Step 3.

1. **The job**: *New Item → **Multibranch Pipeline***, name `ramellian-frontend`:
   - Branch Sources → **GitHub** → `https://github.com/Flexinit/ramellian-executive-travels-front-end.git`,
     with the **same GitHub credential the existing jobs use**.
   - Build Configuration → by **Jenkinsfile** (path `Jenkinsfile`).
   - Save. Jenkins scans the repo straight away.

   It must be **Multibranch**, even if the existing jobs are plain Pipelines. The stages run only on `master`, and
   Jenkins knows the branch name only in multibranch jobs. In a plain Pipeline they are always skipped.

2. **The webhook**: on GitHub, the repo → **Settings → Webhooks → Add webhook**:
   - Payload URL: `https://<jenkins-address>/github-webhook/` (keep the trailing slash; needs Jenkins' GitHub plugin)
   - Content type: `application/json`
   - Which events: **Just the push event**
   - Save. A green tick next to the webhook in GitHub means Jenkins answered. A red one shows the error under
     *Recent Deliveries*.

From here on, every push to `master` deploys. The first one puts the site up on plain http.

## Step 5: Turn on HTTPS

Do this once `nslookup ramellianexecutivetravels.co.ke 8.8.8.8` shows `102.68.87.231` and a deploy has run, so the
http site is already installed. Let's Encrypt checks the domain over port 80 on this server, so it fails until DNS has
moved. As root:

```bash
apt update && apt install -y certbot python3-certbot-nginx
certbot certonly --nginx -d ramellianexecutivetravels.co.ke -d www.ramellianexecutivetravels.co.ke
```

Use **`certonly`**: it only gets the certificate and leaves the site files alone. The https site comes from the repo
(`deploy/nginx/host-site-https.conf`). Certbot renews the certificate by itself.

Then push to `master`, or click **Build Now** on `master`. Jenkins sees the certificate and installs the https site;
http now redirects to https. Nothing else changes: the site already calls the API on its own address.

Check: `curl -I https://ramellianexecutivetravels.co.ke/swagger-ui/index.html`.

## Step 6: The live values

These are set in the workflow's `build-args` (`.github/workflows/frontend-image.yml`). Change one by editing it and pushing.

| Setting | Value |
|---|---|
| `VITE_API_BASE_URL` | empty: the site calls the API on its own address |
| `VITE_SWAGGER_URL` | `http://102.68.87.231:8090/swagger-ui/index.html`, only shown in developer hints |
| `VITE_PESAPAL_ENV` | `live` (use `sandbox` while testing payments) |
| `VITE_GOOGLE_CLIENT_ID` | the Google OAuth client ID (public by design: it ships in the site's code) |
| `VITE_ENABLE_WHATSAPP_VERIFICATION` | `false` until WhatsApp verification is switched on |

## Step 7: Outside services that need the new address

- **Google Cloud Console** → APIs & Services → Credentials → the OAuth client → **Authorised JavaScript origins**:
  add `https://ramellianexecutivetravels.co.ke` and `https://www.ramellianexecutivetravels.co.ke`. Without this, "Continue with Google" fails.
- **Pesapal** (live account): register the callback and IPN URLs on `https://ramellianexecutivetravels.co.ke/...`.
- **Backend config**: links it puts in emails (verify email, reset password), and any allowed origins, must use the https domain.

## Step 8: First deploy and checks

1. Push to `master`.
2. On GitHub → **Actions**: **Frontend image** goes green (**test** → **image**), in about 5–10 minutes.
3. In Jenkins: **Wait for image → Host Nginx → Deploy → Smoke test** go green. Wait for image finishes once
   GitHub's run has. The Host Nginx log ends with `Site scheme: http` or `Site scheme: https`.
4. On the VPS: `docker ps` shows `ramellian-frontend` running on `127.0.0.1:8085`.
5. Before HTTPS, in a browser at `http://ramellianexecutivetravels.co.ke`:
   - The home page loads with no console errors.
   - Open a deep link (e.g. `/auth/login`) and **refresh**: it loads, not 404.
   - Log in: requests go to `http://ramellianexecutivetravels.co.ke/api/v1/...` (DevTools → Network).
   - Vehicle photos load (`/uploads/...`).
6. After HTTPS (Step 5), repeat at `https://ramellianexecutivetravels.co.ke`. Requests should now go to
   `https://ramellianexecutivetravels.co.ke/api/v1/...`, `http://` should redirect to `https://`, and
   "Continue with Google" should open Google's sign-in (it needs https and the authorised origins from Step 7).

## Everyday use

- **Deploy**: merge or push to `master`. GitHub tests and builds; Jenkins then updates the Nginx site if it changed and
  swaps the container. Downtime is a second or two while the container restarts.
- **Tests**: the full suite runs on GitHub on every push and pull request, and the pre-commit hook runs it on your
  machine before every commit. A pull request shows its test result before it's merged.
- **Change routing** (paths, upload size, ports): edit `deploy/nginx/` and push. A broken config fails `nginx -t`, the
  previous one is put back, and the build stops before deploying.
- **Change a `VITE_*` value**: edit the workflow's `build-args`, push, and the new image carries it.
- **Logs**: GitHub → **Actions** (tests, image builds), Jenkins console output (deploys), `docker logs -f ramellian-frontend`
  (frontend container), `/var/log/nginx/` (host Nginx).

### Rolling back

Every `master` commit has its own image, `sha-<commit>`; the VPS keeps the last 5 and any other can be pulled again.
To go back to an earlier commit (find its full hash with `git log` or on GitHub):

```bash
IMG=ghcr.io/flexinit/ramellian-executive-travels-front-end:sha-<full-commit-hash>
docker pull $IMG
docker rm -f ramellian-frontend
docker run -d --name ramellian-frontend --restart unless-stopped -p 127.0.0.1:8085:80 $IMG
```

The next successful Jenkins deploy replaces it again. To make a rollback stick, revert the commit on `master` instead.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Pushing to `master` starts no Jenkins build | Webhook missing or failing: GitHub → Settings → Webhooks → *Recent Deliveries*. The URL must end in `/github-webhook/` (Step 4) |
| Pushing starts no GitHub Actions run | Actions is switched off for the repo: Settings → Actions → General (Step 3) |
| Actions **test** job fails | A test is failing. Its log shows which; run `npm test` locally, fix it, push. Nothing is deployed meanwhile |
| Actions **image** job fails at login or push with `denied` / `permission_denied` | The workflow token can't write packages: Settings → Actions → General → *Workflow permissions* → **Read and write**, or in the package's settings give this repository **Write** access |
| Jenkins **Wait for image** fails: "The registry refused the pull" | The package is private. Make it public (Step 3) |
| Jenkins **Wait for image** fails: "No image for … after 30 min" | GitHub's run for that commit failed or is still queued: check the Actions tab |
| `permission denied ... docker.sock` in Jenkins | The job runs on an agent/user without Docker access. Run it where the existing Docker jobs run (Step 2) |
| Host Nginx: "User 'jenkins' isn't allowed to update Nginx yet" | The sudoers rule isn't installed (Step 2). The message shows the exact command |
| Host Nginx fails after `nginx -t` errors | A config in `deploy/nginx/` is broken; the old one was put back. Fix it and push. The log shows the line |
| All Jenkins stages show as skipped | Job is a plain Pipeline, not a Multibranch Pipeline, or the branch isn't `master` (Step 4) |
| Still on http after running certbot | No deploy since: push or click **Build Now**. Check the Host Nginx log says `Site scheme: https` |
| certbot fails | DNS doesn't point at the VPS yet, or port 80 is closed. Check `nslookup` (Step 1) and the firewall (Step 2) |
| 502 Bad Gateway on `/` | Frontend container isn't running: `docker ps -a`, `docker logs ramellian-frontend` |
| 502 on `/api/...` | Backend isn't running on `127.0.0.1:8090` |
| 404 when refreshing a page | Request isn't reaching the container's Nginx config; check `location /` in `deploy/nginx/ramellian-locations.conf` |
| Login fails with `403 Invalid CORS request` | The `Origin` header reached the backend. Check `proxy_set_header Origin "";` in the `/api/` block of `deploy/nginx/ramellian-locations.conf` (locally: `DEV_API_PROXY_TARGET` set and `VITE_API_BASE_URL` empty in `.env`, then restart `npm run dev`) |
| "413 Request Entity Too Large" on photo upload | Raise `client_max_body_size` in `deploy/nginx/ramellian-locations.conf` (and the backend's own upload limit) |
| Typing indicator in chat never shows | The SSE `location` block in `deploy/nginx/ramellian-locations.conf` is missing or `proxy_buffering` is on |
