import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const manifest=JSON.parse(readFileSync('public/manifest.webmanifest','utf8'));
assert.equal(manifest.name,'Ba-booze CRM');assert.equal(manifest.short_name,'Ba-booze');assert.equal(manifest.display,'standalone');
for(const icon of manifest.icons){const png=readFileSync('public'+icon.src);assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');const [width,height]=icon.sizes.split('x').map(Number);assert.equal(png.readUInt32BE(16),width);assert.equal(png.readUInt32BE(20),height)}
const sw=readFileSync('public/sw.js','utf8');assert.match(sw,/url.origin!==self.location.origin/);assert.match(sw,/ASSETS.includes/);assert.doesNotMatch(sw,/push|showNotification|requestPermission/);
const firebase=JSON.parse(readFileSync('firebase.json','utf8'));assert.equal(firebase.hosting.rewrites[0].destination,'/index.html');assert.ok(!firebase.functions);
const indexes=JSON.parse(readFileSync('firestore.indexes.json','utf8'));assert.ok(indexes.indexes.length>0);
for(const file of ['.env.example','firestore.rules','src/lib/business.ts'])assert.ok(existsSync(file));
console.log(`Static checks passed: manifest, ${manifest.icons.length} PNG icons, static-only service worker, SPA hosting, ${indexes.indexes.length} indexes and placeholder configuration.`);
