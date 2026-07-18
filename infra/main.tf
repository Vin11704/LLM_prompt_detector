# ─── Enable required Google Cloud APIs ───────────────────────────
# Declared here so a fresh project is reproducible — otherwise these must be
# remembered and enabled by hand (which is how the Vertex AI call ended up
# failing at runtime).
locals {
  required_apis = [
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "aiplatform.googleapis.com",
    "secretmanager.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "sts.googleapis.com",
  ]
}

resource "google_project_service" "enabled" {
  for_each           = toset(local.required_apis)
  project            = var.project_id
  service            = each.value
  disable_on_destroy = false # never disable APIs when tearing down this stack
}

# ─── Artifact Registry ───────────────────────────────────────────
resource "google_artifact_registry_repository" "docker" {
  location      = var.region
  repository_id = var.repo_name
  format        = "DOCKER"
  description   = "Docker images for LLM Security app"
}

# ─── Service Account for Cloud Run ───────────────────────────────
resource "google_service_account" "cloudrun_sa" {
  account_id   = "llmsecurity-cloudrun"
  display_name = "LLM Security Cloud Run SA"
}

# Allow the runtime SA to call Vertex AI models. Without this the app gets
# 403 PERMISSION_DENIED (aiplatform.endpoints.predict) at request time.
resource "google_project_iam_member" "cloudrun_aiplatform" {
  project = var.project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_service_account.cloudrun_sa.email}"
}

# ─── Secret Manager: application secrets ─────────────────────────
# Only the secret *containers* are managed here. Their *values* are added
# out-of-band so plaintext never lands in Terraform state or version control:
#   printf '%s' "<value>" | gcloud secrets versions add <name> --data-file=-
locals {
  app_secrets = ["session-secret", "auth-username", "auth-password"]
}

resource "google_secret_manager_secret" "app" {
  for_each  = toset(local.app_secrets)
  secret_id = each.value
  replication {
    auto {}
  }
  depends_on = [google_project_service.enabled]
}

# Let the Cloud Run runtime SA read each secret at container startup.
resource "google_secret_manager_secret_iam_member" "app_accessor" {
  for_each  = google_secret_manager_secret.app
  secret_id = each.value.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloudrun_sa.email}"
}

# ─── Cloud Run: Backend ──────────────────────────────────────────
resource "google_cloud_run_v2_service" "backend" {
    name = "llmsecurity-api"
    location = var.region
    ingress = "INGRESS_TRAFFIC_ALL"

    template {
        service_account = google_service_account.cloudrun_sa.email
        containers {
            image = "${var.region}-docker.pkg.dev/${var.project_id}/${var.repo_name}/llmsecurity-api:latest"

        ports {
            container_port = 8000
        }

        # Runtime config is injected by the GitHub Actions deploy step
        # (.github/workflows/deploy-backend.yml):
        #   - plain env_vars: GOOGLE_CLOUD_PROJECT, ALLOWED_ORIGINS
        #   - Secret Manager (secrets:): SESSION_SECRET, AUTH_username, AUTH_password
        # Kept out of this resource so GH Actions remains the single writer of
        # the service's container config and the two don't fight over drift.

        }
    }
}

# ─── Cloud Run: Frontend ─────────────────────────────────────────
resource "google_cloud_run_v2_service" "frontend" {
  name     = "llmsecurity-frontend"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"
  template {
    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${var.repo_name}/llmsecurity-frontend:latest"
      ports {
        container_port = 8081
      }
    }
  }
}

# ─── Public Access (allow unauthenticated) ───────────────────────
resource "google_cloud_run_v2_service_iam_member" "backend_public" {
  name     = google_cloud_run_v2_service.backend.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service_iam_member" "frontend_public" {
  name     = google_cloud_run_v2_service.frontend.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ─── Workload Identity Federation (WIF) for GitHub Actions ───────────
resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "github-actions-pool"
  display_name              = "GitHub Actions Pool"
}
resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub OIDC Provider"
  attribute_mapping = {
    "google.subject"       = "assertion.sub" 
    "attribute.repository" = "assertion.repository"
  }
  attribute_condition = "assertion.repository == \"${var.github_repo}\""
  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

# ─── Service Account for GitHub Actions ──────────────────────────
resource "google_service_account" "github_actions" {
  account_id   = "github-actions-deployer"
  display_name = "GitHub Actions Deployer"
}
# Allow GH Actions to impersonate this SA
resource "google_service_account_iam_member" "wif_binding" {
  service_account_id = google_service_account.github_actions.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repo}"
}

# Grant the SA permissions to push images and deploy Cloud Run
resource "google_project_iam_member" "ar_writer" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}
resource "google_project_iam_member" "run_admin" {
  project = var.project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}
resource "google_project_iam_member" "sa_user" {
  project = var.project_id
  role    = "roles/iam.serviceAccountUser"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}