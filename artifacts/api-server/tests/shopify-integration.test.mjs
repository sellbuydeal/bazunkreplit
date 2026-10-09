import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
const {build} = createRequire(import.meta.url)('esbuild');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('Shopify preview → seller selection → transaction → source sync', async () => {
 const dir = await mkdtemp(path.join(tmpdir(), 'shopify-integration-'));
 const mocks = {
  express: 'export const Router=()=>({post:(p,f)=>globalThis.shopifyTest.routes.set(p,f),get(){}});',
  '@workspace/db': 'export const db={execute:q=>globalThis.shopifyTest.execute(q),transaction:f=>globalThis.shopifyTest.transaction(f)};',
  'drizzle-orm': 'export const sql=(strings,...values)=>({text:strings.join("?"),values});',
  '../lib/logger.js': 'export const logger={error(){},warn(){},info(){}};',
  './logger.js': 'export const logger={error(){},warn(){},info(){}};',
  '../lib/amazon.js': 'export const fetchAmazonDetails=()=>{},buildAmazonDescription=()=>{};',
  '../lib/rapidapi.js': 'export const rapidApiErrorMessage=()=>{};',
  '../lib/userRapidApi.js': 'export const requestEmail=async r=>r.email||null,rapidKeyForRequest=()=>{};',
  './userRapidApi.js': 'export const rapidKeyForEmail=()=>{};',
  '../lib/freeEbayImport.js': 'export const validateOwnEbayItems=()=>{};',
  '../lib/ebayPublic.js': 'export const discoverPublicEbayUrls=()=>{},fetchPublicEbayItems=()=>{};',
  './ebayPublic.js': 'export const fetchPublicEbayItem=()=>{};',
  './aliexpress.js': 'export const fetchAliExpressProduct=()=>{},calculateBazunkPrice=()=>{};',
  '../fxRates.js': 'export const toGbp=async v=>v;',
  'node:dns/promises': 'export const lookup=async()=>[{address:"93.184.216.34",family:4}];',
 };
 const plugin = {name:'fixtures',setup(b){
  b.onResolve({filter:/.*/}, args=>Object.hasOwn(mocks,args.path)?{path:args.path,namespace:'fixture'}:null);
  b.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:mocks[args.path],loader:'js'}));
 }};
 const savedFetch = globalThis.fetch;
 let price=12.50, available=true, failSupplier=false;
 const state=globalThis.shopifyTest={routes:new Map(),listings:[],suppliers:[],updates:[],
  async execute(q){
   if(q.text.includes('SELECT name'))return {rows:[{name:'Test seller'}]};
   if(q.text.includes('SELECT si.id FROM'))return {rows:this.suppliers.filter(s=>s.url===q.values[0]&&s.email===q.values[1]).map(()=>({id:1}))};
   if(q.text.includes('SELECT si.id, si.listing_id'))return {rows:this.suppliers.map(s=>({id:s.id,listingId:s.listingId,supplierId:s.externalId,supplierSource:'shopify-public',markupType:s.markupType,markupValue:String(s.markup),sellerEmail:s.email,supplierUrl:s.url,supplierData:s.data}))};
   if(q.text.includes('INSERT INTO listings')){this.listings.push(q.values);return {rows:[{id:this.listings.length}]};}
   if(q.text.includes('INSERT INTO supplier_imports')){
    if(failSupplier)throw Error('fixture supplier insert failure');
    this.suppliers.push({id:this.suppliers.length+1,listingId:q.values[0],externalId:q.values[1],url:q.values[2],markupType:q.values[5],markup:q.values[6],data:JSON.parse(q.values[8]),email:'seller@example.com'});
   }
   if(q.text.includes('UPDATE'))this.updates.push(q);
   return {rows:[]};
  },
  async transaction(f){const a=this.listings.length,b=this.suppliers.length;try{return await f({execute:q=>this.execute(q)});}catch(e){this.listings.length=a;this.suppliers.length=b;throw e;}}
 };
 globalThis.fetch=async(url,opts)=>{
  const query=JSON.parse(opts.body);
  assert.equal(opts.redirect,'error');assert.ok(opts.signal);
  const n={handle:'same-handle',title:'Source product',description:'Source description',availableForSale:available,
   images:{nodes:[{url:'https://cdn.example.com/product.jpg'}]},variants:{nodes:[{id:'variant-1',title:'Default',availableForSale:available,price:{amount:String(price),currencyCode:'GBP'}}]}};
  return {ok:true,json:async()=>({data:query.query.includes('product(handle:')?{product:n}:{products:{nodes:[n],pageInfo:{hasNextPage:false}}}})};
 };
 try {
  for(const [entry,out] of [['routes/userImporter.ts','routes.mjs'],['lib/syncJob.ts','sync.mjs']]){
   await build({entryPoints:[path.join(root,'src',entry)],outfile:path.join(dir,out),bundle:true,platform:'node',format:'esm',plugins:[plugin]});
  }
  await import(pathToFileURL(path.join(dir,'routes.mjs')));
  const sync=await import(pathToFileURL(path.join(dir,'sync.mjs')));
  const call=async(p,body,email='seller@example.com')=>{
   const res={statusCode:200,status(n){this.statusCode=n;return this;},json(v){this.body=v;return this;}};
   await state.routes.get(p)({body,email},res);return res;
  };
  assert.equal((await call('/user/shopify-public/preview',{url:'shop.example.com'},null)).statusCode,401);
  assert.equal((await call('/user/import-shopify-public',{items:[]},null)).statusCode,401);
  const preview=await call('/user/shopify-public/preview',{url:'shop.example.com/products/same-handle'});
  assert.equal(preview.statusCode,200);assert.equal(preview.body.items[0].price.amount,12.5);
  assert.equal(preview.body.items[0].price.currency,'GBP');
  const payload={items:preview.body.items,category:'fashion',subcategory:'shirts',markupType:'percentage',markupValue:20,syncEnabled:true};
  assert.equal((await call('/user/import-shopify-public',{...payload,markupValue:'NaN'})).statusCode,400);
  // A tampered handoff price/title is replaced by the source response.
  const imported=await call('/user/import-shopify-public',{...payload,items:[{...preview.body.items[0],title:'Tampered',price:{amount:999,currency:'USD'}}]});
  assert.equal(imported.body.imported,1);assert.equal(state.listings[0][1],'Source product');assert.equal(state.listings[0][2],15);
  assert.equal(state.listings[0][5],'fashion');assert.equal(state.listings[0][6],'shirts');assert.equal(state.listings[0][9],'seller@example.com');
  assert.equal(state.suppliers[0].data.syncEnabled,true);
  assert.equal((await call('/user/import-shopify-public',payload)).body.skipped,1);
  const second={...payload,markupType:'fixed',markupValue:2,items:[{...preview.body.items[0],sourceUrl:'https://another.example.com/products/same-handle'}]};
  assert.equal((await call('/user/import-shopify-public',second)).body.imported,1);
  assert.equal(state.listings[1][2],14.5);
  failSupplier=true;
  const failed=await call('/user/import-shopify-public',{...payload,items:[{...preview.body.items[0],sourceUrl:'https://third.example.com/products/same-handle'}]});
  assert.equal(failed.statusCode,500);assert.equal(state.listings.length,2);assert.equal(state.suppliers.length,2);failSupplier=false;
  price=20;available=false;
  assert.equal((await sync.syncImport(1)).ok,true);
  const updated=state.updates.find(q=>q.text.includes('UPDATE listings'));
  assert.equal(updated.values[0],24);assert.equal(updated.values[3],0);assert.equal(updated.values[4],'inactive');
  assert.equal(state.updates.find(q=>q.text.includes('UPDATE supplier_imports')).values[0],20);
  state.updates=[];state.suppliers[0].data.syncEnabled=false;
  assert.equal((await sync.syncImport(1)).error,'Sync disabled');assert.equal(state.updates.length,0);
  const component=await readFile(path.join(root,'../sellbuydeal/src/components/ShopifyPublicImporter.tsx'),'utf8');
  assert.ok(component.includes('selected[x.sourceUrl]'));assert.ok(component.includes('bazunk_shopify_handoff'));
 } finally {globalThis.fetch=savedFetch;delete globalThis.shopifyTest;await rm(dir,{recursive:true,force:true});}
});
