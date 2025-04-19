resource "aws_ecr_repository" "erica_website" {
  name                 = var.ecr_repository_name
  image_tag_mutability = var.ecr_image_tag_mutability
}

provider "aws" {
  region = var.aws_region
  profile = "erica-website-profile"
  # You can also specify credentials here, but it's generally better
  # to rely on environment variables, AWS CLI configuration, or IAM roles.
  # I believe you cahce will be used to find your access key and secret access key.. don't hardcode that!
}