$PROJECT_ID = "gen-lang-client-0591040744"
$REGION = "asia-southeast1"
$SERVICE_NAME = "llmsecurity-main"
$REPO_NAME = "llmsecurity"

# ENABLE APIs
gcloud services enable cloudbuild.googleapis.com run.googleapis.com --project $PROJECT_ID

# PARSE .ENV
$envVars = @()
if (Test-Path ".env") {
    foreach ($line in Get-Content ".env") {
        $line = $line.Trim()
        if (![string]::IsNullOrWhiteSpace($line) -and !$line.StartsWith("#")) {
            if ($line -notmatch "^GOOGLE_APPLICATION_CREDENTIALS=") {
                $envVars += $line
            }
        }
    }
}
$envVarString = $envVars -join ","

# BUILD IMAGE
gcloud builds submit --tag "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$SERVICE_NAME" --project $PROJECT_ID

# DEPLOY TO CLOUD RUN
if ($envVarString) {
    gcloud run deploy $SERVICE_NAME --image "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$SERVICE_NAME" --region $REGION --port 8000 --set-env-vars "$envVarString" --platform managed --allow-unauthenticated --project $PROJECT_ID
}
else {
    gcloud run deploy $SERVICE_NAME --image "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$SERVICE_NAME" --region $REGION --port 8000 --platform managed --allow-unauthenticated --project $PROJECT_ID
}