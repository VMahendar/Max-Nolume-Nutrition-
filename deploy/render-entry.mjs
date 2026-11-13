// MAX VOLUME NUTRITION — guarded Render entry point.
//
// The existing Render service still has 'npm run start:staging' as its start
// command. Only the owner's original service may opt into enquiry-only
// production with MVN_PRODUCTION_LAUNCH=true. PR previews remain isolated
// staging instances. Do not migrate or delete the marked staging database.
import {existsSync,readFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';

const official='https://maxvolumenutriton.shop';
const originalRenderServiceId='srv-dbk8a33bc2fs73enbmf0';
const launchRequested=process.env.MVN_PRODUCTION_LAUNCH==='true';

if(launchRequested){
  if(process.env.RENDER!=='true'||process.env.RENDER_SERVICE_ID!==originalRenderServiceId||
     process.env.RENDER_GIT_BRANCH!=='main'||process.env.IS_PULL_REQUEST==='true'){
    throw Error('Production launch is allowed only on the original Render main-branch service.');
  }
  const diskRoot='/var/data';
  const configured=resolve(process.env.DATA_DIR||diskRoot);
  if(configured!==diskRoot)throw Error('Unexpected production disk path; refusing to change database location.');
  const stageMarker=join(diskRoot,'staging-only.json');
  let dataDir=diskRoot;
  if(existsSync(stageMarker)){
    const marker=JSON.parse(readFileSync(stageMarker,'utf8'));
    if(marker.purpose!=='mvn-staging-test-data'||marker.version!==1)throw Error('Unrecognized staging marker; database untouched.');
    // Keep existing staging records on disk, unchanged; public customer
    // registrations and enquiries use a distinct durable live database.
    dataDir=join(diskRoot,'live');
    mkdirSync(dataDir,{recursive:true,mode:0o700});
    if(existsSync(join(dataDir,'staging-only.json')))throw Error('Live storage must never contain staging test data.');
  }
  process.env.DATA_DIR=dataDir;
  process.env.NODE_ENV='production';
  process.env.STAGING_MODE='false';
  process.env.PUBLIC_ORIGIN=official;
  process.env.STORE_PUBLIC_URL=official;
  process.env.PAYMENTS_ENABLED='false';
  process.env.SHIPROCKET_ENABLED='false';
  process.env.PAYMENT_MODE='test';
  process.env.LIVE_PAYMENTS_APPROVED='false';
  console.log('Starting original MVN service: public WhatsApp-enquiry storefront. Payments and shipping integrations disabled.');
  await import('../server.mjs');
}else{
  // Exact previous staging semantics: initialize isolated test data before
  // launching the auth-protected, integration-disabled staging server.
  const init=spawnSync(process.execPath,['deploy/staging-init.mjs'],{stdio:'inherit',env:process.env});
  if(init.error)throw init.error;
  if(init.status!==0)process.exit(init.status||1);
  await import('../staging-server.mjs');
}
