const fs = require('fs');
const path = require('path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const root = __dirname;
const read = name => fs.readFileSync(path.join(root,name),'utf8');
const preview=process.argv.includes('--preview');
const web=process.argv.includes('--web');
const requireAudit=process.argv.includes('--require-audit');
const requireRelease=requireAudit||process.argv.includes('--require-release');
const rawLights = JSON.parse(read('data/us-lighthouses.json'));
const correctionsPath='data/info/base-corrections.json';
const corrections=fs.existsSync(path.join(root,correctionsPath))?JSON.parse(read(correctionsPath)):[];
for(const correction of corrections){
  const record=rawLights.find(l=>l.id===correction.id);
  if(!record)throw new Error(`Correction references an unknown lighthouse: ${correction.id}`);
  Object.assign(record,correction.changes);
}
const keys=['id','name','state','lat','lon','active','rangeNm','sourceUrl','rangeSourceUrl','characteristic','notes','structure','focalHeightFt','rangeBasis','rangeRetrieved','sourceModified','coordinateSourceUrl','inventoryStatus','statusSourceUrl','notesSourceUrl','structureSourceUrl'];
const lights=rawLights.map(l=>({...Object.fromEntries(keys.filter(k=>l[k]!=null).map(k=>[k,l[k]])),archivedYear:/2025/.test(l.rangeSource||'')?2025:null}));
// Independently sourced display corrections never rewrite the audited historical facts.
const appearancePath='data/info/light-appearance.json';
const appearance=JSON.parse(read(appearancePath));
if(appearance.schemaVersion!==1||!Array.isArray(appearance.records))throw new Error('Invalid light appearance data');
const appearanceIds=new Set();
for(const row of appearance.records) {
  const light=lights.find(l=>l.id===row.id);
  if(!light||appearanceIds.has(row.id)||!['local','grouped','flash','steady'].includes(row.mode))throw new Error(`Invalid appearance record: ${row.id}`);
  if(!row.note||!row.label||!row.sourceLabel||!/^https:\/\//.test(row.sourceUrl)||row.additionalSources?.some(s=>!s.label||!/^https:\/\//.test(s.url)))throw new Error(`Unsourced appearance record: ${row.id}`);
  if(['grouped','flash'].includes(row.mode)&&!(row.periodSeconds>0&&row.periodSeconds<=120))throw new Error(`Invalid light period: ${row.id}`);
  if(row.mode==='flash'&&!(row.displayPulseSeconds>0&&row.displayPulseSeconds<row.periodSeconds))throw new Error(`Invalid illustrative pulse duration: ${row.id}`);
  if(row.mode==='grouped'&&(!Array.isArray(row.beamOffsetsTurns)||row.beamOffsetsTurns.length!==4||row.beamOffsetsTurns.some(v=>!(v>=0&&v<1))))throw new Error(`Invalid grouped beam model: ${row.id}`);
  light.appearance=row;appearanceIds.add(row.id);
}
if(requireRelease) {
  const approval=JSON.parse(read('data/info/light-appearance-review.json'));
  const hash=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,appearancePath))).digest('hex');
  if(approval.status!=='approved'||approval.sha256!==hash||JSON.stringify([...appearanceIds].sort())!==JSON.stringify([...approval.ids].sort()))throw new Error('Light appearance review is missing or stale');
}
const profilesPath='data/info/profiles.json';
const profileArray=preview?['data/info/research-a.json','data/info/research-b.json'].flatMap(p=>fs.existsSync(path.join(root,p))?JSON.parse(read(p)):[]):fs.existsSync(path.join(root,profilesPath))?JSON.parse(read(profilesPath)):[];
const profiles=Array.isArray(profileArray)?Object.fromEntries(profileArray.map(p=>[p.id,p])):profileArray;
if(requireRelease) {
  const missing=lights.filter(l=>!profiles[l.id]||!profiles[l.id].reviewStatus);
  if(missing.length)throw new Error(`${missing.length} lighthouse records are missing final audit profiles`);
  const empty=lights.filter(l=>!profiles[l.id].facts?.length);
  if(empty.length)throw new Error(`${empty.length} lighthouse profiles have no approved descriptive facts`);
  for(const light of lights)for(const fact of profiles[light.id].facts||[]) {
    if(!fact.label||fact.value==null||!/^https?:\/\//.test(fact.sourceUrl||''))throw new Error(`Unattributed fact for ${light.id}`);
  }
  const audit=JSON.parse(read('data/info/audit-progress.json'));
  if(audit.researchRecordsAudited!==rawLights.length)throw new Error('Audit does not cover every lighthouse');
  for(const file of ['research-a.json','research-b.json'])if(!audit.researchInputSha256?.[file])throw new Error(`Missing audited input hash for ${file}`);
  // Public releases verify the approved outputs without distributing archived
  // research notes. Full audit mode additionally verifies those original inputs.
  if(requireAudit) {
    for(const [file,expected] of Object.entries(audit.researchInputSha256||{})) {
      const actual=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'data/info',file))).digest('hex');
      if(actual!==expected)throw new Error(`Audit is stale for ${file}`);
    }
  }
  const release=JSON.parse(read('data/info/audit-release.json'));
  if(release.status!=='approved'||release.records!==rawLights.length)throw new Error('Final data audit is not approved');
  for(const file of ['profiles.json','base-corrections.json']) {
    const actual=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'data/info',file))).digest('hex');
    if(actual!==release.outputSha256?.[file])throw new Error(`Approved data changed after audit: ${file}`);
  }
}
// Summaries are an independently reviewed addition; the original fact audit stays intact.
const summariesPath='data/info/summaries.json';
let summaryCount=0;
if(fs.existsSync(path.join(root,summariesPath))) {
  const summaries=JSON.parse(read(summariesPath));
  const release=JSON.parse(read('data/info/summary-release.json'));
  if(release.status!=='approved'||release.records!==lights.length||summaries.length!==lights.length)throw new Error('Summary audit does not cover every lighthouse');
  const digest=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'data/info',file))).digest('hex');
  for(const file of ['profiles.json','base-corrections.json'])if(digest(file)!==release.inputSha256?.[file])throw new Error(`Summary audit is stale for ${file}`);
  if(digest('summaries.json')!==release.outputSha256?.['summaries.json'])throw new Error('Summaries changed after audit');
  const seen=new Set();
  for(const row of summaries) {
    const profile=profiles[row.id];
    if(!profile||seen.has(row.id)||!row.summary?.trim())throw new Error(`Missing or duplicate summary: ${row.id}`);
    if(!Array.isArray(row.sentences)||!row.sentences.length||row.sentences.map(s=>s.text).join(' ')!==row.summary)throw new Error(`Untraceable summary sentences: ${row.id}`);
    const indexes=[...new Set(row.sentences.flatMap(s=>s.factIndexes||[]))].sort((a,b)=>a-b);
    if(!indexes.length||row.sentences.some(s=>!s.factIndexes?.length)||indexes.some(i=>!Number.isInteger(i)||!profile.facts[i]))throw new Error(`Summary cites an unknown fact: ${row.id}`);
    if(JSON.stringify(indexes)!==JSON.stringify([...new Set(row.factIndexes||[])].sort((a,b)=>a-b)))throw new Error(`Summary fact references disagree: ${row.id}`);
    const urls=[...new Set(indexes.map(i=>profile.facts[i].sourceUrl))].sort();
    const cited=[...new Set((row.summarySources||[]).map(s=>s.url))].sort();
    if(JSON.stringify(urls)!==JSON.stringify(cited))throw new Error(`Summary source references disagree: ${row.id}`);
    if(row.summary.length>1000)throw new Error(`Summary needs shortening: ${row.id}`);
    profile.summary=row.summary;profile.summarySources=row.summarySources;
    seen.add(row.id);
  }
  if(lights.some(l=>!seen.has(l.id)))throw new Error('A mapped lighthouse is missing its summary');
  summaryCount=seen.size;
}
const states = JSON.parse(read('data/us-states.json'));
const lakes = JSON.parse(read('data/us-lakes.json'));
let template = read(web?'website-map-template.html':'usa-map-template.html');
if(web)template=template.replace('/*__UI_FONT__*/',fs.readFileSync(path.join(root,'data/ui/geist-latin.woff2')).toString('base64'));
const payload=zlib.gzipSync(JSON.stringify({lights,states,lakes,profiles}),{level:9}).toString('base64');
template = template.replace('/*__D3__*/',()=>read('data/d3.min.js'))
  .replace('/*__DATA__*/',()=>payload)
  .replace('/*__MAP_CODE__*/',()=>['map-geometry.js','usa-map.js','lighthouse-info.js'].map(read).join('\n'));
if (Buffer.byteLength(template)>1000000) throw new Error('Visualization exceeds 1 MB');
const destination = web?path.join(root,'deploy/lighthouse-map-fragment.html'):path.join(root,'deploy/preview',preview?'usa-lighthouse-info-preview.html':'usa-lighthouse-map.html');
fs.mkdirSync(path.dirname(destination),{recursive:true});
fs.writeFileSync(destination,template);
console.log(JSON.stringify({destination,bytes:Buffer.byteLength(template),lights:rawLights.length,profiles:Object.keys(profiles).length,summaries:summaryCount}));
