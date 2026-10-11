#!/bin/sh
# Installs the host Nginx site from this repo. Run by Jenkins on every master deploy (see docs/deployment.md),
# so the server's routing always matches what's in git. Uses the https site once a certificate exists for the
# domain (certbot is run by hand, once), the http one until then.
set -eu

DOMAIN=ramellianexecutivetravels.co.ke
HERE=$(cd "$(dirname "$0")" && pwd)
SITE=/etc/nginx/sites-available/ramellian
ENABLED=/etc/nginx/sites-enabled/ramellian
SNIPPET=/etc/nginx/snippets/ramellian-locations.conf
CERT=/etc/letsencrypt/live/$DOMAIN/fullchain.pem

# Root needs no sudo; any other user needs the rule in deploy/sudoers/jenkins-ramellian.
if [ "$(id -u)" -eq 0 ]; then AS_ROOT=; else AS_ROOT="sudo -n"; fi

BACKUP=$(mktemp -d)
trap 'rm -rf "$BACKUP"' EXIT

# Copies $1 over $2 when they differ; succeeds only if it wrote.
put() {
  if [ -f "$2" ] && cmp -s "$1" "$2"; then return 1; fi
  $AS_ROOT tee "$2" < "$1" > /dev/null
}

# Puts the saved copy of $1 back, or empties it if there was none (an empty file is valid Nginx config).
restore() {
  if [ -f "$BACKUP/$2" ]; then
    $AS_ROOT tee "$1" < "$BACKUP/$2" > /dev/null
  else
    $AS_ROOT tee "$1" < /dev/null > /dev/null
  fi
}

if $AS_ROOT test -f "$CERT"; then
  scheme=https
  site_file="$HERE/host-site-https.conf"
else
  scheme=http
  site_file="$HERE/host-site.conf"
fi

if [ -f "$SITE" ]; then cp "$SITE" "$BACKUP/site"; fi
if [ -f "$SNIPPET" ]; then cp "$SNIPPET" "$BACKUP/snippet"; fi

changed=0
if put "$HERE/ramellian-locations.conf" "$SNIPPET"; then changed=1; fi
if put "$site_file" "$SITE"; then changed=1; fi
if [ ! -L "$ENABLED" ]; then
  $AS_ROOT ln -sf "$SITE" "$ENABLED"
  changed=1
fi

if [ "$changed" -eq 1 ]; then
  if ! $AS_ROOT nginx -t; then
    echo "The new Nginx config is invalid; putting the previous one back." >&2
    restore "$SITE" site
    restore "$SNIPPET" snippet
    exit 1
  fi
  $AS_ROOT systemctl reload nginx
  echo "Nginx site updated from $(basename "$site_file")."
else
  echo "Nginx site unchanged."
fi

echo "Site scheme: $scheme"
