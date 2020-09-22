import * as cdk from "@aws-cdk/core";
import * as dotenv from "dotenv";
import { exit } from "process";
import { PipelineStack } from "../lib/pipeline-stack";
import { QueueStack } from "../lib/queue-stack";

// Load any environment variables from .env files.
dotenv.config();

// Check the required environment variables were loaded successfully.
const queueSenderArn = process.env.QUEUE_SENDER_ARN;
if (queueSenderArn === "" || queueSenderArn === undefined) {
  console.log("Error: 'QUEUE_SENDER_ARN' environment variable not set, exiting...");
  exit(1);
}
const s3BucketArn = process.env.S3_BUCKET_ARN;
if (s3BucketArn === "" || s3BucketArn === undefined) {
  console.log("Error: 'S3_BUCKET_ARN' environment variable not set, exiting...");
  exit(1);
}
const kmsEncryptionKeyArn = process.env.KMS_ENCRYPTION_KEY_ARN;
if (kmsEncryptionKeyArn === "" || kmsEncryptionKeyArn === undefined) {
  console.log("Error: 'KMS_ENCRYPTION_KEY_ARN' environment variable not set, exiting...");
  exit(1);
}
const secretsManagerSecretArn = process.env.SECRETS_MANAGER_SECRET_ARN;
if (secretsManagerSecretArn === "" || secretsManagerSecretArn === undefined) {
  console.log("Error: 'SECRETS_MANAGER_SECRET_ARN' environment variable not set, exiting...");
  exit(1);
}
const goVersion = process.env.GO_VERSION;
if (goVersion === "" || goVersion === undefined) {
  console.log("Error: 'GO_VERSION' environment variable not set, exiting...");
  exit(1);
}


const app = new cdk.App();

// Get the suffix from the context. This allows the stack to deployed multiple times within
// the same AWS Account. The suffix should be something like 'dev', 'test' or 'prod'. Context
// variables can be defined by passing 'cdk deploy -c key=value'. For more information see
// https://docs.aws.amazon.com/cdk/latest/guide/get_context_var.html.
const suffix = app.node.tryGetContext("suffix");
if (suffix === undefined) {
  console.log("Error: 'suffix' not defined in context, exiting...");
  exit(1);
}

// Create stacks.
const queueStack = new QueueStack(app, `QueueStack-${suffix}`, {
  queueSenderArn: queueSenderArn,
  s3BucketArn: s3BucketArn,
});
new PipelineStack(app, `MailServiceStack-${suffix}`, {
  lambdaCode: queueStack.lambdaCode,
  queueSenderArn: queueSenderArn,
  s3BucketArn: s3BucketArn,
  kmsEncryptionKeyArn: kmsEncryptionKeyArn,
  secretsManagerSecretArn: secretsManagerSecretArn,
  suffix: suffix,
  goVersion: goVersion
});
