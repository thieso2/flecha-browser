#!/bin/bash
# One stage of the Linux package build in CI (.github/workflows/linux-stage.yml). Runs as root in
# an archlinux container, with the repository at /repo and the work folder at /build.
#
#   stage.sh <minutes>
#
# The first stage (an empty /build) downloads and prepares the sources with flecha-git's
# PKGBUILD (chromium/linux/aur), building this very commit ($FLECHA_COMMIT). Every stage then
# builds for at most <minutes> and stops ninja cleanly, so the next stage resumes from the
# saved /build. When the build completes, /build/release holds the packages and /build/done
# exists; without /build/done the build needs another stage.
#
# /build/release: flecha-git-*.pkg.tar.zst (pacman -U), flecha-<version>-<pkgrel>-linux-x64.tar.xz
# with the flecha-bin PKGBUILD and .SRCINFO that install it from this run's GitHub release.
# $FLECHA_PKGREL is that pkgrel, the workflow's run number.
set -euo pipefail
minutes="$1"
: "${FLECHA_COMMIT:?}" "${FLECHA_PKGREL:?}"
aur=/repo/chromium/linux/aur

deps="$(sed -n 's/^\t\(make\)\{0,1\}depends = //p' "$aur/.SRCINFO")"
# shellcheck disable=SC2086 # one package per word
pacman -Syu --noconfirm --needed base-devel git zstd $deps
id builder >/dev/null 2>&1 || useradd -m builder
runuser -u builder -- git config --global --add safe.directory '*'
chown -R builder: /build
cd /build
as_builder() { runuser -u builder -- "$@"; }

if [ ! -d src ]; then
  echo "== prepare"
  sed "s|flecha::git+https://github.com/thieso2/flecha-browser.git#branch=linux-port|flecha::git+file:///repo#commit=$FLECHA_COMMIT|" \
    "$aur/PKGBUILD" >PKGBUILD
  grep -q 'git+file:///repo' PKGBUILD
  chown builder: PKGBUILD
  as_builder makepkg -o --noconfirm
  # The extracted trees are all later stages need; the archives would only be carried along.
  rm -f chromium-*-lite.tar.xz node-v*-linux-x64.tar.xz
fi

echo "== build (at most $minutes minutes)"
status=0
as_builder timeout -s INT "${minutes}m" makepkg -ef --noconfirm || status=$?
if [ "$status" = 124 ]; then
  echo "stopped after $minutes minutes; the next stage carries on"
  exit 0
elif [ "$status" != 0 ]; then
  exit "$status"
fi

echo "== release files"
chromium_ver="$(sed -n 's/^_chromium_ver=//p' PKGBUILD)"
mkdir -p release
chown builder: release
(cd src/flecha && as_builder env CHROMIUM_SRC="/build/src/chromium-$chromium_ver" FLECHA_DISK=/build \
  FLECHA_RELEASE_DIR=/build/release FLECHA_PKGREL="$FLECHA_PKGREL" chromium/scripts/package-release-linux.sh)
(cd release && as_builder makepkg --printsrcinfo >.SRCINFO)
mv flecha-git-*.pkg.tar.zst release/
touch /build/done
ls -l release
