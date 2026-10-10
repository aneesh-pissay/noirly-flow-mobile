# Generates android/app/noirly-flow-release.keystore + android/keystore.properties
# and prints the SHA-1 fingerprint for Identity / Google Sign-In.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$appDir = Join-Path $PSScriptRoot "app"
$keystorePath = Join-Path $appDir "noirly-flow-release.keystore"
$propsPath = Join-Path $PSScriptRoot "keystore.properties"

if (Test-Path $keystorePath) {
  Write-Error "Keystore already exists: $keystorePath"
}

$chars = [char[]]((48..57) + (65..90) + (97..122))
$storePass = -join (1..24 | ForEach-Object { $chars | Get-Random })
# PKCS12 uses a single password for store + key.
$keyPass = $storePass
$alias = "noirly-flow"

@"
storePassword=$storePass
keyPassword=$keyPass
keyAlias=$alias
storeFile=noirly-flow-release.keystore
"@ | Set-Content -Encoding ascii -NoNewline $propsPath

keytool -genkeypair -v `
  -storetype PKCS12 `
  -keystore $keystorePath `
  -alias $alias `
  -keyalg RSA `
  -keysize 2048 `
  -validity 10000 `
  -storepass $storePass `
  -keypass $keyPass `
  -dname "CN=Noirly Flow, OU=Mobile, O=Noirly, L=Bengaluru, ST=Karnataka, C=IN"

Write-Host ""
Write-Host "Created:"
Write-Host "  $keystorePath"
Write-Host "  $propsPath"
Write-Host ""
Write-Host "SHA-1 (paste into Identity Android SHA-1 field):"
keytool -list -v -keystore $keystorePath -alias $alias -storepass $storePass |
  Select-String -Pattern "SHA1:"
