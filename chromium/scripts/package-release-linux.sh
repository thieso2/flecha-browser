#!/bin/bash
# Packages the Linux release build (out/Release, from build-release.sh) as
# out/Release/flecha-release/flecha-<version>-linux-x64.tar.xz, with a PKGBUILD beside it:
# `makepkg -si` in that folder installs Flecha on Arch Linux and Omarchy.
#
#   chromium/scripts/package-release-linux.sh
#
# The tarball holds one folder, flecha/, laid out as it is installed at /opt/flecha:
#   - Chromium's runtime files (the list of chrome/installer/linux/BUILD.gn), with the
#     shell at resources/flecha-shell (patch 0063);
#   - flecha, the launcher (chromium/linux/flecha), and flecha.desktop and the icons;
#   - native-host/: the bundled host script, a launcher that runs it with the system's Node
#     (nodejs, an optional dependency), and its manifest, which the package installs in
#     /etc/flecha/native-messaging-hosts (patch 0060).
# Safe to run again: the staging folder is made afresh each time.
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
. "$here/scripts/env.sh"
root="$(cd "$here/.." && pwd)"

if [ "$flecha_os" != linux ]; then
  echo "error: this packages the Linux build; on macOS use package-release.sh" >&2
  exit 1
fi

built="$release_out"
release="${FLECHA_RELEASE_DIR:-$release_out/flecha-release}"
version="$(node -p 'require(process.argv[1]).version' "$root/package.json")"
name="flecha-$version-linux-x64"
stage="$release/stage/flecha"

if [ ! -x "$built/chrome" ]; then
  echo "error: no $built/chrome; build it first (chromium/scripts/build-release.sh)" >&2
  exit 1
fi
rm -rf "$release/stage"
mkdir -p "$stage"

echo "== Chromium"
required=(chrome chrome_crashpad_handler icudtl.dat resources.pak chrome_100_percent.pak
  chrome_200_percent.pak libEGL.so libGLESv2.so locales)
optional=(v8_context_snapshot.bin snapshot_blob.bin libvk_swiftshader.so vk_swiftshader_icd.json
  libvulkan.so.1 libqt5_shim.so libqt6_shim.so MEIPreload PrivacySandboxAttestationsPreloaded)
for f in "${required[@]}"; do
  if [ ! -e "$built/$f" ]; then
    echo "error: the build has no $f" >&2
    exit 1
  fi
  cp -a "$built/$f" "$stage/"
done
for f in "${optional[@]}"; do
  if [ -e "$built/$f" ]; then cp -a "$built/$f" "$stage/"; fi
done
# Only the locales' .pak files; the build leaves .info files beside them.
find "$stage/locales" -type f ! -name '*.pak' -delete

echo "== shell"
shell_dist="$here/shell/dist"
if [ ! -f "$shell_dist/manifest.json" ]; then
  echo "error: no built shell in $shell_dist (node chromium/shell/build.mjs)" >&2
  exit 1
fi
if ! diff -rq "$shell_dist" "$built/resources/flecha-shell" >/dev/null 2>&1; then
  echo "note: the build's flecha-shell differs from $shell_dist; packing dist"
fi
mkdir -p "$stage/resources"
cp -a "$shell_dist" "$stage/resources/flecha-shell"

echo "== launcher, desktop entry, icons"
install -m755 "$here/linux/flecha" "$stage/flecha"
install -m644 "$here/linux/flecha.desktop" "$stage/flecha.desktop"
for png in "$here"/branding/logo/product_logo_*.png; do
  install -m644 "$png" "$stage/"
done
install -m644 "$root/LICENSE" "$stage/LICENSE"
install -m644 "$src/LICENSE" "$stage/LICENSE.chromium"

echo "== native host"
(cd "$root" && node chromium/native-host/build.mjs)
host="$stage/native-host"
mkdir -p "$host"
install -m644 "$here/native-host/dist/flecha-host.cjs" "$host/flecha-host.cjs"
cat >"$host/flecha-host" <<'HOST'
#!/bin/sh
# Flecha's native messaging host: the system's Node (22.5 or newer) runs the bundled script.
here="$(dirname "$(readlink -f "$0")")"
if ! command -v node >/dev/null; then
  echo "Flecha's native host needs Node.js 22.5 or newer (pacman -S nodejs)" >&2
  exit 1
fi
exec node "$here/flecha-host.cjs" "$@"
HOST
chmod 755 "$host/flecha-host"
cat >"$host/dev.oprimo.flecha.host.json" <<'MANIFEST'
{
  "name": "dev.oprimo.flecha.host",
  "description": "Flecha: imports from other browsers and the agent bridge",
  "path": "/opt/flecha/native-host/flecha-host",
  "type": "stdio",
  "allowed_origins": ["chrome-extension://abdiaepfgbbhdjaecjipmaailijaaide/"]
}
MANIFEST

echo "== $name.tar.xz"
tarball="$release/$name.tar.xz"
tar -C "$release/stage" --owner=0 --group=0 -cJf "$tarball" flecha
sum="$(sha256 "$tarball" | cut -d' ' -f1)"
sed -e "s/@VERSION@/$version/" -e "s/@SHA256@/$sum/" "$here/linux/PKGBUILD" >"$release/PKGBUILD"
echo "made $tarball"
echo "and $release/PKGBUILD; install with: (cd $release && makepkg -si)"
