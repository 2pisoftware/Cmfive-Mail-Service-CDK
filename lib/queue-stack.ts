import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as lambda_events from '@aws-cdk/aws-lambda-event-sources';
import * as sqs from "@aws-cdk/aws-sqs";

export class QueueStack extends cdk.Stack {
  public readonly lambdaCode: lambda.CfnParametersCode;

  constructor(app: cdk.App, id: string, props?: cdk.StackProps) {
    super(app, id, props);

    this.lambdaCode = lambda.Code.fromCfnParameters();

    const queuePopper = new lambda.Function(this, "MailServiceQueuePopper", {
      code: this.lambdaCode,
      handler: "main",
      runtime: lambda.Runtime.GO_1_X,
    });

    const queue = new sqs.Queue(this, 'MailServiceQueue');

    queue.grantConsumeMessages(queuePopper);
    queuePopper.addEventSource(new lambda_events.SqsEventSource(queue));
  }
}