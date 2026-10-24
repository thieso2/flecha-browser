#!/bin/bash
# Puts Flecha's branding and patches on the Chromium checkout, then builds the
# dev (component) build at out/Dev (Flecha.app on macOS, the chrome executable on Linux).
# Extra arguments go to autoninja. On Linux, the first run writes out/Dev/args.gn from
# chromium/build/linux-dev.gn.
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
. "$here/scripts/env.sh"

"$here/scripts/apply.sh"
cd "$src"
if [ "$flecha_os" = linux ] && [ ! -f out/Dev/args.gn ]; then
  mkdir -p out/Dev
  cp "$here/build/linux-dev.gn" out/Dev/args.gn
  gn gen out/Dev
fi
autoninja -C out/Dev chrome "$@"
