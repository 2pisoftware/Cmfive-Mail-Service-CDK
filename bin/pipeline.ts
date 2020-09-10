import * as cdk from "@aws-cdk/core";
import * as dotenv from "dotenv";
import { exit } from "process";
import { PipelineStack } from "../lib/pipeline-stack";
import { QueueStack } from "../lib/queue-stack";

dotenv.config();

const queueSenderArn = process.env.QUEUE_SENDER_ARN;
if (queueSenderArn === "" || queueSenderArn === undefined) {
  console.log("Error: 'QUEUE_SENDER_ARN' environment variable not set, exiting...");
  exit(1);
}

const sesDomainArn = process.env.SES_DOMAIN_ARN;
if (sesDomainArn === "" || sesDomainArn === undefined) {
  console.log("Error: 'SES_DOMAIN_ARN' environment variable not set, exiting...");
  exit(1);
}

const s3BucketArn = process.env.S3_BUCKET_ARN;
if (s3BucketArn === "" || s3BucketArn === undefined) {
  console.log("Error: 'S3_BUCKET_ARN' environment variable not set, exiting...");
  exit(1);
}

const app = new cdk.App();

const queueStack = new QueueStack(app, "QueueStack", {
  queueSenderArn: queueSenderArn,
  sesDomainArn: sesDomainArn,
  s3BucketArn: s3BucketArn,
});
new PipelineStack(app, "MailServiceStack", {
  lambdaCode: queueStack.lambdaCode,
  queueSenderArn: queueSenderArn,
  sesDomainArn: sesDomainArn,
  s3BucketArn: s3BucketArn,
});

app.synth();