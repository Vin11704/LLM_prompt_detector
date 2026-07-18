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

        # env vars — set these after first deploy, or via GH Actions
        # env { name = "GOOGLE_CLOUD_PROJECT" value = var.project_id }
        # env { name = "AUTH_username"        value = "..." }
        # env { name = "AUTH_password"        value = "..." }
        # env { name = "ALLOWED_ORIGINS"      value = "..." }

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