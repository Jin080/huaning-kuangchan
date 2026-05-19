import { Injectable } from '@nestjs/common';

import { createHmac, timingSafeEqual } from 'crypto';

export interface AuthTokenPayload {
  sub: string;
  role: string;
  iat: number;
  exp: number;
}

const DEFAULT_EXPIRES_IN_SECONDS = 60 * 60 * 8;

@Injectable()
export class JwtService {
  sign(payload: Pick<AuthTokenPayload, 'sub' | 'role'>): string {
    const now = Math.floor(Date.now() / 1000);
    const fullPayload: AuthTokenPayload = {
      ...payload,
      iat: now,
      exp: now + DEFAULT_EXPIRES_IN_SECONDS,
    };
    const encodedHeader = base64UrlEncode(
      JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
    );
    const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
    const signature = this.signData(`${encodedHeader}.${encodedPayload}`);

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  verify(token: string): AuthTokenPayload | null {
    const parts = token.split('.');

    if (parts.length !== 3) {
      return null;
    }

    const [encodedHeader, encodedPayload, signature] = parts;
    const expectedSignature = this.signData(`${encodedHeader}.${encodedPayload}`);

    if (!safeEqual(signature, expectedSignature)) {
      return null;
    }

    const payload = parsePayload(encodedPayload);

    if (!payload || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  }

  private signData(data: string): string {
    return createHmac('sha256', getSecret()).update(data).digest('base64url');
  }
}

function getSecret(): string {
  return process.env.JWT_SECRET ?? 'huaning-dev-jwt-secret-change-me';
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value).toString('base64url');
}

function parsePayload(encodedPayload: string): AuthTokenPayload | null {
  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8'),
    ) as Partial<AuthTokenPayload>;

    if (
      typeof payload.sub !== 'string' ||
      typeof payload.role !== 'string' ||
      typeof payload.iat !== 'number' ||
      typeof payload.exp !== 'number'
    ) {
      return null;
    }

    return payload as AuthTokenPayload;
  } catch {
    return null;
  }
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}
