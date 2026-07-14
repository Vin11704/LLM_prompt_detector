# Deploy without changing env var

$PROJECT_ID = "gen-lang-client-0591040744"
$REGION = "asia-southeast1"
$SERVICE_NAME = "llmsecurity-main"
$REPO_NAME = "llmsecurity"

# ENABLE APIs
gcloud services enable cloudbuild.googleapis.com run.googleapis.com --project $PROJECT_ID


# BUILD IMAGE
gcloud builds submit --tag "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$SERVICE_NAME" --project $PROJECT_ID

# DEPLOY TO CLOUD RUN
gcloud run deploy $SERVICE_NAME --image "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$SERVICE_NAME" --region $REGION --port 8000 --platform managed --allow-unauthenticated --project $PROJECT_ID
