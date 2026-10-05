import { optionalPhoneSchema } from './contact-form';

describe('optional support phone', () => {
  test.each([undefined, '', '   ', '+201553979684'])('accepts %p', value => {
    expect(optionalPhoneSchema.safeParse(value).success).toBe(true);
  });
  test.each(['12', '1'.repeat(31)])('rejects malformed supplied value %p', value => {
    expect(optionalPhoneSchema.safeParse(value).success).toBe(false);
  });
});
