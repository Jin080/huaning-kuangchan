import { Injectable } from '@nestjs/common';
import {
  randomBytes,
  scrypt as scryptCallback,
  ScryptOptions,
  timingSafeEqual,
} from 'crypto';

const KEY_LENGTH = 64;
const DEFAULT_COST = 16_384;
const DEFAULT_BLOCK_SIZE = 8;
const DEFAULT_PARALLELIZATION = 1;

@Injectable()
export class PasswordService {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16).toString('base64url');
    const key = (await scrypt(password, salt, KEY_LENGTH, {
      N: DEFAULT_COST,
      r: DEFAULT_BLOCK_SIZE,
      p: DEFAULT_PARALLELIZATION,
    })) as Buffer;

    return [
      'scrypt',
      DEFAULT_COST,
      DEFAULT_BLOCK_SIZE,
      DEFAULT_PARALLELIZATION,
      salt,
      key.toString('base64'),
    ].join(':');
  }

  async verify(password: string, passwordHash: string): Promise<boolean> {
    const parts = passwordHash.split(':');

    if (parts.length !== 6 || parts[0] !== 'scrypt') {
      return false;
    }

    const [, cost, blockSize, parallelization, salt, expectedKey] = parts;
    const expected = Buffer.from(expectedKey, 'base64');
    const actual = (await scrypt(password, salt, expected.length, {
      N: Number(cost),
      r: Number(blockSize),
      p: Number(parallelization),
    })) as Buffer;

    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    );
  }
}

function scrypt(
  password: string,
  salt: string,
  keyLength: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keyLength, options, (error, key) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(key);
    });
  });
}
