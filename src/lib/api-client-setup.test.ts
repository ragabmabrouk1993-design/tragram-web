import { isPublicAuthPath } from './api-client-paths';

describe('API auth path classification', () => {
  test('treats the signup fingerprint challenge as a public auth endpoint', () => {
    expect(isPublicAuthPath('/api/auth/fingerprint-challenge')).toBe(true);
  });
});
