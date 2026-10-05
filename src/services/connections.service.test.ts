const postApiMtConnectMock = jest.fn();
const getApiMtPublicKeyMock = jest.fn();
const deleteApiMtAccountsByAccountIdMock = jest.fn();
const postApiMtAccountsByAccountIdDisconnectMock = jest.fn();
const clientPostMock = jest.fn();

jest.mock('@/lib/api-client', () => ({
  deleteApiMtAccountsByAccountId: deleteApiMtAccountsByAccountIdMock,
  getApiMtAccounts: jest.fn(),
  getApiMtPublicKey: getApiMtPublicKeyMock,
  getApiTelegramAuthStatus: jest.fn(),
  patchApiMtAccountsByAccountId: jest.fn(),
  postApiMtAccountsByAccountIdDisconnect: postApiMtAccountsByAccountIdDisconnectMock,
  postApiMtConnect: postApiMtConnectMock,
  postApiTelegramAuthDisconnect: jest.fn(),
  postApiTelegramAuthRequestCode: jest.fn(),
  postApiTelegramAuthVerifyCode: jest.fn(),
}));

jest.mock('@/lib/api-client/client.gen', () => ({
  client: {
    post: clientPostMock,
    get: jest.fn(),
  },
}));

jest.mock('@/lib/api-client-setup', () => ({
  initApiClient: jest.fn(),
}));

const encryptMtCredentialsMock = jest.fn();
jest.mock('@/lib/mt-encryption', () => ({
  encryptMtCredentials: encryptMtCredentialsMock,
}));

import { connectionsService } from './connections.service';

describe('connectionsService.connectMt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('always encrypts and uses /api/mt/connect', async () => {
    const credentials = {
      accountNumber: '123456',
      password: 'secret',
      server: 'Exness-MT5Real',
      accountType: 'MT5' as const,
    };

    getApiMtPublicKeyMock.mockResolvedValue({
      data: {
        success: true,
        publicKey: 'runtime-public-key',
        keyId: 'key-id',
        algorithm: 'RSA-OAEP-256',
      },
    });
    encryptMtCredentialsMock.mockResolvedValue('encrypted-payload');
    postApiMtConnectMock.mockResolvedValue({ data: { success: true } });

    const result = await connectionsService.connectMt(credentials);

    expect(getApiMtPublicKeyMock).toHaveBeenCalledWith({
      throwOnError: true,
    });
    expect(encryptMtCredentialsMock).toHaveBeenCalledWith(credentials, 'runtime-public-key');
    expect(postApiMtConnectMock).toHaveBeenCalledWith({
      body: { encrypted: 'encrypted-payload' },
      throwOnError: true,
    });
    expect(clientPostMock).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });
});

describe('connectionsService.disconnectMtAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls dedicated disconnect endpoint', async () => {
    postApiMtAccountsByAccountIdDisconnectMock.mockResolvedValue({
      data: { success: true, message: 'Account disconnected successfully' },
    });

    const result = await connectionsService.disconnectMtAccount('account-id');

    expect(postApiMtAccountsByAccountIdDisconnectMock).toHaveBeenCalledWith({
      path: { accountId: 'account-id' },
      throwOnError: true,
    });
    expect(result).toEqual({ success: true, message: 'Account disconnected successfully' });
  });
});

describe('connectionsService.deleteMtAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends confirmation account number when deleting', async () => {
    deleteApiMtAccountsByAccountIdMock.mockResolvedValue({
      data: { success: true, message: 'Account deleted successfully' },
    });

    const result = await connectionsService.deleteMtAccount('account-id', '260292237');

    expect(deleteApiMtAccountsByAccountIdMock).toHaveBeenCalledWith({
      path: { accountId: 'account-id' },
      body: { confirmationAccountNumber: '260292237' },
      throwOnError: true,
    });
    expect(result).toEqual({ success: true, message: 'Account deleted successfully' });
  });
});
