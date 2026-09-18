#!/usr/bin/env node
/*
 * Candidate stock photographs from Wikimedia Commons, for lib/exercise_data/.
 *
 * Only CC0 and public-domain files are offered. That is a constraint, not a
 * preference: anything here is redistributed in a public repository, published
 * to a website, and copied again by everyone who downloads a scenario using it.
 * A licence requiring attribution would follow all of those copies and land the
 * obligation on facilitators who never agreed to it.
 *
 * It downloads candidates for review rather than installing them, because the
 * search cannot tell a server room from a bicycle rack — both match "rack" —
 * and a gallery is only worth having if somebody looked at it.
 *
 *   node tools/fetch-stock.js subjects.json ./candidates [free|attributed]
 *
 * subjects.json: [{ "slug": "server-room", "q": "data centre server racks" }]
 * Writes the thumbnails plus index.json, which records licence and provenance
 * for whatever you then choose to keep.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const UA = 'TTXGym-gallery-build/1.0 (https://ttxgym.com)';

/* Two policies, and the difference is not cosmetic.
   `free`      — CC0 and public domain. Nothing follows the file, so a facilitator
                 who downloads a scenario using one inherits no obligation.
   `attributed`— adds CC BY and CC BY-SA. Modern photography of the subjects a
                 cyber exercise actually needs — a data centre, an office floor,
                 a production line — is almost entirely licensed this way, and
                 CC0 searches return 1960s archive material instead. The credit
                 then has to travel: recorded in gallery.json, shown in the
                 picker, and listed in the category's CREDITS.md.
   Resizing is a format change, which CC 4.0 permits without it counting as an
   adaptation, so ShareAlike is not triggered by anything this tool does. */
const POLICY = {
  free: /^(CC0|Public domain|PDM|No restrictions)/i,
  attributed: /^(CC0|Public domain|PDM|No restrictions|CC BY)/i,
};
const MIN_WIDTH = 1000;

const get = url => new Promise((resolve, reject) => {
  https.get(url, { headers: { 'User-Agent': UA } }, r => {
    if (r.statusCode >= 300 && r.headers.location) { r.resume(); return get(r.headers.location).then(resolve, reject); }
    if (r.statusCode !== 200) { r.resume(); return reject(new Error('HTTP ' + r.statusCode)); }
    const chunks = [];
    r.on('data', d => chunks.push(d));
    r.on('end', () => resolve(Buffer.concat(chunks)));
  }).on('error', reject);
});

async function search(query, limit, allowed) {
  const FREE = allowed || POLICY.free;
  /* haslicense:unrestricted narrows the search itself to PD and CC0. Under the
     attributed policy that would hide everything the policy exists to reach, so
     the search is left open and the filter below does the work. */
  const scope = FREE === POLICY.free ? ' haslicense:unrestricted filetype:bitmap' : ' filetype:bitmap';
  const url = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search'
    + '&gsrsearch=' + encodeURIComponent(query + scope)
    + '&gsrnamespace=6&gsrlimit=' + limit
    + '&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=520';
  const pages = (JSON.parse((await get(url)).toString()).query || {}).pages || {};
  return Object.values(pages).map(page => {
    const info = (page.imageinfo || [])[0] || {};
    const meta = info.extmetadata || {};
    const field = k => ((meta[k] || {}).value || '').replace(/<[^>]+>/g, '').trim();
    return {
      title: page.title, thumb: info.thumburl, full: info.url,
      width: info.width, height: info.height,
      licence: field('LicenseShortName'), author: field('Artist'),
      description: field('ImageDescription').slice(0, 140),
      page: 'https://commons.wikimedia.org/wiki/' + encodeURIComponent(page.title),
    };
  }).filter(c =>
    c.thumb && FREE.test(c.licence) &&
    c.width >= MIN_WIDTH &&
    // portrait and panorama both sit badly on a 16:9 participant screen
    c.width / c.height > 1.05 && c.width / c.height < 2.7);
}

async function main(subjectsFile, outDir, policy) {
  const allowed = POLICY[policy || 'free'];
  if (!allowed) throw new Error('policy must be "free" or "attributed"');
  fs.mkdirSync(outDir, { recursive: true });
  const subjects = JSON.parse(fs.readFileSync(subjectsFile, 'utf8'));
  const indexPath = path.join(outDir, 'index.json');
  let index = fs.existsSync(indexPath) ? JSON.parse(fs.readFileSync(indexPath, 'utf8')) : [];

  for (const subject of subjects) {
    const hits = (await search(subject.q, subject.search || 80, allowed)).slice(0, subject.n || 4);
    let n = 0;
    for (const hit of hits) {
      const name = `${subject.slug}-${++n}.jpg`;
      fs.writeFileSync(path.join(outDir, name), await get(hit.thumb));
      index = index.filter(e => e.cand !== name);
      index.push(Object.assign({ slug: subject.slug, cand: name }, hit));
    }
    console.log(`  ${subject.slug.padEnd(22)} ${hits.length || 'nothing usable'}`);
  }

  fs.writeFileSync(indexPath, JSON.stringify(index, null, 1) + '\n');
  console.log(`\n${index.length} candidates in ${outDir}. Look at them, keep what is good,`);
  console.log('then record licence and author from index.json in the category CREDITS.md.');
}

if (require.main === module) {
  const [subjects, out, policy] = process.argv.slice(2);
  if (!subjects || !out) {
    console.error('usage: node tools/fetch-stock.js <subjects.json> <out-dir> [free|attributed]');
    process.exit(2);
  }
  main(subjects, out, policy).catch(e => { console.error(e.message); process.exit(1); });
}
module.exports = { search, POLICY, MIN_WIDTH };
