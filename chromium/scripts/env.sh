# Sourced by the other scripts: where Chromium lives, with the APFS build volume mounted on macOS.
#
# macOS: the checkout sits on an APFS volume (a disk image on the external disk) because the
# disk itself is HFS+, whose one-second file times make siso think every output is stale, so
# every build was a full two-hour rebuild.
#
# Linux: the checkout is a plain folder, $FLECHA_DISK/chromium/src (ext4 and btrfs keep
# nanosecond file times, so no volume is needed).
case "$(uname -s)" in
  Darwin) flecha_os=mac ;;
  Linux) flecha_os=linux ;;
  *) echo "error: Flecha builds on macOS and Linux, not $(uname -s)" >&2; exit 1 ;;
esac

if [ "$flecha_os" = mac ]; then
  FLECHA_DISK="${FLECHA_DISK:-/Volumes/EXT_FLASH_1TB/projs/flecha}"
  FLECHA_VOLUME="${FLECHA_VOLUME:-/Volumes/FlechaBuild}"
  if [ ! -d "$FLECHA_VOLUME/chromium" ]; then
    hdiutil attach -quiet "$FLECHA_DISK/FlechaBuild.sparsebundle"
  fi
  src="${CHROMIUM_SRC:-$FLECHA_VOLUME/chromium/src}"
else
  FLECHA_DISK="${FLECHA_DISK:-$HOME/flecha}"
  src="${CHROMIUM_SRC:-$FLECHA_DISK/chromium/src}"
fi
export PATH="${DEPOT_TOOLS:-$FLECHA_DISK/depot_tools}:$PATH"

# mac_only: stops a script that packages, signs or publishes the macOS app.
mac_only() {
  if [ "$flecha_os" != mac ]; then
    echo "error: $(basename "$0") is macOS only" >&2
    exit 1
  fi
}

# sha256 <file>...: one digest of everything read, on both systems (Arch keeps shasum off PATH).
sha256() {
  if command -v sha256sum >/dev/null; then sha256sum "$@"; else shasum -a 256 "$@"; fi
}

# Release builds per CPU (build-release.sh, package-release.sh, make-appcast.sh):
# FLECHA_ARCH=arm64 (Apple silicon, the default on macOS) or x64 (Intel, cross-compiled
# there; the only Linux build). On macOS each has its own output folder, dmg name and
# Sparkle feed, so an Intel Mac is never offered the arm64 app and the other way round.
# arm64 keeps the names the first releases had.
if [ "$flecha_os" = linux ]; then
  FLECHA_ARCH="${FLECHA_ARCH:-x64}"
  if [ "$FLECHA_ARCH" != x64 ]; then
    echo "error: Flecha's Linux build is x64 only, not $FLECHA_ARCH" >&2
    exit 1
  fi
  release_out="$src/out/Release"
else
  FLECHA_ARCH="${FLECHA_ARCH:-arm64}"
  case "$FLECHA_ARCH" in
    arm64) release_out="$src/out/Release"; release_suffix=""; release_feed="appcast.xml"; node_arch="arm64" ;;
    x64) release_out="$src/out/Release-x64"; release_suffix="-x64"; release_feed="appcast-x64.xml"; node_arch="x86_64" ;;
    *) echo "error: FLECHA_ARCH must be arm64 or x64, not $FLECHA_ARCH" >&2; exit 1 ;;
  esac
fi
