import { encryptMtCredentials } from './mt-encryption';
import { constants, generateKeyPairSync, privateDecrypt } from 'crypto';

function createRsaKeyPair() {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  return { publicKey, privateKey };
}

function decryptPayload(encryptedBase64: string, privateKey: string): string {
  return privateDecrypt(
    {
      key: privateKey,
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    Buffer.from(encryptedBase64, 'base64')
  ).toString('utf8');
}

describe('encryptMtCredentials', () => {
  const originalWindow = globalThis.window;
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.window = originalWindow;
    globalThis.fetch = originalFetch;
  });

  it('throws when public key is missing', async () => {
    await expect(
      encryptMtCredentials(
        {
          accountNumber: '123456',
          password: 'secret',
          server: 'Exness-MT5Real',
          accountType: 'MT5',
        },
        ''
      )
    ).rejects.toThrow('MT RSA public key is not configured');
  });

  it('encrypts with the supplied runtime public key in the browser', async () => {
    const runtimeKey = createRsaKeyPair();

    globalThis.window = {
      crypto: globalThis.crypto,
    } as Window & typeof globalThis;
    globalThis.fetch = jest.fn();

    const encrypted = await encryptMtCredentials(
      {
        accountNumber: '123456',
        password: 'secret',
        server: 'Exness-MT5Real',
        accountType: 'MT5',
      },
      runtimeKey.publicKey
    );

    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(JSON.parse(decryptPayload(encrypted, runtimeKey.privateKey))).toMatchObject({
      accountNumber: '123456',
      accountType: 'MT5',
      server: 'Exness-MT5Real',
    });
  });

  it('encrypts with the supplied runtime public key in Node', async () => {
    const runtimeKey = createRsaKeyPair();

    const encrypted = await encryptMtCredentials(
      {
        accountNumber: '123456',
        password: 'secret',
        server: 'Exness-MT5Real',
        accountType: 'MT5',
      },
      runtimeKey.publicKey
    );

    expect(JSON.parse(decryptPayload(encrypted, runtimeKey.privateKey))).toMatchObject({
      accountNumber: '123456',
      accountType: 'MT5',
      server: 'Exness-MT5Real',
    });
  });
});
