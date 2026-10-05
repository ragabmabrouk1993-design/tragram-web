import { client } from '@/lib/api-client/client.gen';
import { accountDeletionService } from './account-deletion.service';

jest.mock('@/lib/api-client-setup', () => ({
  initApiClient: jest.fn(),
}));

jest.mock('@/lib/api-client/client.gen', () => ({
  client: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

describe('accountDeletionService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('keeps idempotency and receipt credentials in headers', async () => {
    (client.post as jest.Mock).mockResolvedValue({
      data: { requestId: 'request-1', status: 'SCHEDULED', success: true },
    });
    await accountDeletionService.confirm({
      verificationSessionToken: 'session-token',
      otp: '123456',
      mode: 'SCHEDULED',
      acknowledgements: {
        brokerControlUnderstood: true,
        retentionUnderstood: true,
        prepaidAccessUnderstood: true,
      },
      idempotencyKey: 'idempotency-key',
    });
    expect(client.post).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({ 'Idempotency-Key': 'idempotency-key' }),
      })
    );
    expect((client.post as jest.Mock).mock.calls[0][0].url).not.toContain('session-token');
  });

  it('uses the receipt header for status and cancellation without query secrets', async () => {
    (client.get as jest.Mock).mockResolvedValue({ data: { requestId: 'request-1', status: 'SCHEDULED' } });
    await accountDeletionService.getStatus('request-1', 'receipt-token');
    expect(client.get).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Account-Deletion-Receipt': 'receipt-token' }),
      })
    );
    expect((client.get as jest.Mock).mock.calls[0][0].url).not.toContain('receipt-token');
  });
});
