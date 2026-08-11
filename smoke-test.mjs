/**
 * Post-build smoke checks for critical career/assessment paths.
 * Runs after build.mjs — fails the Netlify deploy if checks fail.
 */
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const root = import.meta.dirname;
const deploy = join(root, 'deploy');
const functionsDir = join(root, 'netlify', 'functions');

let failed = 0;

function ok(msg) {
    console.log(`  ✓ ${msg}`);
}

function fail(msg) {
    console.error(`  ✗ ${msg}`);
    failed += 1;
}

function mustExist(path, label) {
    if (existsSync(path)) ok(label);
    else fail(`Missing: ${label} (${path})`);
}

function mustContain(path, needles, label) {
    if (!existsSync(path)) {
        fail(`Cannot read ${label}: file missing`);
        return;
    }
    const text = readFileSync(path, 'utf8');
    for (const n of needles) {
        if (!text.includes(n)) fail(`${label} missing expected content: ${n}`);
    }
    ok(`${label} content checks`);
}

console.log('\nSmoke test: deploy package');
mustExist(deploy, 'deploy/ folder');
[
    'index.html',
    'privacy.html',
    'careers.html',
    'admin.html',
    'assessment.html',
    'api.js',
    'careers.js',
    'admin.js',
    'assessment.js'
].forEach(f => mustExist(join(deploy, f), `deploy/${f}`));

console.log('\nSmoke test: homepage CTA focus');
mustContain(join(deploy, 'index.html'), [
    'Request a Proposal',
    'nav--minimal',
    'privacy.html',
    'sticky-cta--single'
], 'index.html CTA / privacy links');

console.log('\nSmoke test: privacy page');
mustContain(join(deploy, 'privacy.html'), [
    'Your Data, Protected',
    'What we collect',
    'How we protect it',
    'info@trinitasnxt.in'
], 'privacy.html');

console.log('\nSmoke test: resume submission path');
mustContain(join(deploy, 'careers.html'), ['id="cv-form"', 'id="submit-resume"', 'Submit resume'], 'careers resume form');
mustContain(join(deploy, 'careers.js'), ['submit-resume', 'cv-form', 'fileBase64'], 'careers.js resume submit');
mustContain(join(deploy, 'admin.html'), ['id="resumes-body"', 'Resume submissions'], 'admin resumes UI');
mustContain(join(deploy, 'admin.js'), ['loadResumes', 'adminResumes', 'adminResumeDownload'], 'admin.js resumes');
mustContain(join(deploy, 'api.js'), ['adminResumes', 'adminResumeDownload'], 'api.js resumes');
mustExist(join(functionsDir, 'submit-resume.mjs'), 'function submit-resume.mjs');
mustExist(join(functionsDir, 'admin-resumes.mjs'), 'function admin-resumes.mjs');
mustContain(join(functionsDir, 'submit-resume.mjs'), ['export default', 'fileBase64', 'resume-index'], 'submit-resume handler');
mustContain(join(functionsDir, 'admin-resumes.mjs'), ['export default', 'verifyAdminToken', 'resume-index'], 'admin-resumes handler');

console.log('\nSmoke test: pause / OTP path');
mustContain(join(deploy, 'assessment.html'), ['btn-pause-session', 'btn-end-session'], 'assessment pause/end controls');
mustContain(join(deploy, 'assessment.js'), ['pauseAssessment', 'buildSnapshot', 'pauseSession'], 'assessment.js pause');
mustContain(join(deploy, 'careers.html'), ['id="resume-form"', 'resumeOtp'], 'careers resume-OTP form');
mustContain(join(deploy, 'careers.js'), ['resumeAssessment'], 'careers.js resume');
mustContain(join(deploy, 'admin.html'), ['id="paused-body"', 'Paused assessments'], 'admin paused UI');
mustContain(join(deploy, 'admin.js'), ['loadPaused', 'adminGenerateOtp', 'handleGenerateOtp'], 'admin.js OTP');
mustContain(join(deploy, 'api.js'), ['pauseAssessment', 'resumeAssessment', 'adminPaused', 'adminGenerateOtp'], 'api.js pause/OTP');
mustExist(join(functionsDir, 'pause-assessment.mjs'), 'function pause-assessment.mjs');
mustExist(join(functionsDir, 'resume-assessment.mjs'), 'function resume-assessment.mjs');
mustExist(join(functionsDir, 'admin-paused.mjs'), 'function admin-paused.mjs');
mustExist(join(functionsDir, 'admin-generate-otp.mjs'), 'function admin-generate-otp.mjs');
mustContain(join(functionsDir, 'pause-assessment.mjs'), ['pause-index', 'status', 'paused'], 'pause stores without forcing OTP');
mustContain(join(functionsDir, 'admin-generate-otp.mjs'), ['otpHash', 'randomInt', 'verifyAdminToken'], 'admin generates OTP');
mustContain(join(functionsDir, 'resume-assessment.mjs'), ['otp_not_ready', 'otpHash'], 'resume requires admin OTP');

console.log('\nSmoke test: functions directory inventory');
const fnFiles = readdirSync(functionsDir).filter(f => f.endsWith('.mjs'));
const requiredFns = [
    'submit-resume.mjs',
    'admin-resumes.mjs',
    'pause-assessment.mjs',
    'resume-assessment.mjs',
    'admin-paused.mjs',
    'admin-generate-otp.mjs',
    'submit-assessment.mjs',
    'check-eligibility.mjs'
];
for (const f of requiredFns) {
    if (fnFiles.includes(f)) ok(`function present: ${f}`);
    else fail(`function missing: ${f}`);
}

console.log('');
if (failed > 0) {
    console.error(`Smoke test FAILED with ${failed} error(s). Deploy aborted.\n`);
    process.exit(1);
}
console.log('Smoke test PASSED — resume + pause/OTP paths and privacy package look complete.\n');
process.exit(0);
