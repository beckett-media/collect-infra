export interface ICommonConfig {
  readonly App: string;
  readonly AwsRegion: string;
  readonly AwsPipelineAccountId: string;
  readonly GitConnectionArn: string;
  readonly GitRepository: string;
  readonly GitBranch: string;
  readonly GitOwner: string;
}

const commonConfig: ICommonConfig = {
    App: "collect",
    AwsRegion: "us-east-1",
    AwsPipelineAccountId: "756244784198",
    GitConnectionArn: "arn:aws:codestar-connections:us-east-1:756244784198:connection/101fc724-1e5d-4e49-ae98-ef4e5e7dabc4",
    GitRepository: "collect-infra",
    GitBranch: "main",
    GitOwner: "beckett-media",
}

export default commonConfig;