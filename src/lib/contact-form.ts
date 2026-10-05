import { z } from 'zod';

// The support API accepts omitted or blank phone numbers. Validate only a
// supplied value; do not weaken account-deletion verification requirements.
export const optionalPhoneSchema = z.string().trim().refine(
  value => value === '' || (value.length >= 5 && value.length <= 30),
  'Invalid phone number',
).optional();
