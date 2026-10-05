import { createContactFormSchema } from './contact-form-schema';
const general = {firstName:'Example',lastName:'User',email:'example@example.com',message:'Example support message',type:'GENERAL_INQUIRY'};
test('general inquiry accepts omitted phone but not invalid supplied input',()=>{
 const schema=createContactFormSchema('en');
 expect(schema.safeParse(general).success).toBe(true);
 expect(schema.safeParse({...general,phone:'12'}).success).toBe(false);
});
test('deletion support still requires action, problem and every acknowledgement',()=>{
 const schema=createContactFormSchema('en');
 expect(schema.safeParse({...general,type:'ACCOUNT_DELETION_ACCESS'}).success).toBe(false);
 const valid={...general,type:'ACCOUNT_DELETION_ACCESS',requestedAction:'DELETE_ACCOUNT',requestedMode:'IMMEDIATE',accessProblem:'OTHER',brokerControlUnderstood:true,retentionUnderstood:true,prepaidAccessUnderstood:true};
 expect(schema.safeParse(valid).success).toBe(true);
 for(const field of ['brokerControlUnderstood','retentionUnderstood','prepaidAccessUnderstood'])expect(schema.safeParse({...valid,[field]:false}).success).toBe(false);
});
test('Arabic errors are localized',()=>{
 const result=createContactFormSchema('ar').safeParse({...general,firstName:''});
 expect(result.success).toBe(false);
 if(!result.success)expect(result.error.issues[0].message).toMatch(/[\u0600-\u06ff]/);
});
