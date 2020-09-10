import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as lambda_events from "@aws-cdk/aws-lambda-event-sources";
import * as iam from "@aws-cdk/aws-iam";
import * as sqs from "@aws-cdk/aws-sqs";

interface QueueStackProps extends cdk.StackProps {
  readonly queueSenderArn: string;
  readonly sesDomainArn: string;
  readonly s3BucketArn: string;
}

export class QueueStack extends cdk.Stack {
  public readonly lambdaCode: lambda.CfnParametersCode;

  constructor(app: cdk.App, id: string, props: QueueStackProps) {
    super(app, id, props);

    // Fetch Lambda code from CloudFormation parameters.
    this.lambdaCode = lambda.Code.fromCfnParameters();

    // Create SQS queue.
    const queue = new sqs.Queue(this, "MailServiceQueue");

    // Create Lambda function.
    const queuePopper = new lambda.Function(this, "MailServiceQueuePopper", {
      code: this.lambdaCode,
      handler: "main",
      runtime: lambda.Runtime.GO_1_X,
    });

    queuePopper.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        "ses:SendRawEmail"
      ],
      resources: [
        "*"
      ],
      conditions: {
        "StringEquals": {
          "ses:FromAddress": "*@2pisoftware.com"
        }
      }
    }));

    queuePopper.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        "ses:SendRawEmail",
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

    // queue.addToResourcePolicy(new iam.PolicyStatement({
    //   sid: "__receiver_statement",
    //   actions: [
    //     "SQS:ChangeMessageVisibility",
    //     "SQS:DeleteMessage",
    //     "SQS:ReceiveMessage"
    //   ],
    //   principals: [
    //     new iam.ArnPrincipal(queuePopper.functionArn)
    //   ]
    // }))

    // Give Lambda function permission to consume SQS queue messages and
    // add the SQS queue as an event source.
    queue.grantConsumeMessages(queuePopper);
    queuePopper.addEventSource(new lambda_events.SqsEventSource(queue));
  }
}