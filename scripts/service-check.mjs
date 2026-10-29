import {registerHooks} from 'node:module';
import {existsSync,readFileSync} from 'node:fs';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
// Uses installed packages normally; the optional local compiler path supports this offline workspace.
const tsPath=process.env.LOCAL_TYPESCRIPT_PATH;
const zodPath=process.env.LOCAL_ZOD_PATH;
const ts=tsPath?(await import(pathToFileURL(tsPath).href)).default:(await import('typescript')).default;
const adapter=pathToFileURL(resolve('tests/native/memory-firestore.mjs')).href;
registerHooks({
 resolve(specifier,context,next){
  if(specifier==='firebase/firestore')return {url:adapter,shortCircuit:true};
  if(specifier==='zod'&&zodPath)return {url:pathToFileURL(zodPath).href,shortCircuit:true};
  if(specifier==='./firebase'&&context.parentURL?.endsWith('/src/lib/data.ts'))return {url:'data:text/javascript,export const db={};',shortCircuit:true};
  if(specifier.startsWith('.')&&context.parentURL?.endsWith('.ts')){const url=new URL(specifier+'.ts',context.parentURL);if(existsSync(fileURLToPath(url)))return {url:url.href,shortCircuit:true}}
  return next(specifier,context);
 },
 load(url,context,next){if(url.endsWith('.ts'))return {format:'module',source:ts.transpileModule(readFileSync(fileURLToPath(url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText,shortCircuit:true};return next(url,context)}
});
Object.defineProperty(globalThis,'navigator',{value:{onLine:true},configurable:true});
await import('../tests/native/services.mjs');
