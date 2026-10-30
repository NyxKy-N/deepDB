#!/bin/bash
#
# deepDB for macOS — first-run helper
#
# Windows cannot code-sign a macOS app, so this script performs the minimum
# steps macOS needs on this machine: clear the download quarantine flag,
# apply a local ad-hoc signature, and open the app. Run it once after
# unzipping — no internet connection and no administrator rights required.
#
set -u

cd "$(dirname "$0")" || exit 1
APP="$PWD/deepDB.app"

echo "=========================================="
echo "  deepDB — macOS first launch"
echo "=========================================="
echo

if [ ! -d "$APP" ]; then
  echo "[!] deepDB.app was not found next to this script."
  echo "    Unzip deepDB first and keep this script in the same folder."
  echo
  read -n 1 -s -r -p "Press any key to quit..."
  exit 1
fi

echo "[1/3] Removing the download quarantine flag ..."
xattr -dr com.apple.quarantine "$APP" 2>/dev/null

echo "[2/3] Applying a local ad-hoc signature (may take a moment) ..."
if codesign --force --deep --sign - "$APP" > /tmp/deepdb-codesign.log 2>&1; then
  echo "      ok"
else
  echo "      [!] Signing failed, details:"
  sed 's/^/      /' /tmp/deepdb-codesign.log 2>/dev/null
  echo "      The app may still open: right-click deepDB.app → Open."
fi
chmod +x "$APP/Contents/MacOS/deepDB" 2>/dev/null

echo "[3/3] Opening deepDB ..."
open "$APP" 2>/dev/null

echo
echo "Done. Next time you can open deepDB.app directly from Finder."
echo "Tip: drag deepDB.app into your Applications folder."
echo
read -n 1 -s -r -p "Press any key to close this window..."
