import * as cdk from "@aws-cdk/core";
import { QueueStack } from "../lib/queue-stack";
import { PipelineStack } from "../lib/pipeline-stack";

const app = new cdk.App();

const queueStack = new QueueStack(app, "QueueStack");
new PipelineStack(app, "MailServiceStack", {
  lambdaCode: queueStack.lambdaCode,
});

app.synth();