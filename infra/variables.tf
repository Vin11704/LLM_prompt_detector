variable "project_id" {
  description = "GCP project ID — set via terraform.tfvars or -var flag"
  # default removed to prevent accidental applies to wrong project
}
variable "region" {
  default = "asia-southeast1"
}
variable "repo_name" {
  description = "Artifact Registry repository name"
  default     = "llmsecurity"
}
variable "github_repo" {
  description = "GitHub repo in owner/repo format"
  default     = "Vin11704/LLM_prompt_detector"
}