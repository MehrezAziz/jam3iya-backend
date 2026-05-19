# Jam3iya end-to-end smoke test.
# Assumes the backend is running on http://localhost:4000 and the demo seed
# has been applied (admin@demo.local / DemoAdminPass123!).

$ErrorActionPreference = 'Stop'
$base = 'http://localhost:4000'

function Show($label, $value) {
  Write-Host ""
  Write-Host "=== $label ===" -ForegroundColor Cyan
  if ($value -is [string]) { Write-Host $value } else { $value | ConvertTo-Json -Depth 6 }
}

Remove-Item -ErrorAction SilentlyContinue smoke-cookies.txt

# 1) Health
$health = curl.exe -s "$base/health"
Show "/health" $health

# 2) Login
$body = '{"email":"admin@demo.local","password":"DemoAdminPass123!","organizationSlug":"demo"}'
$body | Out-File -Encoding utf8 -NoNewline smoke-login.json
$login = curl.exe -s -c smoke-cookies.txt -H 'content-type: application/json' --data-binary '@smoke-login.json' "$base/api/auth/login"
Show "POST /api/auth/login" $login

# 3) Departments
$dept = (curl.exe -s -b smoke-cookies.txt "$base/api/departments" | ConvertFrom-Json)[0]
Show "GET /api/departments[0]" $dept

# 4) Create beneficiary (encrypted fields, auto-numbered code, audit)
$rand = [System.Guid]::NewGuid().ToString('N').Substring(0, 8)
$cin = (Get-Random -Minimum 10000000 -Maximum 99999999).ToString()
$beneficiary = @{
  firstName = 'Ahmed'; lastName = 'Ben Salah'; gender = 'male'
  dateOfBirth = '1980-05-15'; maritalStatus = 'married'
  cin = $cin; phone = '+216 90 123 456'
  address = 'Rue de la Republique, Tunis'
  region = 'Tunis'; city = 'Tunis'
  publicAlias = "AB-$rand"
  departmentId = $dept.id
  reason = 'Family needs monthly food aid'
} | ConvertTo-Json -Compress
$beneficiary | Out-File -Encoding utf8 -NoNewline smoke-bene.json
$created = curl.exe -s -b smoke-cookies.txt -H 'content-type: application/json' --data-binary '@smoke-bene.json' "$base/api/beneficiaries"
Show "POST /api/beneficiaries" $created
$ben = $created | ConvertFrom-Json

# 5) Break-the-glass: deny without reason, allow with reason
$noReason = curl.exe -s -b smoke-cookies.txt "$base/api/beneficiaries/$($ben.id)/full"
Show "GET /full (no reason)" $noReason
$withReason = curl.exe -s -b smoke-cookies.txt "$base/api/beneficiaries/$($ben.id)/full?reason=Verification%20visit"
Show "GET /full (with reason, decrypted)" $withReason

# 6) Cash donation
$don = '{"amount":50000,"currency":"TND","donorNameSnapshot":"Anonymous benefactor","isAnonymous":true}'
$don | Out-File -Encoding utf8 -NoNewline smoke-don.json
$donation = curl.exe -s -b smoke-cookies.txt -H 'content-type: application/json' --data-binary '@smoke-don.json' "$base/api/donations/cash"
Show "POST /api/donations/cash" $donation

# 7) Stats
$stats = curl.exe -s -b smoke-cookies.txt "$base/api/donations/stats"
Show "GET /api/donations/stats" $stats

# 8) Last 5 audit events
$audit = curl.exe -s -b smoke-cookies.txt "$base/api/audit/organization?limit=5"
Show "GET /api/audit/organization (limit 5)" $audit

Write-Host ""
Write-Host "Smoke test passed." -ForegroundColor Green

Remove-Item -ErrorAction SilentlyContinue smoke-login.json, smoke-bene.json, smoke-don.json
