import { initWowReveal } from '../app/[lang]/marketing/runtime/init-wow';

test('reveal enhancement never hides offscreen form content and restores prior style', () => {
 const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
 const previousObserver = Object.getOwnPropertyDescriptor(globalThis, 'IntersectionObserver');
 const element = {style:{visibility:''},classList:{add:jest.fn()},dataset:{}};
 Object.defineProperty(globalThis,'document',{configurable:true,value:{querySelectorAll:()=>[element]}});
 Object.defineProperty(globalThis,'IntersectionObserver',{configurable:true,value:class {observe() {} disconnect() {} }});
 try {
  const cleanup=initWowReveal();
  expect(element.style.visibility).toBe('visible');
  cleanup();
  expect(element.style.visibility).toBe('');
 } finally {
  if(previousDocument)Object.defineProperty(globalThis,'document',previousDocument);else Reflect.deleteProperty(globalThis,'document');
  if(previousObserver)Object.defineProperty(globalThis,'IntersectionObserver',previousObserver);else Reflect.deleteProperty(globalThis,'IntersectionObserver');
 }
});
