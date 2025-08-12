# PowerShell script to make the GitHub Container Registry package public
# Usage: .\make-package-public.ps1 [GITHUB_TOKEN]

param(
    [string]$GitHubToken
)

$PackageName = "cinecalidad-stremio-addon"
$Owner = "rxb3rth"

# Use provided token or environment variable
if (-not $GitHubToken) {
    $GitHubToken = $env:GITHUB_TOKEN
}

if (-not $GitHubToken) {
    Write-Host "Please provide GitHub token as parameter or set GITHUB_TOKEN environment variable" -ForegroundColor Red
    Write-Host "Usage: .\make-package-public.ps1 [GITHUB_TOKEN]" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To create a token:" -ForegroundColor Cyan
    Write-Host "1. Go to https://github.com/settings/tokens"
    Write-Host "2. Create a Personal Access Token with 'packages:write' scope"
    Write-Host "3. Run: .\make-package-public.ps1 your_token_here"
    exit 1
}

Write-Host "Making package $PackageName public..." -ForegroundColor Blue

# Prepare headers and body
$headers = @{
    "Accept" = "application/vnd.github+json"
    "Authorization" = "Bearer $GitHubToken"
    "X-GitHub-Api-Version" = "2022-11-28"
}

$body = @{
    visibility = "public"
} | ConvertTo-Json

$uri = "https://api.github.com/user/packages/container/$PackageName"

try {
    # Make the API call
    $response = Invoke-RestMethod -Uri $uri -Method PATCH -Headers $headers -Body $body -ContentType "application/json"
    
    if ($response.visibility -eq "public") {
        Write-Host "✅ Package successfully made public!" -ForegroundColor Green
        Write-Host "Your image is now available at:" -ForegroundColor Green
        Write-Host "   docker pull ghcr.io/$Owner/$PackageName`:latest" -ForegroundColor White
        Write-Host ""
        Write-Host "Anyone can now pull and use your Docker image without authentication." -ForegroundColor Green
    }
}
catch {
    Write-Host "❌ Error making package public:" -ForegroundColor Red
    if ($_.Exception.Response) {
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $errorContent = $reader.ReadToEnd()
        Write-Host $errorContent -ForegroundColor Red
    } else {
        Write-Host $_.Exception.Message -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "- Token needs 'packages:write' scope"
    Write-Host "- Package might not exist yet"
    Write-Host "- You might not have permissions"
}

Write-Host ""
Write-Host "You can also make it public manually:" -ForegroundColor Cyan
Write-Host "1. Go to https://github.com/$Owner/$PackageName/packages"
Write-Host "2. Click on the package"
Write-Host "3. Go to Package settings"
Write-Host "4. Change visibility to Public"
