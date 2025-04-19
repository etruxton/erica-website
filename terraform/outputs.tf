output "ecr_repository_url" {
  value       = aws_ecr_repository.erica_website.repository_url
  description = "URL of the ECR repository"
}

output "docker_image_ecr_uri" {
  value       = "${aws_ecr_repository.erica_website.repository_url}:${var.docker_image_tag}"
  description = "URI of the Docker image in ECR"
}