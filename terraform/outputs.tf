output "amplify_app_id" {
  description = "Amplify App ID"
  value       = aws_amplify_app.tutorflow.id
}

output "amplify_default_domain" {
  description = "Amplify default domain"
  value       = aws_amplify_app.tutorflow.default_domain
}

output "sns_topic_arn" {
  description = "SNS topic ARN for alert notifications"
  value       = aws_sns_topic.alerts.arn
}

output "cloudwatch_log_group" {
  description = "CloudWatch log group for Amplify"
  value       = aws_cloudwatch_log_group.amplify.name
}
