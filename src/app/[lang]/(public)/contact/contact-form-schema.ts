import { z } from 'zod';

export function createContactFormSchema(locale: string) {
 const ar=locale.startsWith('ar');
 const required=ar?'هذا الحقل مطلوب':'Required';
 const tooLong=ar?'القيمة طويلة جدًا':'Too long';
 return z.object({
  firstName: z.string().trim().min(1, required).max(80, tooLong),
  lastName: z.string().trim().min(1, required).max(80, tooLong),
  phone: z.string().trim().refine(value => !value || value.length >= 5, ar ? 'رقم الهاتف غير صالح' : 'Invalid phone number').max(30, tooLong).optional(),
  email: z.string().trim().email((ar ? 'البريد الإلكتروني غير صالح' : 'Invalid email address')).max(160, tooLong),
  message: z.string().trim().min(10, (ar ? 'الرسالة قصيرة جدًا' : 'Message is too short')).max(5000, tooLong),
  type: z.enum(["GENERAL_INQUIRY", "ACCOUNT_DELETION_ACCESS"]),
  requestedAction: z.enum(["DELETE_ACCOUNT", "CANCEL_SCHEDULED_DELETION"]).optional(),
  requestedMode: z.enum(["IMMEDIATE", "SCHEDULED"]).optional(),
  accessProblem: z
    .enum([
      "PASSWORD_UNAVAILABLE",
      "TELEGRAM_CODE_NOT_RECEIVED",
      "OTHER",
    ])
    .optional(),
  brokerControlUnderstood: z.boolean().optional(),
  retentionUnderstood: z.boolean().optional(),
  prepaidAccessUnderstood: z.boolean().optional(),
  website: z.string().max(200).optional(),
}).superRefine((values, context) => {
  if (values.type !== "ACCOUNT_DELETION_ACCESS") return;
  if (!values.requestedAction) {
    context.addIssue({ code: "custom", path: ["requestedAction"], message: required });
  }
  if (values.requestedAction === "DELETE_ACCOUNT" && !values.requestedMode) {
    context.addIssue({ code: "custom", path: ["requestedMode"], message: required });
  }
  if (!values.accessProblem) {
    context.addIssue({ code: "custom", path: ["accessProblem"], message: required });
  }
  for (const field of ["brokerControlUnderstood", "retentionUnderstood", "prepaidAccessUnderstood"] as const) {
    if (values[field] !== true) {
      context.addIssue({ code: "custom", path: [field], message: required });
    }
  }
});


}
export type ContactFormValues = z.infer<ReturnType<typeof createContactFormSchema>>;
