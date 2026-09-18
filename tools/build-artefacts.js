#!/usr/bin/env node
/*
 * The artefacts a tabletop needs on screen — a ransom note, a SIEM alert, a
 * fraudulent invoice, a network diagram — and which no stock library sells.
 *
 * They are drawn rather than photographed, as SVG, for reasons that all point
 * the same way: no licence attaches to them, they stay sharp at any size a
 * projector asks for, they weigh a few kilobytes, and the text inside them is
 * editable by anyone with a text editor, so an author can put their own system
 * names into one without redrawing it.
 *
 * Names are deliberately generic. An exercise about your finance system is
 * better served by a screen that says FINANCE SYSTEM than by one carrying an
 * invented company nobody in the room recognises.
 *
 *   node tools/build-artefacts.js
 */
const fs = require('fs');
const path = require('path');

const DIR = path.resolve(__dirname, '..', 'lib', 'exercise_data');
const W = 1200, H = 750;

const SANS = "'Segoe UI',system-ui,-apple-system,Helvetica,Arial,sans-serif";
const MONO = "'DM Mono','SF Mono',Menlo,Consolas,monospace";
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ── building blocks ─────────────────────────────────────────────────────── */

const svg = body =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img">\n${body}\n</svg>\n`;

// an application window, so the thing reads as something seen on a screen
function windowChrome(title, opts) {
  const o = opts || {};
  const bar = o.barFill || '#2b3242';
  const body = o.bodyFill || '#161a22';
  const dots = ['#ff5f57', '#febc2e', '#28c840']
    .map((c, i) => `<circle cx="${34 + i * 22}" cy="30" r="7" fill="${c}"/>`).join('');
  return {
    open: `<rect width="${W}" height="${H}" rx="14" fill="${body}"/>`
      + `<rect width="${W}" height="60" rx="14" fill="${bar}"/>`
      + `<rect y="46" width="${W}" height="14" fill="${bar}"/>`
      + dots
      + `<text x="${W / 2}" y="37" text-anchor="middle" font-family="${SANS}" font-size="19"`
      + ` fill="#b9c2d0">${esc(title)}</text>`,
  };
}

const text = (x, y, s, o) => {
  const a = o || {};
  return `<text x="${x}" y="${y}" font-family="${a.mono ? MONO : SANS}" font-size="${a.size || 19}"`
    + ` fill="${a.fill || '#e8ecf2'}"${a.weight ? ` font-weight="${a.weight}"` : ''}`
    + `${a.anchor ? ` text-anchor="${a.anchor}"` : ''}${a.opacity ? ` opacity="${a.opacity}"` : ''}`
    + `>${esc(s)}</text>`;
};

const rect = (x, y, w, h, fill, o) => {
  const a = o || {};
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"`
    + `${a.rx ? ` rx="${a.rx}"` : ''}${a.stroke ? ` stroke="${a.stroke}" stroke-width="${a.sw || 1}"` : ''}`
    + `${a.opacity ? ` opacity="${a.opacity}"` : ''}/>`;
};

const line = (x1, y1, x2, y2, stroke, sw, dash) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw || 1}"`
  + `${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;

// lines of type that stand in for prose nobody is meant to read
const filler = (x, y, widths, fill, gap) => widths
  .map((w, i) => rect(x, y + i * (gap || 20), w, 8, fill, { rx: 4, opacity: 0.5 }))
  .join('');

/* ── screenshots ─────────────────────────────────────────────────────────── */

const ransomNote = () => svg(
  rect(0, 0, W, H, '#0b0c10')
  + `<g opacity="0.07">${Array.from({ length: 14 }, (_, i) =>
      text(40, 60 + i * 52, 'ENCRYPTED  ENCRYPTED  ENCRYPTED  ENCRYPTED  ENCRYPTED  ENCRYPTED',
        { mono: true, size: 30, fill: '#e05252' })).join('')}</g>`
  + rect(120, 96, W - 240, H - 192, '#14161d', { rx: 10, stroke: '#7a1f1f', sw: 2 })
  + `<g transform="translate(160,140)">`
  + `<path d="M22 0 L44 40 L0 40 Z" fill="#e05252"/>`
  + text(56, 34, 'YOUR FILES HAVE BEEN ENCRYPTED', { size: 34, weight: 700, fill: '#ff6b6b' })
  + text(0, 92, 'Every document, database and backup on this network has been', { size: 20, fill: '#cfd6e2' })
  + text(0, 122, 'locked with military-grade encryption. Your data has also been', { size: 20, fill: '#cfd6e2' })
  + text(0, 152, 'copied to our servers.', { size: 20, fill: '#cfd6e2' })
  + rect(0, 186, 820, 96, '#1e222c', { rx: 8, stroke: '#3a4152' })
  + text(20, 218, 'PAYMENT DUE WITHIN', { size: 15, fill: '#8b93a3', weight: 600 })
  + text(20, 258, '71:59:48', { mono: true, size: 34, fill: '#febc2e' })
  + text(300, 218, 'AMOUNT', { size: 15, fill: '#8b93a3', weight: 600 })
  + text(300, 258, 'BTC 14.00', { mono: true, size: 34, fill: '#febc2e' })
  + text(560, 218, 'FILES AFFECTED', { size: 15, fill: '#8b93a3', weight: 600 })
  + text(560, 258, '1,284,507', { mono: true, size: 34, fill: '#e8ecf2' })
  + text(0, 330, 'Contact us through the portal below. Do not rename or move files.', { size: 18, fill: '#8b93a3' })
  + text(0, 362, 'Do not contact law enforcement. The key is destroyed when the timer ends.', { size: 18, fill: '#8b93a3' })
  + rect(0, 392, 820, 56, '#20242e', { rx: 6 })
  + text(18, 428, 'http://recovery-portal-7fk2p9x.onion/  ID: 4A7C-91BE-0D32', { mono: true, size: 19, fill: '#3ec9c8' })
  + `</g>`
);

const siemAlert = () => {
  const c = windowChrome('Security Monitoring — Alerts');
  const rows = [
    ['02:13:47', 'CRITICAL', 'Ransomware behaviour', 'FIN-SRV-04', 'Mass file rename, 14,208 files'],
    ['02:13:12', 'CRITICAL', 'Shadow copies deleted', 'FIN-SRV-04', 'vssadmin delete shadows /all'],
    ['02:11:55', 'HIGH', 'Unsigned binary executed', 'FIN-SRV-04', 'C:\\Windows\\Temp\\svc-update.exe'],
    ['02:09:30', 'HIGH', 'Lateral movement', 'HR-APP-02 → FIN-SRV-04', 'SMB, admin credential reuse'],
    ['01:58:04', 'MEDIUM', 'New service installed', 'HR-APP-02', 'Autorun persistence created'],
    ['01:42:19', 'MEDIUM', 'Privileged logon, off hours', 'HR-APP-02', 'svc_backup from 10.44.2.19'],
    ['23:51:07', 'LOW', 'VPN logon, new country', 'VPN-GW-01', 'User j.mercer, 3 failed then success'],
  ];
  const tone = { CRITICAL: '#e05252', HIGH: '#f5a623', MEDIUM: '#e0c452', LOW: '#8b93a3' };
  return svg(
    c.open
    + rect(0, 60, W, 52, '#1c212c')
    + text(30, 92, 'Last 6 hours', { size: 17, fill: '#8b93a3' })
    + rect(160, 72, 120, 28, '#e05252', { rx: 14, opacity: 0.18 })
    + text(180, 92, '2 critical', { size: 15, fill: '#ff8080', weight: 600 })
    + rect(292, 72, 104, 28, '#f5a623', { rx: 14, opacity: 0.18 })
    + text(310, 92, '2 high', { size: 15, fill: '#f5a623', weight: 600 })
    + text(W - 30, 92, 'Auto-refresh 30s', { size: 15, fill: '#5e6676', anchor: 'end' })
    + rect(0, 112, W, 38, '#232937')
    + ['TIME', 'SEVERITY', 'RULE', 'ASSET', 'DETAIL']
      .map((h, i) => text([30, 150, 300, 640, 890][i], 137, h, { size: 14, fill: '#8b93a3', weight: 700 })).join('')
    + rows.map((r, i) => {
      const y = 150 + i * 62;
      return rect(0, y, W, 62, i % 2 ? '#191d26' : '#161a22')
        + line(0, y, W, y, '#262c38', 1)
        + text(30, y + 38, r[0], { mono: true, size: 17, fill: '#b9c2d0' })
        + rect(150, y + 20, 100, 26, tone[r[1]], { rx: 4, opacity: 0.2 })
        + text(200, y + 38, r[1], { size: 13, fill: tone[r[1]], weight: 700, anchor: 'middle' })
        + text(300, y + 38, r[2], { size: 18, fill: '#e8ecf2' })
        + text(640, y + 38, r[3], { mono: true, size: 16, fill: '#3ec9c8' })
        + text(890, y + 38, r[4], { size: 15, fill: '#8b93a3' });
    }).join('')
  );
};

const terminalSession = () => {
  const c = windowChrome('root@FIN-SRV-04: ~');
  const lines = [
    ['$ ', 'whoami', '#3ec9c8'],
    ['', 'nt authority\\system', '#8b93a3'],
    ['$ ', 'net user svc_backup /domain', '#3ec9c8'],
    ['', 'Local Group Memberships   *Domain Admins  *Backup Operators', '#8b93a3'],
    ['$ ', 'vssadmin delete shadows /all /quiet', '#3ec9c8'],
    ['', 'Successfully deleted 14 shadow copies.', '#e05252'],
    ['$ ', 'wevtutil cl Security', '#3ec9c8'],
    ['$ ', 'rclone copy \\\\FIN-SRV-04\\Finance remote:bkp --transfers 32', '#3ec9c8'],
    ['', 'Transferred:   412.8 GiB / 631.2 GiB, 65%, 88.4 MiB/s', '#f5a623'],
    ['', 'Elapsed time:  1h21m4.2s', '#8b93a3'],
    ['$ ', '', '#3ec9c8'],
  ];
  return svg(
    c.open
    + rect(0, 60, W, H - 60, '#0d1016')
    + lines.map((l, i) => {
      const y = 108 + i * 42;
      return text(34, y, l[0], { mono: true, size: 20, fill: '#3ec9c8' })
        + text(34 + (l[0] ? 24 : 0), y, l[1], { mono: true, size: 20, fill: l[2] });
    }).join('')
    + rect(58, 108 + 10 * 42 - 17, 12, 22, '#3ec9c8', { opacity: 0.85 })
  );
};

const lockedOut = () => svg(
  rect(0, 0, W, H, '#1b2440')
  + rect(0, 0, W, H, '#0d1526', { opacity: 0.5 })
  + `<g transform="translate(${W / 2},250)">`
  + `<rect x="-46" y="-52" width="92" height="76" rx="10" fill="none" stroke="#f5a623" stroke-width="7"/>`
  + `<path d="M-26 -52 v-24 a26 26 0 0 1 52 0 v24" fill="none" stroke="#f5a623" stroke-width="7"/>`
  + `<circle cx="0" cy="-14" r="8" fill="#f5a623"/>`
  + `</g>`
  + text(W / 2, 372, 'Your account has been locked', { size: 40, weight: 700, anchor: 'middle' })
  + text(W / 2, 420, 'Too many failed sign-in attempts.', { size: 22, fill: '#b9c2d0', anchor: 'middle' })
  + rect(W / 2 - 330, 466, 660, 132, '#0f1728', { rx: 10, stroke: '#2c3650' })
  + text(W / 2 - 300, 504, 'Account', { size: 16, fill: '#8b93a3' })
  + text(W / 2 - 300, 534, 'j.mercer@[your-domain]', { mono: true, size: 19, fill: '#e8ecf2' })
  + text(W / 2 - 300, 570, 'Failed attempts from 4 locations in the last 9 minutes', { size: 16, fill: '#f5a623' })
  + text(W / 2, 650, 'Contact the service desk on the number in your induction pack.', { size: 18, fill: '#7a8397', anchor: 'middle' })
);

const serviceDown = () => svg(
  rect(0, 0, W, H, '#f4f6fa')
  + rect(0, 0, W, 76, '#ffffff')
  + line(0, 76, W, 76, '#d8dee8', 2)
  + rect(34, 26, 190, 24, '#c8cfda', { rx: 12 })
  + text(W - 34, 48, 'Status page', { size: 17, fill: '#8b93a3', anchor: 'end' })
  + `<g transform="translate(${W / 2},216)"><circle r="54" fill="#e05252" opacity="0.12"/>`
  + `<circle r="54" fill="none" stroke="#e05252" stroke-width="5"/>`
  + text(0, 12, '!', { size: 62, weight: 700, fill: '#e05252', anchor: 'middle' }) + `</g>`
  + text(W / 2, 336, 'Service unavailable', { size: 42, weight: 700, fill: '#141820', anchor: 'middle' })
  + text(W / 2, 382, 'We are unable to process requests at the moment.', { size: 21, fill: '#5a6373', anchor: 'middle' })
  + [['Customer portal', 'Major outage', '#e05252'],
     ['Payments', 'Major outage', '#e05252'],
     ['Booking system', 'Degraded', '#f5a623'],
     ['Public website', 'Operational', '#2f9e6f']]
    .map((r, i) => {
      const y = 434 + i * 68;
      return rect(W / 2 - 400, y, 800, 56, '#ffffff', { rx: 8, stroke: '#e2e7ef' })
        + `<circle cx="${W / 2 - 370}" cy="${y + 28}" r="8" fill="${r[2]}"/>`
        + text(W / 2 - 348, y + 35, r[0], { size: 20, fill: '#141820' })
        + text(W / 2 + 370, y + 35, r[1], { size: 18, fill: r[2], anchor: 'end', weight: 600 });
    }).join('')
);

/* ── documents ───────────────────────────────────────────────────────────── */

const page = inner =>
  svg(rect(0, 0, W, H, '#5b6170')
    + rect(150, 26, 900, H - 52, '#ffffff', { rx: 4 })
    + `<g transform="translate(150,26)">${inner}</g>`);

const invoice = () => page(
  rect(0, 0, 900, 8, '#2e7de0')
  + text(56, 84, 'INVOICE', { size: 34, weight: 700, fill: '#141820' })
  + text(56, 116, 'Supplier: [supplier name]', { size: 17, fill: '#5a6373' })
  + text(844, 84, 'INV-2291', { size: 22, anchor: 'end', fill: '#141820', mono: true })
  + text(844, 112, 'Issued 14 March   Due on receipt', { size: 15, anchor: 'end', fill: '#5a6373' })
  + line(56, 148, 844, 148, '#e2e7ef', 2)
  + [['Managed service — March', '18,400.00'],
     ['Out-of-hours support', '3,250.00'],
     ['Licence true-up (Q1)', '9,980.00']]
    .map((r, i) => text(56, 196 + i * 40, r[0], { size: 19, fill: '#141820' })
      + text(844, 196 + i * 40, '£' + r[1], { size: 19, anchor: 'end', mono: true, fill: '#141820' })).join('')
  + line(56, 330, 844, 330, '#e2e7ef', 2)
  + text(540, 372, 'TOTAL DUE', { size: 18, weight: 700, fill: '#141820' })
  + text(844, 372, '£31,630.00', { size: 26, weight: 700, anchor: 'end', mono: true, fill: '#141820' })
  + rect(56, 416, 788, 176, '#fff6e6', { rx: 6, stroke: '#f5a623', sw: 2 })
  + text(80, 454, 'PLEASE NOTE — OUR BANK DETAILS HAVE CHANGED', { size: 18, weight: 700, fill: '#8a5a00' })
  + text(80, 492, 'Following a treasury review, payments must now be sent to the', { size: 16, fill: '#6b5528' })
  + text(80, 518, 'account below. Please update your records before remitting.', { size: 16, fill: '#6b5528' })
  + text(80, 556, 'Sort code 04-29-11    Account 61550387    Ref INV-2291', { size: 18, mono: true, fill: '#141820' })
  + text(56, 648, 'Queries: accounts@[supplier-domain]  ·  This invoice was issued electronically.',
    { size: 14, fill: '#8b93a3' })
);

const pressRelease = () => page(
  text(56, 78, 'PRESS RELEASE', { size: 15, weight: 700, fill: '#2e7de0' })
  + text(56, 92, '', {})
  + line(56, 100, 844, 100, '#e2e7ef', 2)
  + text(56, 152, 'Statement on a cyber security incident', { size: 32, weight: 700, fill: '#141820' })
  + text(56, 188, 'For immediate release  ·  [date]  ·  [organisation]', { size: 16, fill: '#5a6373' })
  + text(56, 244, 'We are responding to a cyber security incident affecting some of', { size: 19, fill: '#141820' })
  + text(56, 274, 'our systems. We identified the issue in the early hours of this', { size: 19, fill: '#141820' })
  + text(56, 304, 'morning and took immediate steps to contain it.', { size: 19, fill: '#141820' })
  + text(56, 356, 'Some services are currently unavailable while we work to restore', { size: 19, fill: '#141820' })
  + text(56, 386, 'them safely. We are sorry for the disruption this is causing.', { size: 19, fill: '#141820' })
  + text(56, 438, 'We are working with external specialists and have notified the', { size: 19, fill: '#141820' })
  + text(56, 468, 'relevant authorities. Our investigation is ongoing.', { size: 19, fill: '#141820' })
  + text(56, 520, 'We will provide a further update by [time].', { size: 19, weight: 600, fill: '#141820' })
  + line(56, 566, 844, 566, '#e2e7ef', 2)
  + text(56, 604, 'Media enquiries', { size: 15, weight: 700, fill: '#141820' })
  + text(56, 632, 'press@[organisation]  ·  [telephone]', { size: 16, fill: '#5a6373' })
  + text(844, 632, 'ENDS', { size: 15, anchor: 'end', fill: '#8b93a3', weight: 700 })
);

const regulatorLetter = () => page(
  rect(56, 48, 210, 46, '#141820', { rx: 3 })
  + text(70, 79, '[REGULATOR]', { size: 20, weight: 700, fill: '#ffffff' })
  + text(844, 68, 'Ref: ENQ/2291/A', { size: 15, anchor: 'end', mono: true, fill: '#5a6373' })
  + text(844, 92, '[date]', { size: 15, anchor: 'end', fill: '#5a6373' })
  + line(56, 124, 844, 124, '#141820', 2)
  + text(56, 178, 'Personal data breach — request for information', { size: 26, weight: 700, fill: '#141820' })
  + text(56, 232, 'We have received a notification of a personal data breach from', { size: 18, fill: '#141820' })
  + text(56, 260, 'your organisation. We are making initial enquiries.', { size: 18, fill: '#141820' })
  + text(56, 312, 'Please provide the following within 72 hours of this letter:', { size: 18, weight: 600, fill: '#141820' })
  + ['the categories and approximate number of data subjects affected',
     'the categories and approximate volume of personal data records',
     'the likely consequences for the individuals concerned',
     'the measures taken, or proposed, to address the breach',
     'the name and contact details of your data protection officer']
    .map((l, i) => `<circle cx="70" cy="${352 + i * 38}" r="4" fill="#141820"/>`
      + text(92, 358 + i * 38, l, { size: 17, fill: '#141820' })).join('')
  + text(56, 570, 'Failure to respond may be taken into account in any subsequent', { size: 16, fill: '#5a6373' })
  + text(56, 594, 'regulatory action.', { size: 16, fill: '#5a6373' })
  + text(56, 656, 'Case officer  ·  Investigations team', { size: 16, fill: '#141820' })
);

const incidentReport = () => page(
  rect(0, 0, 900, 96, '#141820')
  + text(56, 60, 'INCIDENT REPORT', { size: 26, weight: 700, fill: '#ffffff' })
  + text(844, 60, 'INC-4471', { size: 20, anchor: 'end', mono: true, fill: '#3ec9c8' })
  + [['Severity', 'P1 — Critical', '#e05252'], ['Status', 'Contained', '#f5a623'],
     ['Raised', '02:19', '#141820'], ['Owner', 'Duty manager', '#141820']]
    .map((r, i) => {
      const x = 56 + i * 200;
      return text(x, 148, r[0].toUpperCase(), { size: 13, weight: 700, fill: '#8b93a3' })
        + text(x, 178, r[1], { size: 19, weight: 600, fill: r[2] });
    }).join('')
  + line(56, 206, 844, 206, '#e2e7ef', 2)
  + text(56, 248, 'Summary', { size: 18, weight: 700, fill: '#141820' })
  + filler(56, 272, [760, 740, 690], '#8b93a3', 24)
  + text(56, 388, 'Timeline', { size: 18, weight: 700, fill: '#141820' })
  + [['01:42', 'Privileged logon outside working hours'],
     ['02:13', 'Mass file encryption detected on FIN-SRV-04'],
     ['02:19', 'Incident raised, on-call engaged'],
     ['02:46', 'Affected segment isolated from the network'],
     ['03:30', 'Executive briefed, recovery planning begins']]
    .map((r, i) => {
      const y = 424 + i * 44;
      return `<circle cx="66" cy="${y - 6}" r="5" fill="#2e7de0"/>`
        + (i < 4 ? line(66, y - 1, 66, y + 33, '#c8cfda', 2) : '')
        + text(96, y, r[0], { size: 17, mono: true, fill: '#2e7de0' })
        + text(176, y, r[1], { size: 17, fill: '#141820' });
    }).join('')
);

/* ── diagrams ────────────────────────────────────────────────────────────── */

const box = (x, y, w, h, label, sub, tone) => {
  const c = tone || '#2e7de0';
  return rect(x, y, w, h, '#1b212c', { rx: 8, stroke: c, sw: 2 })
    + text(x + w / 2, y + (sub ? h / 2 - 2 : h / 2 + 7), label, { size: 19, anchor: 'middle', weight: 600 })
    + (sub ? text(x + w / 2, y + h / 2 + 24, sub, { size: 15, anchor: 'middle', fill: '#8b93a3', mono: true }) : '');
};

const networkTopology = () => svg(
  rect(0, 0, W, H, '#11141c')
  + text(W / 2, 56, 'Network overview', { size: 26, weight: 700, anchor: 'middle' })
  + text(W / 2, 86, 'Replace the labels with your own systems', { size: 16, anchor: 'middle', fill: '#8b93a3' })
  + `<g stroke="#3a4557" stroke-width="2" fill="none">`
  + `<path d="M600 172 V212"/><path d="M600 268 V308"/>`
  + `<path d="M600 308 H240 V364"/><path d="M600 308 H960 V364"/>`
  + `<path d="M240 460 V520"/><path d="M600 460 V520"/><path d="M960 460 V520"/>`
  + `<path d="M240 520 H960"/>`
  + `</g>`
  + box(480, 120, 240, 52, 'Internet', '', '#5e6676')
  + box(480, 212, 240, 56, 'Perimeter firewall', 'edge', '#f5a623')
  + box(140, 364, 200, 96, 'User network', 'workstations', '#2e7de0')
  + box(500, 364, 200, 96, 'Server network', 'applications', '#2e7de0')
  + box(860, 364, 200, 96, 'Remote access', 'vpn', '#2e7de0')
  + box(420, 520, 360, 80, 'Directory & identity', 'domain controllers', '#3ec9c8')
  + box(140, 620, 260, 72, 'Backups', 'offline copy', '#3ec9c8')
  + box(800, 620, 260, 72, 'Third party', 'supplier link', '#e05252')
  + `<g stroke="#3a4557" stroke-width="2" fill="none" stroke-dasharray="6 6">`
  + `<path d="M270 600 V620"/><path d="M930 460 V620"/></g>`
);

const incidentTimeline = () => {
  const stops = [
    ['Detection', 'Something is noticed', '#2e7de0'],
    ['Triage', 'How bad, how fast', '#2e7de0'],
    ['Containment', 'Stop the spread', '#f5a623'],
    ['Eradication', 'Remove the cause', '#f5a623'],
    ['Recovery', 'Restore service', '#3ec9c8'],
    ['Lessons', 'Change something', '#3ec9c8'],
  ];
  const y = 360, x0 = 96, gap = (W - 192) / (stops.length - 1);
  return svg(
    rect(0, 0, W, H, '#11141c')
    + text(W / 2, 64, 'Incident lifecycle', { size: 26, weight: 700, anchor: 'middle' })
    + text(W / 2, 96, 'The arc most exercises follow', { size: 16, anchor: 'middle', fill: '#8b93a3' })
    + line(x0, y, W - 96, y, '#2c3442', 4)
    + stops.map((s, i) => {
      const x = x0 + i * gap;
      const up = i % 2 === 0;
      return `<circle cx="${x}" cy="${y}" r="15" fill="${s[2]}"/>`
        + `<circle cx="${x}" cy="${y}" r="26" fill="none" stroke="${s[2]}" stroke-width="2" opacity="0.35"/>`
        + line(x, up ? y - 26 : y + 26, x, up ? y - 74 : y + 74, s[2], 2, '4 4')
        + text(x, up ? y - 92 : y + 116, s[0], { size: 21, weight: 700, anchor: 'middle' })
        + text(x, up ? y - 66 : y + 142, s[1], { size: 15, anchor: 'middle', fill: '#8b93a3' })
        + text(x, y + 6, String(i + 1), { size: 15, weight: 700, anchor: 'middle', fill: '#11141c' });
    }).join('')
    + text(96, 660, 'Time', { size: 15, fill: '#5e6676' })
    + `<path d="M${W - 110} 660 l 18 -6 v12 z" fill="#5e6676"/>`
    + line(140, 654, W - 110, 654, '#5e6676', 2)
  );
};

const escalationPath = () => {
  const tiers = [
    ['Whoever notices', 'Anyone — service desk, a user, a supplier', '#5e6676'],
    ['On-call engineer', 'Confirms, contains, records', '#2e7de0'],
    ['Incident manager', 'Owns the response, calls the severity', '#2e7de0'],
    ['Executive', 'Decides on disclosure, payment, shutdown', '#f5a623'],
    ['Board & regulator', 'Notified within statutory deadlines', '#e05252'],
  ];
  return svg(
    rect(0, 0, W, H, '#11141c')
    + text(W / 2, 62, 'Escalation path', { size: 26, weight: 700, anchor: 'middle' })
    + text(W / 2, 92, 'Who is told, in what order, and what each of them decides', { size: 16, anchor: 'middle', fill: '#8b93a3' })
    + tiers.map((t, i) => {
      const y = 140 + i * 112;
      return rect(200, y, 800, 84, '#1b212c', { rx: 10, stroke: t[2], sw: 2 })
        + rect(200, y, 10, 84, t[2], { rx: 4 })
        + text(240, y + 38, t[0], { size: 22, weight: 700 })
        + text(240, y + 66, t[1], { size: 16, fill: '#8b93a3' })
        + text(960, y + 50, String(i + 1), { size: 30, weight: 700, anchor: 'end', fill: t[2], opacity: 0.4 })
        + (i < tiers.length - 1
          ? `<path d="M600 ${y + 84} v18 m-9 -9 l9 9 l9 -9" stroke="#3a4557" stroke-width="2" fill="none"/>` : '');
    }).join('')
  );
};

const dataFlow = () => svg(
  rect(0, 0, W, H, '#11141c')
  + text(W / 2, 58, 'Where the data goes', { size: 26, weight: 700, anchor: 'middle' })
  + text(W / 2, 88, 'Useful for working out who has to be told', { size: 16, anchor: 'middle', fill: '#8b93a3' })
  + box(80, 180, 240, 90, 'Customers', 'personal data', '#3ec9c8')
  + box(480, 180, 240, 90, 'Your application', 'processing', '#2e7de0')
  + box(880, 180, 240, 90, 'Payment provider', 'card data', '#3ec9c8')
  + box(480, 380, 240, 90, 'Database', 'at rest', '#2e7de0')
  + box(80, 380, 240, 90, 'Analytics supplier', 'third country', '#e05252')
  + box(880, 380, 240, 90, 'Backup store', 'retained 90 days', '#2e7de0')
  + box(480, 570, 240, 90, 'Archive', 'offline, 7 years', '#f5a623')
  + `<g stroke="#3a4557" stroke-width="2" fill="none">`
  + `<path d="M320 225 H480" marker-end="url(#a)"/>`
  + `<path d="M720 225 H880" marker-end="url(#a)"/>`
  + `<path d="M600 270 V380" marker-end="url(#a)"/>`
  + `<path d="M480 425 H320" marker-end="url(#a)"/>`
  + `<path d="M720 425 H880" marker-end="url(#a)"/>`
  + `<path d="M600 470 V570" marker-end="url(#a)"/>`
  + `</g>`
  + `<defs><marker id="a" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">`
  + `<path d="M0 0 L10 4 L0 8 z" fill="#3a4557"/></marker></defs>`
  + rect(80, 680, 1040, 44, '#1b212c', { rx: 8, stroke: '#e05252', sw: 2 })
  + text(104, 708, 'Red boxes leave your control. They are usually the ones nobody remembers until the incident.',
    { size: 16, fill: '#ff8080' })
);

/* ── write them out ──────────────────────────────────────────────────────── */

const ARTEFACTS = {
  screenshots: {
    'ransom-note.svg': ransomNote,
    'siem-alert.svg': siemAlert,
    'terminal-session.svg': terminalSession,
    'account-locked.svg': lockedOut,
    'service-unavailable.svg': serviceDown,
  },
  documents: {
    'invoice-bank-change.svg': invoice,
    'press-release.svg': pressRelease,
    'regulator-letter.svg': regulatorLetter,
    'incident-report.svg': incidentReport,
  },
  diagrams: {
    'network-overview.svg': networkTopology,
    'incident-lifecycle.svg': incidentTimeline,
    'escalation-path.svg': escalationPath,
    'data-flow.svg': dataFlow,
  },
};

function build(opts) {
  const quiet = !!(opts && opts.quiet);
  let n = 0;
  Object.entries(ARTEFACTS).forEach(([category, files]) => {
    const dir = path.join(DIR, category);
    fs.mkdirSync(dir, { recursive: true });
    Object.entries(files).forEach(([name, draw]) => {
      const out = draw();
      fs.writeFileSync(path.join(dir, name), out);
      n++;
      if (!quiet) console.log(`  ${category}/${name}`.padEnd(46) + (out.length / 1024).toFixed(1) + ' KB');
    });
  });
  if (!quiet) console.log(`\n${n} artefacts. Run tools/build-gallery.js to list them in the picker.`);
  return n;
}

if (require.main === module) build();
module.exports = { build, ARTEFACTS };
