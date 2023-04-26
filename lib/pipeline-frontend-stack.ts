import * as cdk from "aws-cdk-lib";
import {
  aws_codebuild,
  aws_codepipeline,
  aws_codepipeline_actions,
  aws_iam,
  aws_s3,
  Stack
} from "aws-cdk-lib";
import { Construct } from "constructs";
import commonConfig from "../util/common-config";
import environmentConfig, {
  IEnvironmentConfig
} from "../util/environment-config";


interface FrontendPipelineStackStackProps extends cdk.StackProps {
  stage: "dev" | "preprod" | "production";
}

export class FrontendPipelineStack extends Stack {
  constructor(
    scope: Construct,
    id: string,
    props: FrontendPipelineStackStackProps,
  ) {
    super(scope, id, props);

    const { stage } = props;
    const envConfig: IEnvironmentConfig = environmentConfig(stage);

    const deployProject = new aws_codebuild.PipelineProject(
      this,
      "pipelineDeployProject",
      {
        projectName: `collect-frontend-deploy-${stage}`,
        buildSpec: aws_codebuild.BuildSpec.fromSourceFilename(
          "buildspec.yml"
        ),
        environment: {
          computeType: aws_codebuild.ComputeType.MEDIUM,
          buildImage: aws_codebuild.LinuxBuildImage.STANDARD_6_0,
          privileged: true,
        },
        cache: aws_codebuild.Cache.bucket(new aws_s3.Bucket(this, "CacheBucket")),
        
      }
    );

    const testsProject = new aws_codebuild.PipelineProject(
      this,
      "pipelineTestsProject",
      {
        projectName: `collect-frontend-tests-${stage}`,
        buildSpec: aws_codebuild.BuildSpec.fromSourceFilename(
          "cypress/buildspec.yml"
        ),
        environment: {
          computeType: aws_codebuild.ComputeType.SMALL,
          buildImage: aws_codebuild.LinuxBuildImage.fromDockerRegistry(
            "public.ecr.aws/cypress-io/cypress/browsers:node18.12.0-chrome107"
          ),
        },
        concurrentBuildLimit: 100,
      }
    );

    deployProject.addToRolePolicy(
      new aws_iam.PolicyStatement({
        effect: aws_iam.Effect.ALLOW,
        actions: [
          "ssm:Describe*",
          "ssm:Get*",
          "ssm:List*",
          "sts:AssumeRole"
        ],
        resources: ["*"],
      })
    );

    const sourceOutput = new aws_codepipeline.Artifact();

    const sourceAction =
      new aws_codepipeline_actions.CodeStarConnectionsSourceAction({
        actionName: "GetSource",
        owner: commonConfig.GitOwner,
        repo: "collect-frontend",
        branch: stage,
        connectionArn: commonConfig.GitConnectionArn,
        output: sourceOutput,
        codeBuildCloneOutput: true
      });

    const deploy = new aws_codepipeline_actions.CodeBuildAction({
      actionName: "Deploy",
      project: deployProject,
      input: sourceOutput,
      environmentVariables: {
        ENV: {
          type: aws_codebuild.BuildEnvironmentVariableType.PLAINTEXT,
          value: stage,
        },
        DEPLOY_ROLE_ARN: {
          type: aws_codebuild.BuildEnvironmentVariableType.PLAINTEXT,
          value: `arn:aws:iam::${envConfig.awsAccountId}:role/CollectDeployRole`,
        },
      },
    });

    const postDeploy = new aws_codepipeline_actions.CodeBuildAction({
      actionName: "CypressTesting",
      project: testsProject,
      input: sourceOutput,
      executeBatchBuild: true,
      environmentVariables: {
        ENV: {
          type: aws_codebuild.BuildEnvironmentVariableType.PLAINTEXT,
          value: stage, // this may need to be adjusted depends on chosen naming
        }
      },
    });

    const pipeline = new aws_codepipeline.Pipeline(this, "pipeline", {
      pipelineName: `CollectFrontendPipeline-${stage}`,
      enableKeyRotation: true
    });

    pipeline.addStage({
      stageName: "Source",
      actions: [sourceAction],
    });

    pipeline.addStage({
      stageName: "Deploy",
      actions: [deploy],
    });

    pipeline.addStage({
      stageName: "PostDeploy",
      actions: [postDeploy],
    });
  }
}
