import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as lambda_events from "@aws-cdk/aws-lambda-event-sources";
import * as iam from "@aws-cdk/aws-iam";
import * as sqs from "@aws-cdk/aws-sqs";

interface QueueStackProps extends cdk.StackProps {
  readonly suffix: string;
  readonly queueSenderArn: string;
  readonly s3BucketArn: string;
}

export class QueueStack extends cdk.Stack {
  public readonly lambdaCode: lambda.CfnParametersCode;

  constructor(app: cdk.App, id: string, props: QueueStackProps) {
    super(app, id, props);

    // Fetch Lambda code from CloudFormation parameters.
    this.lambdaCode = lambda.Code.fromCfnParameters();

    // Create SQS queue.
    const queue = new sqs.Queue(this, `MailServiceQueue-${props.suffix}`);

    // Give the queue sender permission to send messages to the SQS queue.
    queue.addToResourcePolicy(new iam.PolicyStatement({
      actions: [
        "SQS:SendMessage",
      ],
      principals: [
        new iam.ArnPrincipal(props.queueSenderArn)
      ],
      resources: [
        queue.queueArn
      ],
      effect: iam.Effect.ALLOW,
    }));

    // Create Lambda function.
    const queuePopper = new lambda.Function(this, `MailServiceQueuePopper-${props.suffix}`, {
      code: this.lambdaCode,
      handler: "main",
      runtime: lambda.Runtime.GO_1_X,
    });

    // Give the Lambda function permission to send raw emails via SES. Note, it is currently not
    // possible to restrict the resource or add a condition restricting the from address when
    // making calls to ses:SendRawEmail. This is an issue with AWS. It may be worth adding our
    // own restrictions in code here eventually.
    queuePopper.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        "ses:SendRawEmail"
      ],
      resources: [
        "*"
      ],
    }));

    // Give the Lambda function permission to fetch objects from S3 to use as attachments.
    queuePopper.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      resources: [
        props.s3BucketArn,
        `${props.s3BucketArn}/*`
      ]
    }));
    queuePopper.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        "s3:HeadBucket",
      ],
      resources: [
        "*"
      ]
    }));

    // Give Lambda function permission to consume SQS queue messages and
    // add the SQS queue as an event source.
    queue.grantConsumeMessages(queuePopper);
    queuePopper.addEventSource(new lambda_events.SqsEventSource(queue));
  }
}