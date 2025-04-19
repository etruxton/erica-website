variable "aws_region" {
  type        = string
  description = "AWS Region where resources will be created"
  default     = "us-east-1" 
}

variable "ecr_repository_name" {
  type        = string
  description = "Name of the ECR repository"
  default     = "erica-website-repository"
}

variable "ecr_image_tag_mutability" {
  type        = string
  description = "ECR image tag mutability setting"
  default     = "MUTABLE" # Or "IMMUTABLE"
}

variable "docker_image_tag" {
  type        = string
  description = "Tag to use for the Docker image in ECR"
  default     = "latest"
}

variable "docker_hub_image_name" {
  type        = string
  description = "Name of the Docker Hub image"
  default     = "etruxton/erica-website-image"
}