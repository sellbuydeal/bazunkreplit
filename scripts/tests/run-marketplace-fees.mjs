import { build } from '../../artifacts/api-server/node_modules/esbuild/lib/main.js';
import { fileURLToPath } from 'node:url';
import { dirname,resolve } from 'node:path';
import { mkdtemp,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
const here=dirname(fileURLToPath(import.meta.url));
const out=await mkdtemp(resolve(tmpdir(),'bazunk-fee-tests-'));
try {
 for(const name of ['marketplace-fees','order-settlement']) {
  const outfile=resolve(out,`${name}.mjs`);
  await build({entryPoints:[resolve(here,`${name}.test.ts`)],bundle:true,platform:'node',format:'esm',outfile,plugins:name==='order-settlement'?[{name:'mock-external-payments',setup(b){b.onResolve({filter:/^@workspace\/db$|stripeClient\.js$/},()=>({path:resolve(here,'settlement-fixtures.ts')}));}}]:[]});
  const result=spawnSync(process.execPath,['--test',outfile],{stdio:'inherit'});if(result.status)process.exitCode=result.status;
 }
}finally{await rm(out,{recursive:true,force:true});}
