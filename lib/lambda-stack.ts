import * as lambda from "@aws-cdk/aws-lambda";
import * as cdk from "@aws-cdk/core";

export class LambdaStack extends cdk.Stack {
  public readonly lambdaCode: lambda.CfnParametersCode;

  constructor(app: cdk.App, id: string, props?: cdk.StackProps) {
    super(app, id, props);

    this.lambdaCode = lambda.Code.fromCfnParameters();

    new lambda.Function(this, "MailServiceQueuePopper", {
      code: this.lambdaCode,
      handler: "main",
      runtime: lambda.Runtime.GO_1_X,
    });
  }
}