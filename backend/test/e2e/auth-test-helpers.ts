import { PasswordService } from '../../src/auth/password.service';

const E2E_TEST_PASSWORD = 'e2e-test-password';
const passwordService = new PasswordService();

export function hashE2ePassword(): Promise<string> {
  return passwordService.hash(E2E_TEST_PASSWORD);
}

export async function loginAs(
  baseUrl: string,
  username: string,
): Promise<Record<string, string>> {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      password: E2E_TEST_PASSWORD,
    }),
  });
  expect(response.status).toBe(201);

  const body = (await response.json()) as { accessToken?: string };
  expect(typeof body.accessToken).toBe('string');

  return {
    Authorization: `Bearer ${body.accessToken}`,
  };
}
