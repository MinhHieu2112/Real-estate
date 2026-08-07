import { cognitoVerifier } from './cognito-jwt.verifier';
import { Socket } from 'socket.io';

export interface WsUser {
  sub: string;
  role: string;
}

/**
 * Verify JWT for WebSocket connections.
 * Expects token in:
 *   - client.handshake.auth.token  (preferred)
 *   - client.handshake.headers.authorization (Bearer ...)
 *
 * Returns verified user or null on failure.
 */
export async function verifyWsToken(client: Socket): Promise<WsUser | null> {
  const authToken =
    (client.handshake.auth?.token as string) ||
    (client.handshake.headers?.authorization as string)?.replace(
      /^Bearer\s+/i,
      '',
    );

  if (!authToken) return null;

  try {
    const payload = await cognitoVerifier.verify(authToken);
    const customRole = payload['custom:role'];
    const cognitoGroups = payload['cognito:groups'];

    let role: string | undefined =
      typeof customRole === 'string'
        ? customRole
        : Array.isArray(cognitoGroups) && cognitoGroups.length > 0
          ? String(cognitoGroups[0])
          : undefined;

    if (!role) {
      const headerRole = client.handshake.headers?.['x-user-role'] as string;
      if (
        headerRole &&
        ['manager', 'tenant'].includes(headerRole.toLowerCase())
      ) {
        role = headerRole.toLowerCase();
      }
    }

    return {
      sub: payload.sub,
      role: (role || 'tenant').toLowerCase(),
    };
  } catch {
    return null;
  }
}
