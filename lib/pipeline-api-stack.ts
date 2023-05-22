import * as cdk from "aws-cdk-lib";
import {
  Stack,
  aws_codebuild,
  aws_codepipeline,
  aws_codepipeline_actions,
  aws_events,
  aws_events_targets,
  aws_iam,
  aws_lambda,
  aws_s3
} from "aws-cdk-lib";
import { Construct } from "constructs";
import environmentConfig, {
  IEnvironmentConfig
} from "../util/environment-config";


interface ApiPipelineStackStackProps extends cdk.StackProps {
  stage: "dev" | "preprod" | "production";
}

export class ApiPipelineStack extends Stack {
  constructor(
    scope: Construct,
    id: string,
    props: ApiPipelineStackStackProps,
  ) {
    super(scope, id, props);

    const { stage } = props;
    const envConfig: IEnvironmentConfig = environmentConfig(stage);

    const deployProject = new aws_codebuild.PipelineProject(
      this,
      "pipelineDeployProject",
      {
        projectName: `collect-api-deploy-${stage}`,
        buildSpec: aws_codebuild.BuildSpec.fromSourceFilename(
          "buildspec.yml"
        ),
        environment: {
          computeType: aws_codebuild.ComputeType.LARGE,
          buildImage: aws_codebuild.LinuxArmBuildImage.AMAZON_LINUX_2_STANDARD_2_0,
          privileged: true,
        },
        cache: aws_codebuild.Cache.bucket(new aws_s3.Bucket(this, "CacheBucket"))
      }
    );

    // const testsProject = new aws_codebuild.PipelineProject(
    //   this,
    //   "pipelineTestsProject",
    //   {
    //     projectName: `collect-api-tests-${stage}`,
    //     buildSpec: aws_codebuild.BuildSpec.fromSourceFilename(
    //       "cypress/buildspec.yml"
    //     ),
    //     environment: {
    //       computeType: aws_codebuild.ComputeType.SMALL,
    //       buildImage: aws_codebuild.LinuxBuildImage.fromDockerRegistry(
    //         "public.ecr.aws/cypress-io/cypress/browsers:node18.12.0-chrome107"
    //       ),
    //     },
    //     concurrentBuildLimit: 100,
    //   }
    // );

    deployProject.addToRolePolicy(
      new aws_iam.PolicyStatement({
        effect: aws_iam.Effect.ALLOW,
        actions: [
          "ssm:Describe*",
          "ssm:Get*",
          "ssm:List*",
          "sts:AssumeRole",
          "ecr:*"
        ],
        resources: ["*"],
      })
    );

    const sourceOutput = new aws_codepipeline.Artifact();

    const sourceAction =
      new aws_codepipeline_actions.CodeStarConnectionsSourceAction({
        actionName: "GetSource",
        owner: "bkdefault",
        repo: "collect-api",
        branch: stage,
        connectionArn: "arn:aws:codestar-connections:us-west-2:756244784198:connection/f7205033-d3e2-42a6-b223-a703f3785807",
        output: sourceOutput,
        codeBuildCloneOutput: true,
      });

    const deploy = new aws_codepipeline_actions.CodeBuildAction({
      actionName: "Deploy",
      project: deployProject,
      input: sourceOutput,
      environmentVariables: {
        RAILS_ENV: {
          type: aws_codebuild.BuildEnvironmentVariableType.PLAINTEXT,
          value: stage === "dev" ? "development" : stage,
        },
        DEPLOY_ROLE_ARN: {
          type: aws_codebuild.BuildEnvironmentVariableType.PLAINTEXT,
          value: `arn:aws:iam::${envConfig.awsAccountId}:role/CollectDeployRole`,
        },
      },
    });

    // const postDeploy = new aws_codepipeline_actions.CodeBuildAction({
    //   actionName: "CypressTesting",
    //   project: testsProject,
    //   input: sourceOutput,
    //   executeBatchBuild: true,
    //   environmentVariables: {
    //     ENV: {
    //       type: aws_codebuild.BuildEnvironmentVariableType.PLAINTEXT,
    //       value: stage, // this may need to be adjusted depends on chosen naming
    //     }
    //   },
    // });

    const pipeline = new aws_codepipeline.Pipeline(this, "pipeline", {
      pipelineName: `CollectApiPipeline-${stage}`,
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

    // pipeline.addStage({
    //   stageName: "PostDeploy",
    //   actions: [postDeploy],
    // });

    const pipelineNotificationLambda = aws_lambda.Function.fromFunctionArn(
      this,
      "pipeNotificationLambda",
      "arn:aws:lambda:us-east-1:756244784198:function:pipeline-notification"
    )

    const alertEventRule = new aws_events.Rule(
      this,
      "PipelineAlertRule",
      {
        eventPattern: {
          detailType: ["CodePipeline Pipeline Execution State Change"],
          detail: {
            state: ["STARTED", "SUCCEEDED", "FAILED"],
            pipeline: [pipeline.pipelineName],
          },
          source: ["aws.codepipeline"],
        },
      }
    );

    alertEventRule.addTarget(
      new aws_events_targets.LambdaFunction(pipelineNotificationLambda, {})
    );
  }
}
