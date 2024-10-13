import { IoTCustomAuthorizerHandler, IoTCustomAuthorizerResult, PolicyDocument } from "aws-lambda";

const VALID_USERNAME = 'testuser';
const VALID_PASSWORD = 'password';
const VALID_CLIENT_ID = 'tenant-id-goes-here/site-id-goes-here';

export const handler: IoTCustomAuthorizerHandler = async (event, context, _callback): Promise<IoTCustomAuthorizerResult> => {
  // Event data passed to Lambda function
  var event_str = JSON.stringify(event);
  console.log('Complete event:' + event_str);

  // Read protocolData from the event json passed to Lambda function
  var protocolData = event.protocolData;
  console.log('protocolData value---> ' + protocolData);

  // Get the dynamic account ID from function's ARN to be used
  // as full resource for IAM policy
  var accountId = context.invokedFunctionArn.split(":")[4];
  console.log("accountId: " + accountId);

  // Get the dynamic region from function's ARN to be used
  // as full resource for IAM policy
  var awsRegion = context.invokedFunctionArn.split(":")[3];
  console.log("awsRegion: " + awsRegion);

  // protocolData data will be undefined if testing is done via CLI.
  if (!event.protocolData.mqtt) {
    return generateDenyResponse();
  }

  var mqttData = event.protocolData.mqtt!;
  console.log("clientId: " + mqttData.clientId);

  const password = Buffer.from(mqttData.password!, 'base64').toString('ascii');
  if (mqttData.username !== VALID_USERNAME || password !== VALID_PASSWORD || mqttData.clientId !== VALID_CLIENT_ID) {
    return generateDenyResponse();
  }

  return generateAuthResponse(accountId, awsRegion, mqttData.clientId);
};

// Helper function to generate the authorization IAM response.
const generateAuthResponse = function (accountId: string, awsRegion: string, clientId: string): IoTCustomAuthorizerResult {
  const policyDocument: PolicyDocument = {
    Version: '2012-10-17',
    Statement: [
      {
        Action: 'iot:Connect',
        Effect: 'Allow',
        Resource: `arn:aws:iot:${awsRegion}:${accountId}:client/${clientId}`,
      },
      {
        Action: 'iot:Publish',
        Effect: 'Allow',
        Resource: `arn:aws:iot:${awsRegion}:${accountId}:topic/${clientId}/*`,
      }
    ],
  };

  const authResponse: IoTCustomAuthorizerResult = {
    isAuthenticated: true,
    principalId: 'principalId',
    policyDocuments: [policyDocument],
    disconnectAfterInSeconds: 3600,
    refreshAfterInSeconds: 300,
  };

  console.log('authResponse --> ' + JSON.stringify(authResponse));
  return authResponse;
}

const generateDenyResponse = function (): IoTCustomAuthorizerResult {
  const authResponse: IoTCustomAuthorizerResult = {
    isAuthenticated: false,
    principalId: 'principalId',
    policyDocuments: [],
    disconnectAfterInSeconds: 3600,
    refreshAfterInSeconds: 300,
  };

  console.log('authResponse --> ' + JSON.stringify(authResponse));
  return authResponse;
}