import * as cdk from "@aws-cdk/core";
import * as codebuild from "@aws-cdk/aws-codebuild";
import * as codepipeline from "@aws-cdk/aws-codepipeline";
import * as codepipeline_actions from "@aws-cdk/aws-codepipeline-actions";
import * as kms from "@aws-cdk/aws-kms";
import * as lambda from "@aws-cdk/aws-lambda";
import * as secretsmanager from "@aws-cdk/aws-secretsmanager";

export interface PipelineStackProps extends cdk.StackProps {
  readonly suffix: string;
  readonly lambdaCode: lambda.CfnParametersCode;
  readonly queueSenderArn: string;
  readonly s3BucketArn: string;
  readonly kmsEncryptionKeyArn: string;
  readonly secretsManagerSecretArn: string;
  readonly goVersion: string;
}

export class PipelineStack extends cdk.Stack {
  constructor(app: cdk.App, id: string, props: PipelineStackProps) {
    super(app, id, props);

    // Fetch Github OAuth Token from SecretsManager.
    const githubOAuthToken = secretsmanager.Secret.fromSecretAttributes(this, "GithubOAuthToken", {
      encryptionKey: kms.Key.fromKeyArn(this, "aws/secretsmanager", props.kmsEncryptionKeyArn),
      secretArn: props.secretsManagerSecretArn,
    }).secretValue;

    // Initialize Lambda source and build artifacts.
    const lambdaSourceOutput = new codepipeline.Artifact();
    const lambdaBuildOutput = new codepipeline.Artifact("LambdaBuildOutput");

    // Initialize CDK source and build artifacts.
    const cdkSourceOutput = new codepipeline.Artifact();
    const cdkBuildOutput = new codepipeline.Artifact("CdkBuildOutput");

    // Create pipeline.
    new codepipeline.Pipeline(this, `MailServicePipeline-${props.suffix}`, {
      stages: [
        {
          stageName: "Source",
          actions: [
            new codepipeline_actions.GitHubSourceAction({
              actionName: "LambdaSource",
              output: lambdaSourceOutput,
              owner: "2pisoftware",
              repo: "Cmfive-Mail-Service-Queue-Trigger",
              oauthToken: githubOAuthToken
            }),
            // Because this pulls the source from itself any changes must be pushed to be used.
            new codepipeline_actions.GitHubSourceAction({
              actionName: "CDKSource",
              output: cdkSourceOutput,
              owner: "2pisoftware",
              repo: "Cmfive-Mail-Service-CDK",
              oauthToken: githubOAuthToken
            })
          ]
        },
        {
          stageName: "Build",
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: "LambdaBuild",
              project: new codebuild.PipelineProject(this, "LambdaBuild", {
                environment: {
                  buildImage: codebuild.LinuxBuildImage.STANDARD_4_0,
                },
              }),
              input: lambdaSourceOutput,
              outputs: [
                lambdaBuildOutput
              ],
              environmentVariables: {
                "GO_VERSION": {
                  type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
                  value: props.goVersion
                }
              }
            }),
            new codepipeline_actions.CodeBuildAction({
              actionName: "CDKBuild",
              project: new codebuild.PipelineProject(this, "CDKBuild", {
                buildSpec: codebuild.BuildSpec.fromObject({
                  version: "0.2",
                  phases: {
                    install: {
                      commands: [
                        "npm install",
                        "npm install -g aws-cdk",
                      ]
                    },
                    build: {
                      commands: [
                        "npm run build",
                        `cdk synth -c suffix=${props.suffix}`
                      ],
                    },
                  },
                  artifacts: {
                    "base-directory": "cdk.out",
                    files: [
                      `QueueStack-${props.suffix}.template.json`,
                    ],
                  },
                }),
                environment: {
                  buildImage: codebuild.LinuxBuildImage.STANDARD_4_0,
                },
              }),
              input: cdkSourceOutput,
              outputs: [
                cdkBuildOutput
              ],
              environmentVariables: {
                "QUEUE_SENDER_ARN": {
                  value: props.queueSenderArn
                },
                "S3_BUCKET_ARN": {
                  value: props.s3BucketArn
                },
                "KMS_ENCRYPTION_KEY_ARN": {
                  value: props.kmsEncryptionKeyArn
                },
                "SECRETS_MANAGER_SECRET_ARN": {
                  value: props.secretsManagerSecretArn
                },
                "GO_VERSION": {
                  value: props.goVersion
                }
              }
            })
          ]
        },
        {
          stageName: "Deploy",
          actions: [
            new codepipeline_actions.CloudFormationCreateUpdateStackAction({
              actionName: "CDKDeploy",
              templatePath: cdkBuildOutput.atPath(`QueueStack-${props.suffix}.template.json`),
              stackName: `MailServiceQueueStack-${props.suffix}`,
              adminPermissions: true,
              parameterOverrides: {
                ...props.lambdaCode.assign(lambdaBuildOutput.s3Location)
              },
              extraInputs: [
                lambdaBuildOutput
              ]
            })
          ]
        }
      ]
    });
  }
}