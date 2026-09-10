/** Portable, dependency-free export of the audited standalone map. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');

const root = __dirname;
const read = name => fs.readFileSync(path.join(root, name), 'utf8').replace(/\r\n?/g, '\n');
const fragmentPath = 'deploy/lighthouse-map-fragment.html';
const destination = path.join(root, 'deploy/lighthouse-map/index.html');

// Use the running Node executable, so the build works without another Node on
// PATH. Release mode retains approved-output fingerprints and coverage checks;
// the optional full audit also requires the unpublished original research files.
const auditMode = process.argv.includes('--verify-research-archive') ? '--require-audit' : '--require-release';
const build = spawnSync(process.execPath, [path.join(root, 'build-usa-map.js'), '--web', auditMode], {
  cwd: root,
  stdio: 'inherit',
});
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status || 1);

const fragment = read(fragmentPath);
if (['data-lucide=', 'data-tooltip=', 'role="tab"'].some(marker => fragment.includes(marker))) {
  throw new Error('The website fragment must work without a preview runtime.');
}
const substitutions = {
  '/*__MAP_FRAGMENT__*/': fragment,
  '/*__MAP_TRACKING__*/': read('wordpress/jmoul-map-tracking.js'),
  '/*__FONT_LICENSE__*/': read('data/ui/OFL-Geist.txt').replace(/--/g, '- -'),
};
let document = read('website-document-template.html');
for (const [marker, content] of Object.entries(substitutions)) {
  if (document.split(marker).length !== 2) throw new Error(`Expected one website template marker: ${marker}`);
  // Replacement callbacks preserve literal $ characters in JavaScript sources.
  document = document.replace(marker, () => content);
}
if (document.includes('<script src=')) throw new Error('The standalone page must not load external scripts.');
fs.mkdirSync(path.dirname(destination), {recursive: true});
fs.writeFileSync(destination, document, 'utf8');
// Keep licenses with copies of the self-contained page. Source links in the
// distributable notices point back to the public repository.
for (const [source, name] of [['data/D3-LICENSE.txt','D3-LICENSE.txt'],['data/ui/OFL-Geist.txt','OFL-Geist.txt']]) {
  fs.copyFileSync(path.join(root,source),path.join(path.dirname(destination),name));
}
const localLicenses={'data/D3-LICENSE.txt':'D3-LICENSE.txt','data/ui/OFL-Geist.txt':'OFL-Geist.txt'};
const notices=read('THIRD_PARTY_NOTICES.md').replace(/\]\((?![a-z]+:|#)([^)]+)\)/gi,
  (_,file)=>`](${localLicenses[file]||'https://github.com/jpmoulton/us-lighthouse-map/blob/master/'+file})`);
fs.writeFileSync(path.join(path.dirname(destination),'THIRD_PARTY_NOTICES.md'),notices,'utf8');
console.log(`Standalone page: ${destination} (${Buffer.byteLength(document).toLocaleString('en-US')} bytes)`);
