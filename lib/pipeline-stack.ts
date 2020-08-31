import * as cdk from "@aws-cdk/core";
import * as codebuild from "@aws-cdk/aws-codebuild";
import * as codepipeline from "@aws-cdk/aws-codepipeline";
import * as codepipelineactions from "@aws-cdk/aws-codepipeline-actions";
import * as kms from "@aws-cdk/aws-kms";
import * as lambda from "@aws-cdk/aws-lambda";
import * as secretsmanager from "@aws-cdk/aws-secretsmanager";

export interface PipelineStackProps extends cdk.StackProps {
  readonly lambdaCode: lambda.CfnParametersCode;
}

export class PipelineStack extends cdk.Stack {
  constructor(app: cdk.App, id: string, props: PipelineStackProps) {
    super(app, id, props);

    const cdkBuild = new codebuild.PipelineProject(this, "CdkBuild", {
      buildSpec: codebuild.BuildSpec.fromObject({
        version: "0.2",
        phases: {
          install: {
            commands: "npm install",
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
            "LambdaStack.template.json",
          ],
        },
      }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_2_0,
      },
    });

    const lambdaBuild = new codebuild.PipelineProject(this, "LambdaBuild", {
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_2_0,
      },
    });

    const sourceOutput = new codepipeline.Artifact();
    const cdkBuildOutput = new codepipeline.Artifact("CdkBuildOutput");
    const lambdaBuildOutput = new codepipeline.Artifact("LambdaBuildOutput");

    const gitHubOAuthToken = cdk.SecretValue.secretsManager("2piSoftwareBotGithub", {
      jsonField: "token"
    });

    new codepipeline.Pipeline(this, "Pipeline", {
      stages: [
        {
          stageName: "Source",
          actions: [
            new codepipelineactions.GitHubSourceAction({
              actionName: "GithubSource",
              output: sourceOutput,
              owner: "2pisoftware",
              repo: "mail-service-popper",
              oauthToken: secretsmanager.Secret.fromSecretAttributes(this, "2piSoftwareBotGithub", {
                encryptionKey: kms.Key.fromKeyArn(this, "aws/secretsmanager", "arn:aws:kms:ap-southeast-2:159114716345:key/0b4bb6f9-df4a-4e30-8c7e-41ec4f7a9cfd"),
                secretArn: "arn:aws:secretsmanager:ap-southeast-2:159114716345:secret:2piSoftwareBotGithub-ul0UCU",
              }).secretValue
            })
          ]
        },
        {
          stageName: "Build",
          actions: [
            new codepipelineactions.CodeBuildAction({
              actionName: "Lambda_Build",
              project: lambdaBuild,
              input: sourceOutput,
              outputs: [
                lambdaBuildOutput
              ]
            }),
            new codepipelineactions.CodeBuildAction({
              actionName: "CDK_Build",
              project: cdkBuild,
              input: sourceOutput,
              outputs: [
                cdkBuildOutput
              ]
            })
          ]
        },
        {
          stageName: "Deploy",
          actions: [
            new codepipelineactions.CloudFormationCreateUpdateStackAction({
              actionName: "Lambda_CFN_Deploy",
              templatePath: cdkBuildOutput.atPath("LambdaStack.template.json"),
              stackName: "LambdaDeploymentStack",
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