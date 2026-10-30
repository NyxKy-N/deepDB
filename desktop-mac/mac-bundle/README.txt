deepDB · macOS Desktop Edition

This is the complete deepDB website — designER, translatER, noER and designQT —
packaged as a standalone macOS application. Everything runs offline and all
data is stored locally on this Mac. No internet connection or account needed.

------------------------------------------------------------------------
WHAT IS IN THIS ZIP
------------------------------------------------------------------------
  deepDB.app                    the application
  First Launch deepDB.command   run this once, right after unzipping
  README.txt                    this file

------------------------------------------------------------------------
SYSTEM REQUIREMENTS
------------------------------------------------------------------------
  macOS 13 Ventura or later.
  Pick the zip that matches your Mac:
    filename contains "arm64"  → Apple Silicon (M1/M2/M3/M4)
    filename contains "x64"    → Intel (Core i5/i7/i9)

------------------------------------------------------------------------
FIRST LAUNCH (ONCE)
------------------------------------------------------------------------
  1. Double-click the zip to extract it. You should get deepDB.app and
     "First Launch deepDB.command" side by side.
  2. Right-click "First Launch deepDB.command" → Open, then click Open in
     the confirmation dialog.

     A "cannot verify the developer" warning is expected: this build is not
     signed with an Apple Developer ID certificate.

     Or run it from Terminal:

       cd ~/Downloads          # the folder you extracted into
       bash "First Launch deepDB.command"

  3. The script removes the quarantine flag, applies a local ad-hoc
     signature, and launches deepDB. The first launch can take 10–30 s.
  4. Afterwards open deepDB.app directly from Finder. It is recommended
     that you drag deepDB.app into your Applications folder.

------------------------------------------------------------------------
IF THE APP STILL WILL NOT OPEN
------------------------------------------------------------------------
  Open Terminal and run (adjust the path if needed):

    xattr -cr /Applications/deepDB.app
    codesign --force --deep --sign - /Applications/deepDB.app

  Then double-click deepDB.app again. This also fixes the
  "application is damaged" message.

------------------------------------------------------------------------
TECHNICAL NOTES
------------------------------------------------------------------------
  Built on the official Electron 45.1.0 runtime (darwin arm64 / x64).
  The Electron executable is unmodified. The website is bundled inside
  deepDB.app/Contents/Resources/app.
  Code signing: local ad-hoc signature only — not notarized by Apple.
  Local data: ~/Library/Application Support/deepDB
  Uninstall: move deepDB.app to the Trash, then delete the folder above.

  Version: deepDB 1.5.19
