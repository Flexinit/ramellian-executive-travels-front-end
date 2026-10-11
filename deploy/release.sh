#!/bin/sh
# Puts a built site live: unpacks it into its own folder under releases/ and switches the "current" link to it in
# one step, so visitors never see a half-copied site. Keeps the 5 newest releases for rollback (docs/deployment.md).
# Usage: sh deploy/release.sh <site.tar.gz> <release-id>
set -eu

ARCHIVE=$1
ID=$2
SITE_DIR=${SITE_DIR:-/var/www/ramellian}
KEEP=5

if [ ! -d "$SITE_DIR" ] || [ ! -w "$SITE_DIR" ]; then
  echo "$SITE_DIR is missing or not writable by '$(id -un)'. As root on this server, once:" >&2
  echo "  install -d -o $(id -un) -m 755 $SITE_DIR" >&2
  exit 1
fi

mkdir -p "$SITE_DIR/releases"
NEW="$SITE_DIR/releases/$ID"
rm -rf "$NEW.tmp"
mkdir "$NEW.tmp"
if ! tar -xzf "$ARCHIVE" -C "$NEW.tmp"; then
  echo "Couldn't unpack $ARCHIVE; not deploying it." >&2
  rm -rf "$NEW.tmp"
  exit 1
fi
if [ ! -f "$NEW.tmp/index.html" ]; then
  echo "The archive has no index.html; not deploying it." >&2
  rm -rf "$NEW.tmp"
  exit 1
fi
rm -rf "$NEW"
mv "$NEW.tmp" "$NEW"

# Swap the link atomically: make the new link beside the old one, then rename over it.
ln -sfn "releases/$ID" "$SITE_DIR/current.tmp"
mv -T "$SITE_DIR/current.tmp" "$SITE_DIR/current"
echo "Live: $ID"

LIVE=$(readlink -f "$SITE_DIR/current")
ls -1dt "$SITE_DIR"/releases/*/ | tail -n +$((KEEP + 1)) | while read -r old; do
  if [ "$(readlink -f "$old")" != "$LIVE" ]; then rm -rf "$old"; fi
done
