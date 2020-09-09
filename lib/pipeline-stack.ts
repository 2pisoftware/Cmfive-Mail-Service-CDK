import * as cdk from "@aws-cdk/core";
import * as codebuild from "@aws-cdk/aws-codebuild";
import * as codepipeline from "@aws-cdk/aws-codepipeline";
import * as codepipeline_actions from "@aws-cdk/aws-codepipeline-actions";
import * as kms from "@aws-cdk/aws-kms";
import * as lambda from "@aws-cdk/aws-lambda";
import * as secretsmanager from "@aws-cdk/aws-secretsmanager";

export interface PipelineStackProps extends cdk.StackProps {
  readonly lambdaCode: lambda.CfnParametersCode;
}

export class PipelineStack extends cdk.Stack {
  constructor(app: cdk.App, id: string, props: PipelineStackProps) {
    super(app, id, props);

    const lambdaSourceOutput = new codepipeline.Artifact();
    const lambdaBuildOutput = new codepipeline.Artifact("LambdaBuildOutput");

    const cdkSourceOutput = new codepipeline.Artifact();
    const cdkBuildOutput = new codepipeline.Artifact("CdkBuildOutput");

    const githubOAuthToken = secretsmanager.Secret.fromSecretAttributes(this, "2piSoftwareBotGithub", {
      encryptionKey: kms.Key.fromKeyArn(this, "aws/secretsmanager", "arn:aws:kms:ap-southeast-2:159114716345:key/0b4bb6f9-df4a-4e30-8c7e-41ec4f7a9cfd"),
      secretArn: "arn:aws:secretsmanager:ap-southeast-2:159114716345:secret:2piSoftwareBotGithub-ul0UCU",
    }).secretValue

    const lambdaSourceAction = new codepipeline_actions.GitHubSourceAction({
      actionName: "LambdaSource",
      output: lambdaSourceOutput,
      owner: "2pisoftware",
      repo: "mail-service-popper",
      oauthToken: githubOAuthToken
    });

    const cdkSourceAction = new codepipeline_actions.GitHubSourceAction({
      actionName: "CDKSource",
      output: cdkSourceOutput,
      owner: "2pisoftware",
      repo: "Cmfive-Mail-Service-CDK",
      oauthToken: githubOAuthToken
    });

    const lambdaBuildAction = new codepipeline_actions.CodeBuildAction({
      actionName: "LambdaBuild",
      project: new codebuild.PipelineProject(this, "LambdaBuild", {
        environment: {
          buildImage: codebuild.LinuxBuildImage.STANDARD_3_0,
        },
      }),
      input: lambdaSourceOutput,
      outputs: [
        lambdaBuildOutput
      ],
      environmentVariables: {
        "GO_VERSION": {
          type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
          value: "1.15.1"
        }
      }
    });

    const cdkBuildAction = new codepipeline_actions.CodeBuildAction({
      actionName: "CDKBuild",
      project: new codebuild.PipelineProject(this, "CDKBuild", {
        buildSpec: codebuild.BuildSpec.fromObject({
          version: "0.2",
          phases: {
            install: {
              commands: [
                "ls",
                "npm install",
              ]
            },
            build: {
              commands: [
                "npm run build",
                "npm run cdk synth -- -o dist"
              ],
            },
          },
          artifacts: {
            "base-directory": "dist",
            files: [
              "QueueStack.template.json",
            ],
          },
        }),
        environment: {
          buildImage: codebuild.LinuxBuildImage.STANDARD_3_0,
        },
      }),
      input: cdkSourceOutput,
      outputs: [
        cdkBuildOutput
      ]
    });

    const cdkDeployAction = new codepipeline_actions.CloudFormationCreateUpdateStackAction({
      actionName: "CDKDeploy",
      templatePath: cdkBuildOutput.atPath("QueueStack.template.json"),
      stackName: "MailServiceQueueStack",
      adminPermissions: true,
      parameterOverrides: {
        ...props.lambdaCode.assign(lambdaBuildOutput.s3Location)
      },
      extraInputs: [
        lambdaBuildOutput
      ]
    });

    new codepipeline.Pipeline(this, "MailServicePipeline", {
      stages: [
        {
          stageName: "Source",
          actions: [
            lambdaSourceAction,
            cdkSourceAction
          ]
        },
        {
          stageName: "Build",
          actions: [
            lambdaBuildAction,
            cdkBuildAction
          ]
        },
        {
          stageName: "Deploy",
          actions: [
            cdkDeployAction
          ]
        }
      ]
    });
  }
}