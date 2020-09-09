# Cmfive Mail Service CDK

## Introduction
This repository contains two CDK stacks. The first, will create an SQS queue and a Lambda function to consume the queue's messages. The second create a CodePipeline to deploy the previously mentioned stack and its Lambda function's code.

Because the pipeline stack depends on the queue stack and pulls the source of the queue stack from this repository on Github, the latest changes must be pushed on the queue stack. This is a bit of a weird quirk and therefore the queue stack may be abstracted into its own reposity if it proves general enough for use in other CDK stacks.

## Deployment
Run 'cdk deploy MailServiceStack' to deploy with your default AWS credentials. Add '--profile PROFILE_NAME' to the command to use a different set of AWS credentials.