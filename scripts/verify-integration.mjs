import {spawn} from 'node:child_process';
import {mkdir,writeFile,appendFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
if(process.argv.includes('--help')){
  console.log('Runs local integration verification: Java discovery, Playwright browser installation, Firestore rules, setup-screen browser tests, and authenticated emulator workflows. Writes .verification/summary.json and individual logs. Uses demo-ba-booze only; does not deploy. Pass --workflows-only to rerun just authenticated workflows with existing Java/browser installations.');
  process.exit(0);
}
const workflowsOnly=process.argv.includes('--workflows-only');
const directory=join(root,'.verification');
await mkdir(directory,{recursive:true});
const report={startedAt:new Date().toISOString(),node:process.version,projectId:'demo-ba-booze',scope:workflowsOnly?'authenticated-workflows':'full',steps:[]};
const env={...process.env,CI:'true',E2E_EMULATORS:'false',VITE_FIREBASE_API_KEY:'placeholder',VITE_FIREBASE_AUTH_DOMAIN:'localhost',VITE_FIREBASE_PROJECT_ID:'replace-project',VITE_FIREBASE_APP_ID:'placeholder',VITE_USE_EMULATORS:'false'};
const persist=()=>writeFile(join(directory,'summary.json'),JSON.stringify(report,null,2)+'\n');
await persist();
async function step(name,command,args){
  const log=join(directory,name+'.log');
  await writeFile(log,'');
  console.log(`\nRunning ${name}…`);
  const entry={name,status:'running',startedAt:new Date().toISOString(),log:'.verification/'+name+'.log'};
  report.steps.push(entry);
  await persist();
  let writes=Promise.resolve();
  const result=await new Promise(resolve=>{
    const child=spawn(command,args,{cwd:root,env,stdio:['ignore','pipe','pipe']});
    function output(chunk){process.stdout.write(chunk);writes=writes.then(()=>appendFile(log,chunk));}
    child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
    child.stdout.on('data',output);child.stderr.on('data',output);
    child.on('error',error=>{output(error.message+'\n');resolve({code:1,signal:null})});
    child.on('close',(code,signal)=>resolve({code:code??1,signal}));
  });
  await writes;
  Object.assign(entry,{status:result.code===0?'passed':'failed',exitCode:result.code,signal:result.signal,finishedAt:new Date().toISOString()});
  await persist();
  return result.code===0;
}
async function skip(name,reason){report.steps.push({name,status:'skipped',reason});await persist();}
if(workflowsOnly){
  await step('authenticated-workflows','npm',['run','test:e2e:emulators']);
}else{
const java=await step('java','java',['--version']);
const browsers=await step('browser-install','npx',['--no-install','playwright','install','chromium','webkit']);
if(java)await step('firestore-rules','npm',['run','test:rules']);
else await skip('firestore-rules','A discoverable Java 21+ JDK is required.');
if(browsers)await step('browser-smoke','npm',['run','test:e2e']);
else await skip('browser-smoke','Playwright browser installation failed.');
if(java&&browsers)await step('authenticated-workflows','npm',['run','test:e2e:emulators']);
else await skip('authenticated-workflows','Java and Playwright browsers are required.');
}
report.finishedAt=new Date().toISOString();
report.passed=report.steps.every(step=>step.status==='passed');
await persist();
console.log('\nIntegration results:');
for(const result of report.steps)console.log(`  ${result.name}: ${result.status}`);
console.log('Saved .verification/summary.json and individual logs.');
process.exitCode=report.passed?0:1;
