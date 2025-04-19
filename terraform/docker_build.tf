resource "null_resource" "docker_pull_and_push" {
  triggers = {
    docker_hub_image   = var.docker_hub_image_name
    ecr_repository_url = aws_ecr_repository.erica_website.repository_url
    image_tag          = var.docker_image_tag
    timestamp          = timestamp()
  }

  provisioner "local-exec" {
    command = <<-EOT
      set -e
      echo "Logging into ECR..."
      REGISTRY_URI=$(echo "${aws_ecr_repository.erica_website.repository_url}" | cut -d'/' -f1)
      aws ecr get-login-password --profile erica-website-profile --region ${var.aws_region} | docker login --username AWS --password-stdin "$REGISTRY_URI"
      
      echo "Pulling image from Docker Hub..."
      docker pull "${var.docker_hub_image_name}:${var.docker_image_tag}"
      
      echo "Tagging image for ECR..."
      docker tag "${var.docker_hub_image_name}:${var.docker_image_tag}" "${aws_ecr_repository.erica_website.repository_url}:${var.docker_image_tag}"
      
      echo "Pushing image to ECR..."
      docker push "${aws_ecr_repository.erica_website.repository_url}:${var.docker_image_tag}"
      
      echo "Cleaning up local images..."
      docker rmi "${var.docker_hub_image_name}:${var.docker_image_tag}" 2>/dev/null || true
      docker rmi "${aws_ecr_repository.erica_website.repository_url}:${var.docker_image_tag}" 2>/dev/null || true
      echo "Docker push process completed successfully."
    EOT

    interpreter = ["bash", "-c"]
    working_dir = path.module
    environment = {
      AWS_PROFILE = "erica-website-profile"
    }
  }

  depends_on = [aws_ecr_repository.erica_website]
}