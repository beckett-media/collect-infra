## Create a new AWS Sub Account
Do this via console

## Get account number
`$ aws sts get-caller-identity --profile noxx-staging`

## Bootstrap an environment
`$ cdk bootstrap aws://602537455821/us-east-1 --profile noxx-staging`