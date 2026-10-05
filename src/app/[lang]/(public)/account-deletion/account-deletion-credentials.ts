import { isAllowedPhoneNumber, isValidPhoneNumber } from '@/lib/phone';
import type { CountryAccessPolicy } from '@/lib/restricted-countries';

export type AccountDeletionCredentialMessages = {
  phoneRequired: string;
  phoneInvalid: string;
  phoneNotSupported: string;
  passwordMin: string;
};

export type AccountDeletionCredentialErrors = {
  phone?: string;
  password?: string;
};

export const validateAccountDeletionCredentials = ({
  phoneNumber,
  password,
  messages,
  countryPolicy,
}: {
  phoneNumber: string;
  password: string;
  messages: AccountDeletionCredentialMessages;
  countryPolicy?: Pick<CountryAccessPolicy, 'allowedCountries' | 'restrictedCountries'> | null;
}): AccountDeletionCredentialErrors => {
  const errors: AccountDeletionCredentialErrors = {};
  const normalizedPhone = phoneNumber.trim();

  if (!normalizedPhone) {
    errors.phone = messages.phoneRequired;
  } else if (!isValidPhoneNumber(normalizedPhone)) {
    errors.phone = messages.phoneInvalid;
  } else if (!isAllowedPhoneNumber(normalizedPhone, countryPolicy)) {
    errors.phone = messages.phoneNotSupported;
  }

  if (password.length < 6) {
    errors.password = messages.passwordMin;
  }

  return errors;
};
