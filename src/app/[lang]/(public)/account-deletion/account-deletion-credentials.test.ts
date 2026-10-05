import { validateAccountDeletionCredentials } from './account-deletion-credentials';

const messages = {
  phoneRequired: 'Phone number is required',
  phoneInvalid: 'Enter a valid phone number',
  phoneNotSupported: 'Region not supported',
  passwordMin: 'Password must be at least 6 characters',
};

describe('account deletion credential validation', () => {
  it('accepts the same E.164 credential shape used by login', () => {
    expect(
      validateAccountDeletionCredentials({
        phoneNumber: '+905314996328',
        password: 'SecurePass123!',
        messages,
      })
    ).toEqual({});
  });

  it('reports field-level errors before attempting Telegram delivery', () => {
    expect(
      validateAccountDeletionCredentials({
        phoneNumber: '',
        password: 'short',
        messages,
      })
    ).toEqual({
      phone: 'Phone number is required',
      password: 'Password must be at least 6 characters',
    });
  });

  it('rejects an invalid phone without sending a request', () => {
    expect(
      validateAccountDeletionCredentials({
        phoneNumber: '+900',
        password: 'SecurePass123!',
        messages,
      })
    ).toEqual({ phone: 'Enter a valid phone number' });
  });
});
