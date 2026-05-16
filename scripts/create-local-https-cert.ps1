param(
  [string]$OutputDir = ".certs",
  [string]$Password = "tour-360-local",
  [int]$ValidDays = 825
)

$ErrorActionPreference = "Stop"

$resolvedOutputDir = Resolve-Path -LiteralPath $OutputDir -ErrorAction SilentlyContinue
if (-not $resolvedOutputDir) {
  New-Item -ItemType Directory -Path $OutputDir | Out-Null
  $resolvedOutputDir = Resolve-Path -LiteralPath $OutputDir
}

$pfxPath = Join-Path $resolvedOutputDir "tour-360-local.pfx"
$cerPath = Join-Path $resolvedOutputDir "tour-360-local.cer"

if ((Test-Path -LiteralPath $pfxPath) -and (Test-Path -LiteralPath $cerPath)) {
  Write-Host "Certificado HTTPS local encontrado em $resolvedOutputDir"
  exit 0
}

$rsa = [System.Security.Cryptography.RSA]::Create(2048)
$request = [System.Security.Cryptography.X509Certificates.CertificateRequest]::new(
  "CN=Tour 360 Local HTTPS",
  $rsa,
  [System.Security.Cryptography.HashAlgorithmName]::SHA256,
  [System.Security.Cryptography.RSASignaturePadding]::Pkcs1
)

$request.CertificateExtensions.Add(
  [System.Security.Cryptography.X509Certificates.X509BasicConstraintsExtension]::new($false, $false, 0, $true)
)
$request.CertificateExtensions.Add(
  [System.Security.Cryptography.X509Certificates.X509KeyUsageExtension]::new(
    [System.Security.Cryptography.X509Certificates.X509KeyUsageFlags]::DigitalSignature -bor
    [System.Security.Cryptography.X509Certificates.X509KeyUsageFlags]::KeyEncipherment,
    $true
  )
)

$serverAuthOid = [System.Security.Cryptography.Oid]::new("1.3.6.1.5.5.7.3.1")
$eku = [System.Security.Cryptography.OidCollection]::new()
$eku.Add($serverAuthOid) | Out-Null
$request.CertificateExtensions.Add(
  [System.Security.Cryptography.X509Certificates.X509EnhancedKeyUsageExtension]::new($eku, $true)
)

$sanBuilder = [System.Security.Cryptography.X509Certificates.SubjectAlternativeNameBuilder]::new()
$sanBuilder.AddDnsName("localhost")
$sanBuilder.AddDnsName($env:COMPUTERNAME)
$sanBuilder.AddIpAddress([System.Net.IPAddress]::Parse("127.0.0.1"))
$sanBuilder.AddIpAddress([System.Net.IPAddress]::Parse("::1"))

$localIps = Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object {
    $_.IPAddress -ne "127.0.0.1" -and
    $_.IPAddress -notlike "169.254.*" -and
    $_.PrefixOrigin -ne "WellKnown"
  } |
  Select-Object -ExpandProperty IPAddress -Unique

foreach ($ip in $localIps) {
  $sanBuilder.AddIpAddress([System.Net.IPAddress]::Parse($ip))
}

$request.CertificateExtensions.Add($sanBuilder.Build())

$notBefore = [System.DateTimeOffset]::Now.AddDays(-1)
$notAfter = [System.DateTimeOffset]::Now.AddDays($ValidDays)
$certificate = $request.CreateSelfSigned($notBefore, $notAfter)

$pfxBytes = $certificate.Export(
  [System.Security.Cryptography.X509Certificates.X509ContentType]::Pfx,
  $Password
)
$cerBytes = $certificate.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert)

[System.IO.File]::WriteAllBytes($pfxPath, $pfxBytes)
[System.IO.File]::WriteAllBytes($cerPath, $cerBytes)

Write-Host "Certificado HTTPS local criado:"
Write-Host "  PFX: $pfxPath"
Write-Host "  CER: $cerPath"
