export function selectCommercialCopy<T>(billingDisabled: boolean, copy: { freeBasic: T; standardBilling: T }): T {
  return billingDisabled ? copy.freeBasic : copy.standardBilling;
}

export const currentAccessCopy = {
  en: 'Tragram currently provides Free Basic access. Paid purchases and upgrades are not available at this time. Your account shows the features and limits available to you.',
  ar: 'يوفر Tragram حاليًا وصول Basic المجاني. عمليات الشراء والترقية المدفوعة غير متاحة في الوقت الحالي. يعرض حسابك الميزات والحدود المتاحة لك.',
} as const;
