# Deploying the frontend (GitHub Actions + Jenkins + Nginx)

How the frontend goes live on the VPS. The VPS is small, so it builds nothing: GitHub Actions tests the code and
builds the site on GitHub's machines, and Jenkins on the VPS only downloads the built files and puts them live. The
host Nginx serves them directly. There is no Docker in this setup.

**Deploying is automatic: push to `master` and it goes live.**

```
git push origin master
  ├─▶ GitHub Actions (GitHub's machines): npm ci → full test suite → vite build
  │                                       → uploads site-<commit>.tar.gz to the "frontend-builds" release   ~5–10 min
  └─▶ GitHub webhook → Jenkins on the VPS: waits for that file → unpacks it into /var/www/ramellian/releases/<commit>
                                           → switches /var/www/ramellian/current to it → updates the Nginx site
                                           → smoke test                                                    seconds of work
  → live at ramellianexecutivetravels.co.ke
```

If the tests fail on GitHub, no file is uploaded for that commit, so Jenkins has nothing to deploy and the live site
stays as it was.

The one-time setup is below. None of it can come from a push, because it has to exist before a push can trigger
anything, or because it lives outside the server:

| One-time | Where | Step |
|---|---|---|
| Point the root `A` record at the VPS | DNS Management | [1](#step-1-point-the-domain-at-the-vps) |
| Create the site folder; allow Jenkins to update Nginx | VPS, as root | [2](#step-2-prepare-the-vps) |
| Check GitHub Actions runs | GitHub | [3](#step-3-github-actions) |
| `ramellian-frontend` job, push webhook | Jenkins, GitHub repo settings | [4](#step-4-connect-the-repo-to-jenkins) |
| Get the HTTPS certificate (one command, once DNS has moved) | VPS, as root | [5](#step-5-turn-on-https) |
| Google OAuth origins, Pesapal URLs, backend links | Outside services | [7](#step-7-outside-services-that-need-the-new-address) |

## How it fits together

```
Browser ──▶ Host Nginx on the VPS (site installed by Jenkins from deploy/nginx/)
              ├── /api/...      ──▶ backend (Spring Boot) 127.0.0.1:8090
              ├── /uploads/...  ──▶ backend (photos, chat media)
              └── everything    ──▶ files in /var/www/ramellian/current
```

- The site calls the API on **its own address**: `VITE_API_BASE_URL` is `https://ramellianexecutivetravels.co.ke`, so
  requests go to `https://ramellianexecutivetravels.co.ke/api/v1/...` and photos to `.../uploads/...`. Host Nginx
  forwards them to the backend. The site has one address: Nginx redirects http and `www.` to it
  (`deploy/nginx/host-site-https.conf`), so the page and its API are always the same origin.
- Nginx drops the browser's `Origin` header on the way. The backend's CORS settings refuse every browser origin
  (`403 Invalid CORS request`), so without this the browser could not log in. Because the requests are same-site,
  dropping it is safe, and there's also no "mixed content" problem (an https page calling an http API).
- Local development calls the office backend directly: `VITE_API_BASE_URL=http://192.168.8.9:8090` in
  `.env.development`, which accepts calls from `http://localhost:5173`. Leave it empty there to go through
  `npm run dev`'s proxy instead (`DEV_API_PROXY_TARGET`, `vite.config.js`), which also drops `Origin` and works on
  any port.
- `VITE_*` values are baked into the files when the site is **built** (in the GitHub Actions workflow). Changing one
  means pushing a new commit.

### What runs where

| | GitHub Actions | VPS |
|---|---|---|
| Install packages, run all 1,452 tests | ✓ (~5 min) | — |
| Vite build (needs ~768 MB of memory) | ✓ | — |
| Download the built site (a few MB), unpack it, switch to it | — | ✓ |
| Install the Nginx site | — | ✓ |
| Serve the site | — | ✓ (host Nginx, no extra process) |

### The site folder

```
/var/www/ramellian/
  releases/<commit>/   one folder per deploy; the 5 newest are kept
  current → releases/<commit>   what Nginx serves
```

A deploy unpacks into a new folder first and then switches `current` in one step, so visitors never see a half-copied
site. Rolling back is switching `current` back (see [Rolling back](#rolling-back)).

### Files involved

| File | What it does |
|---|---|
| [`.github/workflows/frontend-build.yml`](../.github/workflows/frontend-build.yml) | On every push and pull request: full test suite (Node 24). On `master`: also builds the site and uploads `site-<commit>.tar.gz` to the `frontend-builds` release (the 20 newest are kept) |
| [`Jenkinsfile`](../Jenkinsfile) | Wait for build → Deploy → Host Nginx → smoke test |
| [`deploy/release.sh`](../deploy/release.sh) | Run by Jenkins: unpacks a build into `releases/<commit>`, switches `current`, keeps the 5 newest |
| [`deploy/nginx/install-host-site.sh`](../deploy/nginx/install-host-site.sh) | Run by Jenkins: installs the host site, checks it with `nginx -t` (puts the old one back if it fails), reloads Nginx only when something changed |
| [`deploy/nginx/ramellian-locations.conf`](../deploy/nginx/ramellian-locations.conf) | The routing: `/api` and `/uploads` to the backend, everything else from `/var/www/ramellian/current`, with caching rules |
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

Two one-time commands as root.

**1. The site folder,** owned by Jenkins so it can put new releases there:

```bash
install -d -o jenkins -m 755 /var/www/ramellian
```

**2. Let Jenkins update Nginx.** Jenkins installs the site with root rights, using only the commands listed in
[`deploy/sudoers/jenkins-ramellian`](../deploy/sudoers/jenkins-ramellian): writing the two site files, enabling the
site, `nginx -t`, reloading Nginx, and checking whether the certificate exists. Jenkins already has the file in its
workspace once the job has run:

```bash
F=$(ls -d /var/lib/jenkins/workspace/*/deploy/sudoers/jenkins-ramellian | head -1)
install -m 440 "$F" /etc/sudoers.d/jenkins-ramellian && visudo -c     # must say "parsed OK"
sudo -u jenkins sudo -n /usr/sbin/nginx -t                              # works without a password prompt
```

Anyone who can push to `master` can change this Nginx site and what it serves (but nothing else on the server).

Other cases:

- **Ports 80/443 are taken by something other than Nginx** (for example a proxy container used by another project): the
  automatic Nginx stage won't work. Add the `location` blocks from `deploy/nginx/ramellian-locations.conf` to that proxy instead.
- **Firewall:** 80 and 443 must be open (`ufw allow 'Nginx Full'`). The site reaches the backend through Nginx, so 8090 doesn't need to be public for it.

You don't need to remove `/etc/nginx/sites-enabled/default`: requests for `ramellianexecutivetravels.co.ke` go to this
site by name. Remove it only if nothing else uses it and you want other names to get no answer.

## Step 3: GitHub Actions

The workflow needs no secrets. The repository is public, so the built files can be downloaded by the VPS without a login.

1. Push to `master`, then open the repo's **Actions** tab. The **Frontend build** run should go green (**test** → **build**).
2. Open **Releases** on the repo's front page: a pre-release named **Frontend builds** now holds `site-<commit>.tar.gz`.
   It's how the VPS receives the files, not a product release.

If **Actions** is switched off for the repo (*Settings → Actions → General*), allow it there. If the **build** job fails
with "Resource not accessible by integration", set *Settings → Actions → General → Workflow permissions* to
**Read and write**.

## Step 4: Connect the repo to Jenkins

Jenkins is reachable from the internet, so the GitHub webhook starts it the moment `master` changes. It then waits for
the build from Step 3.

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

These are set on the `npm run build` step of the workflow (`.github/workflows/frontend-build.yml`). Change one by
editing it and pushing. They override the committed `.env` files; keep `.env.production` (the same values, for a
build made on your own machine) in step. `.env.development` is for local development.

| Setting | Value |
|---|---|
| `VITE_API_BASE_URL` | `https://ramellianexecutivetravels.co.ke`: the site's own address (Nginx forwards to the backend). Needs the https site; on the plain-http fallback (`host-site.conf`, before a certificate exists) set it empty |
| `VITE_SWAGGER_URL` | `http://102.68.87.231:8090/swagger-ui/index.html`, only shown in developer hints |
| `VITE_PESAPAL_ENV` | `live` (use `sandbox` while testing payments) |
| `VITE_GOOGLE_CLIENT_ID` | the Google OAuth client ID (public by design: it ships in the site's code) |
| `VITE_ENABLE_WHATSAPP_VERIFICATION` | `false` until WhatsApp verification is switched on |

## Step 7: Outside services that need the new address

- **Google Cloud Console** → APIs & Services → Credentials → the OAuth client → **Authorised JavaScript origins**:
  add `https://ramellianexecutivetravels.co.ke` (`www.` now redirects to it, so it isn't strictly needed). Without this, "Continue with Google" fails.
- **Pesapal** (live account): register the callback and IPN URLs on `https://ramellianexecutivetravels.co.ke/...`.
- **Backend config**: links it puts in emails (verify email, reset password), and any allowed origins, must use the https domain.

## Step 8: First deploy and checks

1. Push to `master`.
2. On GitHub → **Actions**: **Frontend build** goes green (**test** → **build**), in about 5–10 minutes.
3. In Jenkins: **Wait for build → Deploy → Host Nginx → Smoke test** go green. Wait for build finishes once GitHub's
   run has. The Deploy log ends with `Live: <commit>`, and Host Nginx with `Site scheme: http` or `Site scheme: https`.
4. On the VPS: `ls -l /var/www/ramellian/current` points at `releases/<that commit>`.
5. Before HTTPS, in a browser at `http://ramellianexecutivetravels.co.ke`:
   - The home page loads with no console errors.
   - Open a deep link (e.g. `/auth/login`) and **refresh**: it loads, not 404.
   - Log in: requests go to `http://ramellianexecutivetravels.co.ke/api/v1/...` (DevTools → Network).
   - Vehicle photos load (`/uploads/...`).
6. After HTTPS (Step 5), repeat at `https://ramellianexecutivetravels.co.ke`. Requests should now go to
   `https://ramellianexecutivetravels.co.ke/api/v1/...`, `http://` should redirect to `https://`, and
   "Continue with Google" should open Google's sign-in (it needs https and the authorised origins from Step 7).

## Everyday use

- **Deploy**: merge or push to `master`. GitHub tests and builds; Jenkins then puts the new files live and updates the
  Nginx site if it changed. There's no downtime: the switch is a single rename.
- **Tests**: the full suite runs on GitHub on every push and pull request, and the pre-commit hook runs it on your
  machine before every commit. A pull request shows its test result before it's merged.
- **Change routing** (paths, upload size, caching): edit `deploy/nginx/` and push. A broken config fails `nginx -t`,
  the previous one is put back, and the job fails.
- **Change a `VITE_*` value**: edit the workflow's build step, push, and the new build carries it.
- **Logs**: GitHub → **Actions** (tests, builds), Jenkins console output (deploys), `/var/log/nginx/` (host Nginx).

### Rolling back

The VPS keeps the 5 newest releases. To go back to one of them, as the `jenkins` user or root:

```bash
ls -1t /var/www/ramellian/releases/                    # newest first; names are commit hashes
cd /var/www/ramellian && ln -sfn releases/<commit> current.tmp && mv -T current.tmp current
```

It takes effect immediately; no reload needed. To go back further, run `sh deploy/release.sh` with an older
`site-<commit>.tar.gz` from the **Frontend builds** release (the 20 newest are kept there).

The next deploy replaces a rollback. To make one stick, revert the commit on `master` instead.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Pushing to `master` starts no Jenkins build | Webhook missing or failing: GitHub → Settings → Webhooks → *Recent Deliveries*. The URL must end in `/github-webhook/` (Step 4) |
| Pushing starts no GitHub Actions run | Actions is switched off for the repo: Settings → Actions → General (Step 3) |
| Actions **test** job fails | A test is failing. Its log shows which; run `npm test` locally, fix it, push. Nothing is deployed meanwhile |
| Actions test fails with `Promise.withResolvers is not a function` | The workflow runs an old Node. It must be 22 or newer (`NODE_VERSION` in the workflow is 24) |
| Actions **build** job fails with "Resource not accessible by integration" | The workflow can't create or upload to the release: Settings → Actions → General → *Workflow permissions* → **Read and write** |
| Jenkins **Wait for build** fails: "No build for … after 30 min" | GitHub's run for that commit failed or is still queued: check the Actions tab |
| Jenkins **Deploy** fails: "/var/www/ramellian is missing or not writable" | The site folder isn't set up (Step 2). The message shows the exact command |
| Host Nginx: "User 'jenkins' isn't allowed to update Nginx yet" | The sudoers rule isn't installed (Step 2). The message shows the exact command |
| Host Nginx fails after `nginx -t` errors | A config in `deploy/nginx/` is broken; the old one was put back. Fix it and push. The log shows the line |
| All Jenkins stages show as skipped | Job is a plain Pipeline, not a Multibranch Pipeline, or the branch isn't `master` (Step 4) |
| Still on http after running certbot | No deploy since: push or click **Build Now**. Check the Host Nginx log says `Site scheme: https` |
| certbot fails | DNS doesn't point at the VPS yet, or port 80 is closed. Check `nslookup` (Step 1) and the firewall (Step 2) |
| 403 or 404 on `/` | `/var/www/ramellian/current` is missing or empty: check the Deploy log and `ls -l /var/www/ramellian/current` |
| 502 on `/api/...` | Backend isn't running on `127.0.0.1:8090` |
| 404 when refreshing a page | The `location /` block with `try_files ... /index.html` in `deploy/nginx/ramellian-locations.conf` isn't installed; check the Host Nginx log |
| Login fails with `403 Invalid CORS request` | The `Origin` header reached the backend. Check `proxy_set_header Origin "";` in the `/api/` block of `deploy/nginx/ramellian-locations.conf` (locally: `DEV_API_PROXY_TARGET` set and `VITE_API_BASE_URL` empty in `.env`, then restart `npm run dev`) |
| "413 Request Entity Too Large" on photo upload | Raise `client_max_body_size` in `deploy/nginx/ramellian-locations.conf` (and the backend's own upload limit) |
| Typing indicator in chat never shows | The SSE `location` block in `deploy/nginx/ramellian-locations.conf` is missing or `proxy_buffering` is on |
