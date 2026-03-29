$BaseUrl = if ($args.Length -gt 0 -and $args[0]) { $args[0].TrimEnd('/') } else { 'http://localhost:3001' }
$Routes = @(
  [pscustomobject]@{ Method = 'POST'; Path = '/api/admin/billing/generate-invoices' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/admin/invoices' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/admin/invoices/sample-id' }
  [pscustomobject]@{ Method = 'POST'; Path = '/api/admin/invoices/sample-id/line-items' }
  [pscustomobject]@{ Method = 'PATCH'; Path = '/api/admin/invoices/sample-id/status' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/admin/offers-review' }
  [pscustomobject]@{ Method = 'POST'; Path = '/api/admin/offers-review/sample-id/approve' }
  [pscustomobject]@{ Method = 'POST'; Path = '/api/admin/offers-review/sample-id/reject' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/admin/stats' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/admin/users' }
  [pscustomobject]@{ Method = 'PATCH'; Path = '/api/admin/users/sample-id/role' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/admin/vendor-requests' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/admin/vendor-requests/sample-id' }
  [pscustomobject]@{ Method = 'PATCH'; Path = '/api/admin/vendor-requests/sample-id' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/admin/vendors' }
  [pscustomobject]@{ Method = 'POST'; Path = '/api/admin/vendors' }
  [pscustomobject]@{ Method = 'PATCH'; Path = '/api/admin/vendors/sample-id' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/admin/vendors/sample-id/billing-plan' }
  [pscustomobject]@{ Method = 'PUT'; Path = '/api/admin/vendors/sample-id/billing-plan' }
  [pscustomobject]@{ Method = 'POST'; Path = '/api/auth/login' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/auth/me' }
  [pscustomobject]@{ Method = 'POST'; Path = '/api/auth/register' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/categories' }
  [pscustomobject]@{ Method = 'POST'; Path = '/api/categories' }
  [pscustomobject]@{ Method = 'DELETE'; Path = '/api/categories/sample-id' }
  [pscustomobject]@{ Method = 'PATCH'; Path = '/api/categories/sample-id' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/categories/sample-idOrSlug' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/companies' }
  [pscustomobject]@{ Method = 'POST'; Path = '/api/companies' }
  [pscustomobject]@{ Method = 'DELETE'; Path = '/api/companies/sample-id' }
  [pscustomobject]@{ Method = 'PATCH'; Path = '/api/companies/sample-id' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/companies/sample-idOrSlug' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/companies/sample-idOrSlug/deals' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/companies/requests' }
  [pscustomobject]@{ Method = 'POST'; Path = '/api/companies/requests' }
  [pscustomobject]@{ Method = 'PATCH'; Path = '/api/companies/requests/sample-id' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/companies/resolve/search' }
  [pscustomobject]@{ Method = 'POST'; Path = '/api/contact' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/employee-verifications/company/amazon/status' }
  [pscustomobject]@{ Method = 'POST'; Path = '/api/employee-verifications/confirm' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/employee-verifications/my' }
  [pscustomobject]@{ Method = 'POST'; Path = '/api/employee-verifications/start' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/employee-verifications/status' }
  [pscustomobject]@{ Method = 'POST'; Path = '/api/employee-verifications/test-email' }
  [pscustomobject]@{ Method = 'POST'; Path = '/api/employee-verifications/verify' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/finance/invoices' }
  [pscustomobject]@{ Method = 'PATCH'; Path = '/api/finance/vendors/sample-id/billing' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/finance/vendors/sample-id/charges' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/finance/vendors/summary' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/health' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/hr-contacts' }
  [pscustomobject]@{ Method = 'POST'; Path = '/api/hr-contacts' }
  [pscustomobject]@{ Method = 'DELETE'; Path = '/api/hr-contacts/sample-id' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/hr-contacts/sample-id' }
  [pscustomobject]@{ Method = 'PATCH'; Path = '/api/hr-contacts/sample-id' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/hr-contacts/company/amazon' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/leads' }
  [pscustomobject]@{ Method = 'POST'; Path = '/api/leads' }
  [pscustomobject]@{ Method = 'PATCH'; Path = '/api/leads/sample-id' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/leads/vendor' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/me' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/my-applications' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/offers' }
  [pscustomobject]@{ Method = 'POST'; Path = '/api/offers' }
  [pscustomobject]@{ Method = 'DELETE'; Path = '/api/offers/sample-id' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/offers/sample-id' }
  [pscustomobject]@{ Method = 'PATCH'; Path = '/api/offers/sample-id' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/offers/sample-id/access' }
  [pscustomobject]@{ Method = 'POST'; Path = '/api/offers/sample-id/action' }
  [pscustomobject]@{ Method = 'POST'; Path = '/api/offers/sample-id/apply' }
  [pscustomobject]@{ Method = 'POST'; Path = '/api/offers/sample-id/claim' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/offers/sample-id/claim-status' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/sales/dashboard' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/sales/offers' }
  [pscustomobject]@{ Method = 'POST'; Path = '/api/sales/offers' }
  [pscustomobject]@{ Method = 'POST'; Path = '/api/vendor/apply' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/vendor/billing' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/vendor/billing/invoices/sample-id/csv' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/vendor/dashboard' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/vendor/dashboard/company-breakdown' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/vendor/dashboard/lead-trend' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/vendor/dashboard/offer-performance' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/vendor/dashboard/summary' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/vendor/leads' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/vendor/leads/sample-id' }
  [pscustomobject]@{ Method = 'PATCH'; Path = '/api/vendor/leads/sample-id' }
  [pscustomobject]@{ Method = 'POST'; Path = '/api/vendor/login' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/vendor/offers' }
  [pscustomobject]@{ Method = 'POST'; Path = '/api/vendor/offers' }
  [pscustomobject]@{ Method = 'PATCH'; Path = '/api/vendor/offers/sample-id' }
  [pscustomobject]@{ Method = 'PUT'; Path = '/api/vendor/offers/sample-id' }
  [pscustomobject]@{ Method = 'POST'; Path = '/api/vendor/offers/sample-id/submit' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/vendor/policies/defaults' }
  [pscustomobject]@{ Method = 'POST'; Path = '/api/vendor/set-password' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/vendors' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/vendors/sample-id' }
  [pscustomobject]@{ Method = 'PATCH'; Path = '/api/vendors/sample-id' }
  [pscustomobject]@{ Method = 'POST'; Path = '/api/vendors/apply' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/vendors/me/profile' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/verify/company/amazon/status' }
  [pscustomobject]@{ Method = 'POST'; Path = '/api/verify/confirm' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/verify/my' }
  [pscustomobject]@{ Method = 'POST'; Path = '/api/verify/start' }
  [pscustomobject]@{ Method = 'GET'; Path = '/api/verify/status' }
  [pscustomobject]@{ Method = 'POST'; Path = '/api/verify/test-email' }
  [pscustomobject]@{ Method = 'POST'; Path = '/api/verify/verify' }
  [pscustomobject]@{ Method = 'GET'; Path = '/dev/seed' }
  [pscustomobject]@{ Method = 'GET'; Path = '/qa/test-email' }
  [pscustomobject]@{ Method = 'GET'; Path = '/qa/test-lead-flow' }
  [pscustomobject]@{ Method = 'GET'; Path = '/test-email' }
)

foreach ($route in $Routes) {
  $url = "$BaseUrl$($route.Path)"
  $bodyArgs = @()
  if ($route.Method -in @('POST', 'PUT', 'PATCH')) {
    $bodyArgs = @('-H', 'Content-Type: application/json', '-d', '{}')
  }
  $status = curl.exe -s -o NUL -w '%{http_code}' -X $route.Method @bodyArgs $url
  Write-Output ("{0}`t{1}`t{2}" -f $route.Method, $status, $route.Path)
}
