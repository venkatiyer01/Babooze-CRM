// Test adapter only. This is NOT a Firestore security or emulator substitute.
export const store=new Map();let sequence=0;
export class Timestamp{constructor(ms){this.ms=ms}static fromDate(d){return new Timestamp(+d)}static fromMillis(ms){return new Timestamp(ms)}toDate(){return new Date(this.ms)}toMillis(){return this.ms}}
export const serverTimestamp=()=>Timestamp.fromMillis(Date.now());
export const collection=(_db,name)=>({name});
export function doc(dbOrCollection,name,id){const path=typeof dbOrCollection.name==='string'&&name===undefined?dbOrCollection.name+'/'+(++sequence):name+'/'+id;return {path,id:path.split('/')[1]}}
const snapshot=ref=>({ref,id:ref.path.split('/')[1],exists:()=>store.has(ref.path),data:()=>store.get(ref.path)});
export const getDocFromServer=async ref=>snapshot(ref);
export const where=(field,op,value)=>({field,op,value});
export const limit=n=>({limit:n});
export const orderBy=(field,direction)=>({order:field,direction});
export const startAfter=cursor=>({cursor});
export const query=(col,...filters)=>({col,filters});
export async function getDocsFromServer(q){let rows=[...store.keys()].filter(p=>p.startsWith(q.col.name+'/')).map(path=>snapshot({path}));for(const f of q.filters){if(f.field)rows=rows.filter(r=>f.op==='=='?r.data()[f.field]===f.value:true);if(f.limit)rows=rows.slice(0,f.limit)}return {docs:rows,size:rows.length,empty:!rows.length}}
function commit(ops){for(const [type,ref,data,options] of ops){if(type==='delete')store.delete(ref.path);else store.set(ref.path,(options?.merge||type==='update')?{...store.get(ref.path),...data}:data)}}
function transaction(){const ops=[];return {ops,get:async ref=>snapshot(ref),set:(r,d,o)=>ops.push(['set',r,d,o]),update:(r,d)=>ops.push(['update',r,d]),delete:r=>ops.push(['delete',r])}}
export async function runTransaction(_db,fn){const tx=transaction();const result=await fn(tx);commit(tx.ops);return result}
export function writeBatch(){const tx=transaction();return {...tx,commit:async()=>commit(tx.ops)}}
