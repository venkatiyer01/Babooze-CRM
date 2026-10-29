import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const assets=(await readdir('dist/assets')).map(f=>'/assets/'+f).filter(f=>/\.(js|css)$/.test(f));
const id=createHash('sha256').update(assets.join(',')).digest('hex').slice(0,12);
const source=await readFile('public/sw.js','utf8');
await writeFile('dist/sw.js',source.replace('ba-booze-shell-dev','ba-booze-shell-'+id).replace("const ASSETS=[","const ASSETS=["+assets.map(a=>JSON.stringify(a)).join(',')+','));
console.log(`PWA shell: ${assets.length} built assets, cache ${id}`);
