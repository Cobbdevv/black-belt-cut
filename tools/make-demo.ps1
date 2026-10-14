# Builds the showcase copy in ..\black-belt-cut-demo: same app, no login, made-up data under its own storage key.
# Run after changing the app: powershell -ExecutionPolicy Bypass -File tools\make-demo.ps1
$src = Split-Path $PSScriptRoot -Parent
$dst = Join-Path (Split-Path $src -Parent) 'black-belt-cut-demo'
$enc = New-Object Text.UTF8Encoding $false
New-Item -ItemType Directory -Force $dst | Out-Null
Get-ChildItem $src -File | Where-Object { $_.Name -notmatch '^test-|\.md$|^firestore\.rules$|^\.nojekyll$|^sw\.js$' } | Copy-Item -Destination $dst -Force

function Patch([string]$file, [string]$from, [string]$to) {
  $path = Join-Path $dst $file
  $text = [IO.File]::ReadAllText($path)
  if (-not $text.Contains($from)) { throw "make-demo: '$from' not found in $file" }
  [IO.File]::WriteAllText($path, $text.Replace($from, $to), $enc)
}
[IO.File]::WriteAllText((Join-Path $dst 'firebase-config.js'), "/* Demo copy: no login, everything stays in this browser. */`nwindow.FIREBASE_CONFIG = {};`n", $enc)
Patch 'app.js' "const DEVICE_KEY = 'bbc-log-v1';" "const DEVICE_KEY = 'bbc-demo-v1';"
Patch 'app.js' "'Sync is off, so your log stays on this device. Add your Firebase settings to turn on login and sync (README, step 3).'" "'Demo with made-up data from a first month. Nothing here is real or saved to an account. Add ?reset to the address to start over.'"
Patch 'train.js' "const DRAFT_KEY = 'bbc-workout-v1';" "const DRAFT_KEY = 'bbc-demo-workout-v1';"
Patch 'index.html' '<script src="ranks.js"></script>' ('<script src="ranks.js"></script>' + "`n" + '<script src="demo-seed.js"></script>')
Patch 'index.html' '<title>Black Belt Cut</title>' '<title>Black Belt Cut demo</title>'
if (-not (Test-Path (Join-Path $dst 'demo-seed.js'))) { throw 'make-demo: demo-seed.js is missing from the demo folder' }
'demo rebuilt in ' + $dst
