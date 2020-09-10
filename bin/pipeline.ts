import * as cdk from "@aws-cdk/core";
import { QueueStack } from "../lib/queue-stack";
import { PipelineStack } from "../lib/pipeline-stack";
import { exit } from "process";

require("dotenv").config();

const queueSenderArn = process.env.QUEUE_SENDER_ARN;
if (queueSenderArn === "" || queueSenderArn === undefined) {
  console.log("Error: 'QUEUE_SENDER_ARN' environment variable not set, exiting...");
  exit(1);
}

const app = new cdk.App();

const queueStack = new QueueStack(app, "QueueStack", {
  queueSenderArn: queueSenderArn
});
new PipelineStack(app, "MailServiceStack", {
  lambdaCode: queueStack.lambdaCode,
  queueSenderArn: queueSenderArn,
});

app.synth();