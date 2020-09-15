# Cmfive Mail Service CDK

## Introduction
This repository contains two CDK stacks. The first, will create an SQS queue and a [Lambda function](https://github.com/2pisoftware/Cmfive-Mail-Service-Queue-Trigger) to consume the queue's messages, build emails and send them via SES. The second create a CodePipeline to deploy the previously mentioned stack and its Lambda function's code.

Because the pipeline stack depends on the queue stack and pulls the source of the queue stack from this repository on Github, the latest changes must be pushed on the queue stack. This is a bit of a weird quirk and therefore the queue stack may be abstracted into its own reposity if it proves general enough for use in other CDK stacks.

## Deployment
Ensure the following environment variables are set, usually with an .env file.
* QUEUE_SENDER_ARN
* S3_BUCKET_ARN
* KMS_ENCRYPTION_KEY_ARN
* SECRETS_MANAGER_SECRET_ARN

Run 'cdk deploy MailServiceStack' to deploy with your default AWS credentials. Add '--profile PROFILE_NAME' to the command to use a different set of AWS credentials.
