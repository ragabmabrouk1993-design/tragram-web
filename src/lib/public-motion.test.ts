import { initTextAnimeStyleThree } from '@/app/[lang]/marketing/runtime/init-text-anime';
test('reduced motion returns before reading or splitting the document', () => {
 const previous = Object.getOwnPropertyDescriptor(globalThis,'window');
 Object.defineProperty(globalThis,'window',{configurable:true,value:{matchMedia:()=>({matches:true})}});
 try { expect(()=>initTextAnimeStyleThree()()).not.toThrow(); }
 finally { if(previous)Object.defineProperty(globalThis,'window',previous);else Reflect.deleteProperty(globalThis,'window'); }
});
