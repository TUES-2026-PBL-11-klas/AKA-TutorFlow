terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.50"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# ─── Secrets Manager ──────────────────────────────────────────────────────────

resource "aws_secretsmanager_secret" "supabase_url" {
  name        = "${var.app_name}/supabase-url"
  description = "Supabase project URL"
}

resource "aws_secretsmanager_secret_version" "supabase_url" {
  secret_id     = aws_secretsmanager_secret.supabase_url.id
  secret_string = var.supabase_url
}

resource "aws_secretsmanager_secret" "supabase_anon_key" {
  name        = "${var.app_name}/supabase-anon-key"
  description = "Supabase anonymous key"
}

resource "aws_secretsmanager_secret_version" "supabase_anon_key" {
  secret_id     = aws_secretsmanager_secret.supabase_anon_key.id
  secret_string = var.supabase_anon_key
}

resource "aws_secretsmanager_secret" "supabase_service_role_key" {
  name        = "${var.app_name}/supabase-service-role-key"
  description = "Supabase service role key"
}

resource "aws_secretsmanager_secret_version" "supabase_service_role_key" {
  secret_id     = aws_secretsmanager_secret.supabase_service_role_key.id
  secret_string = var.supabase_service_role_key
}

resource "aws_secretsmanager_secret" "db_credentials" {
  name        = "${var.app_name}/db-credentials"
  description = "Database credentials"
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    DB_USER     = var.db_user
    DB_PASSWORD = var.db_password
  })
}

resource "aws_secretsmanager_secret" "gemini_api_key" {
  name        = "${var.app_name}/gemini-api-key"
  description = "Google Gemini API key"
}

resource "aws_secretsmanager_secret_version" "gemini_api_key" {
  secret_id     = aws_secretsmanager_secret.gemini_api_key.id
  secret_string = var.gemini_api_key
}

# ─── Amplify App ──────────────────────────────────────────────────────────────

resource "aws_amplify_app" "tutorflow" {
  name       = var.app_name
  repository = var.github_repo

  access_token = var.github_token

  platform = "WEB_COMPUTE"

  build_spec = <<-YAML
    version: 1
    frontend:
      phases:
        preBuild:
          commands:
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: .next
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
          - .next/cache/**/*
  YAML

  environment_variables = {
    NEXT_PUBLIC_SUPABASE_URL      = var.supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY = var.supabase_anon_key
    SUPABASE_SERVICE_ROLE_KEY     = var.supabase_service_role_key
    DB_USER                       = var.db_user
    DB_PASSWORD                   = var.db_password
    GEMINI_API_KEY                = var.gemini_api_key
  }
}

resource "aws_amplify_branch" "main" {
  app_id      = aws_amplify_app.tutorflow.id
  branch_name = var.branch

  enable_auto_build = true

  stage = "PRODUCTION"
}

# ─── SNS Topic for Alerts ────────────────────────────────────────────────────

resource "aws_sns_topic" "alerts" {
  name = "${var.app_name}-alerts"
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# ─── CloudWatch Log Group ────────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "amplify" {
  name              = "/aws/amplify/${var.app_name}"
  retention_in_days = 14
}

# ─── CloudWatch Alarms ───────────────────────────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "amplify_5xx" {
  alarm_name          = "${var.app_name}-5xx-errors"
  alarm_description   = "Fires when Amplify returns 5xx errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "5xxErrors"
  namespace           = "AWS/AmplifyHosting"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  treat_missing_data  = "notBreaching"

  dimensions = {
    AppId = aws_amplify_app.tutorflow.id
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "amplify_4xx" {
  alarm_name          = "${var.app_name}-4xx-errors"
  alarm_description   = "Fires when Amplify returns excessive 4xx errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "4xxErrors"
  namespace           = "AWS/AmplifyHosting"
  period              = 300
  statistic           = "Sum"
  threshold           = 50
  treat_missing_data  = "notBreaching"

  dimensions = {
    AppId = aws_amplify_app.tutorflow.id
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "amplify_latency" {
  alarm_name          = "${var.app_name}-high-latency"
  alarm_description   = "Fires when average latency exceeds 3 seconds"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Latency"
  namespace           = "AWS/AmplifyHosting"
  period              = 300
  statistic           = "Average"
  threshold           = 3000
  treat_missing_data  = "notBreaching"

  dimensions = {
    AppId = aws_amplify_app.tutorflow.id
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}
