# ============================================================
# deploy.sh — Build & Deploy Family Budget Tracker to Cloud Run
# ============================================================
# Usage (PowerShell):
#   .\deploy.ps1
# OR (Git Bash / WSL):
#   bash deploy.sh

$ErrorActionPreference = "Stop"

# === CONFIGURATION ===
$PROJECT_ID = "family-budget-tracker"
$REGION     = "us-central1"
$SERVICE    = "walet"
$IMAGE      = "gcr.io/$PROJECT_ID/$SERVICE`:latest"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Family Budget Tracker - Cloud Run Deploy" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# === 0. Prerequisites check ===
Write-Host "`n[0/4] Checking prerequisites..." -ForegroundColor Yellow

try {
    gcloud --version 2>&1 | Out-Null
} catch {
    Write-Host "ERROR: gcloud CLI not found. Install: https://cloud.google.com/sdk/docs/install" -ForegroundColor Red
    exit 1
}

try {
    docker --version 2>&1 | Out-Null
} catch {
    Write-Host "ERROR: Docker not found. Install Docker Desktop." -ForegroundColor Red
    exit 1
}

# === 1. Authenticate ===
Write-Host "`n[1/4] Authenticating with Google Cloud..." -ForegroundColor Yellow
gcloud auth login --brief
gcloud config set project $PROJECT_ID
gcloud auth configure-docker gcr.io --quiet

# === 2. Build Docker image ===
Write-Host "`n[2/4] Building Docker image (`docker build`)..." -ForegroundColor Yellow
docker build --platform linux/amd64 -t $IMAGE .

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker build failed!" -ForegroundColor Red
    exit 1
}

# === 3. Push to Container Registry ===
Write-Host "`n[3/4] Pushing image to gcr.io..." -ForegroundColor Yellow
docker push $IMAGE

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker push failed!" -ForegroundColor Red
    exit 1
}

# === 4. Deploy to Cloud Run ===
Write-Host "`n[4/4] Deploying to Cloud Run..." -ForegroundColor Yellow

gcloud run deploy $SERVICE `
    --image $IMAGE `
    --platform managed `
    --region $REGION `
    --port 8080 `
    --memory 512Mi `
    --cpu 1 `
    --min-instances 0 `
    --max-instances 1 `
    --concurrency 80 `
    --timeout 300 `
    --allow-unauthenticated `
    --set-env-vars "NODE_ENV=production" `
    --set-env-vars "GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE"

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Cloud Run deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host " DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# Get the deployed URL
$URL = gcloud run services describe $SERVICE --platform managed --region $REGION --format "value(status.url)"
Write-Host "`nApp URL: $URL" -ForegroundColor Cyan
Write-Host "`nIMPORTANT:" -ForegroundColor Yellow
Write-Host "  1. Update GEMINI_API_KEY in Cloud Run console or redeploy with real key." -ForegroundColor Yellow
Write-Host "  2. SQLite data is EPHEMERAL - resets on new deploy or scale-to-zero." -ForegroundColor Yellow
Write-Host "  3. For persistent data, consider Cloud SQL (see DEPLOY.md)." -ForegroundColor Yellow
