import 'dotenv/config';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

const userPoolId = process.env.AWS_COGNITO_USER_POOL_ID!;
const clientId = process.env.AWS_COGNITO_CLIENT_ID!;

if (!userPoolId || !clientId) {
  throw new Error(
    'Missing required env vars: AWS_COGNITO_USER_POOL_ID, AWS_COGNITO_CLIENT_ID',
  );
}

export const cognitoVerifier = CognitoJwtVerifier.create({
  userPoolId,
  tokenUse: null,
  clientId,
});
