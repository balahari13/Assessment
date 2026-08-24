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
    'Request a proposal',
    'privacy.html',
    'careers.html',
    'Employee Login',
    'Open roles',
    'page-home',
    'Engagement model',
    'nav-group',
    'Company'
], 'index.html CTA / grouped nav / compact homepage');

console.log('\nSmoke test: privacy page');
mustContain(join(deploy, 'privacy.html'), [
    'Your Data, Protected',
    'What we collect',
    'How we protect it',
    'info@trinitasnxt.in'
], 'privacy.html');

console.log('\nSmoke test: candidate account + resume path');
mustContain(join(deploy, 'careers.html'), ['id="signup-form"', 'id="signin-form"', 'suPassword', 'Begin Attempt 1', 'panel-forgot', 'Forgot password'], 'careers account + attempts');
mustContain(join(deploy, 'careers.js'), ['candidate-register', 'candidate-login', 'passwordStrength', 'btn-attempt1', 'candidate-reset-password'], 'careers.js account flow');
mustContain(join(deploy, 'admin.html'), ['id="resumes-body"', 'Resume submissions', 'id="candidates-body"', 'Candidate accounts', 'Hiring pipeline', 'hr-team-body', 'admin-pipeline-board', 'admin-tabs', 'audit-body', 'btn-hr-invite', 'results-search'], 'admin tabs + pipeline + HR + audit');
mustContain(join(deploy, 'admin.js'), ['loadResumes', 'handleResumeDelete', 'loadPipeline', 'loadHrTeam', 'loadAudit', 'initAdminTabs', 'ensureAssessmentData'], 'admin.js product UX');
mustContain(join(deploy, 'api.js'), ['adminResumes', 'adminResumeDelete', 'adminCandidates', 'pipelineList', 'hrRegister', 'adminHrInvite', 'adminAudit'], 'api.js full admin/HR surface');
mustContain(join(deploy, 'careers.html'), ['firstname.lastname', 'careers-progress-checklist', 'suReferredBy', 'Employee referral'], 'careers referral source');
mustContain(join(functionsDir, 'candidate-register.mjs'), ['referredBy', 'ALLOWED_SOURCES', 'Employee referral'], 'register stores referral source');
mustContain(join(deploy, 'hr.html'), ['hr-register-form', 'Google Meet', 'pipeline-board', 'inviteCode', 'staff-employees.html'], 'HR invite-only portal + employee create');
mustContain(join(deploy, 'staff-employees.html'), ['staff-create-form', 'agent.trinitas.in', 'staff-list-body'], 'staff employee provision page');
mustExist(join(functionsDir, 'staff-employees.mjs'), 'function staff-employees.mjs');
mustContain(join(functionsDir, 'staff-employees.mjs'), ['verifyStaffAccess', 'agent.trinitas.in', 'employee_create'], 'staff-employees handler');
mustContain(join(deploy, 'hr.js'), ['hrRegister', 'pipelineList', 'inviteCode'], 'HR portal script');
mustContain(join(deploy, 'assessment.js'), ['gate-consent', 'assessment-gate', 'referenceId'], 'assessment consent gate + ref');
mustExist(join(root, 'README.md'), 'README.md');
mustExist(join(functionsDir, 'candidate-register.mjs'), 'function candidate-register.mjs');
mustExist(join(functionsDir, 'candidate-login.mjs'), 'function candidate-login.mjs');
mustExist(join(functionsDir, 'candidate-reset-password.mjs'), 'function candidate-reset-password.mjs');
mustExist(join(functionsDir, 'admin-candidates.mjs'), 'function admin-candidates.mjs');
mustExist(join(functionsDir, 'admin-password-reset.mjs'), 'function admin-password-reset.mjs');
mustExist(join(functionsDir, 'admin-resumes.mjs'), 'function admin-resumes.mjs');
mustContain(join(functionsDir, 'candidate-register.mjs'), ['export default', 'fileBase64', 'passwordHash', 'token'], 'candidate-register handler');
mustContain(join(functionsDir, 'candidate-reset-password.mjs'), ['export default', 'passwordResetEnabled', 'passwordHash'], 'candidate-reset-password handler');
mustContain(join(functionsDir, 'admin-password-reset.mjs'), ['export default', 'enable', 'set-temp', 'verifyAdminToken'], 'admin-password-reset handler');
mustContain(join(functionsDir, 'admin-resumes.mjs'), ['export default', 'verifyAdminToken', 'resume-index', 'delete'], 'admin-resumes handler');
mustExist(join(functionsDir, 'hr-register.mjs'), 'function hr-register.mjs');
mustExist(join(functionsDir, 'hr-login.mjs'), 'function hr-login.mjs');
mustExist(join(functionsDir, 'pipeline.mjs'), 'function pipeline.mjs');
mustExist(join(functionsDir, 'admin-hr.mjs'), 'function admin-hr.mjs');
mustExist(join(functionsDir, 'admin-hr-invite.mjs'), 'function admin-hr-invite.mjs');
mustExist(join(functionsDir, 'admin-audit.mjs'), 'function admin-audit.mjs');
mustExist(join(functionsDir, 'lib', 'password.mjs'), 'password.mjs scrypt');
mustExist(join(functionsDir, 'lib', 'score.mjs'), 'score.mjs server scoring');
mustExist(join(functionsDir, 'lib', 'answer-keys.mjs'), 'answer-keys.mjs');
mustExist(join(functionsDir, 'lib', 'audit.mjs'), 'audit.mjs');
mustContain(join(functionsDir, 'pipeline.mjs'), ['PIPELINE_STAGES', 'DEFAULT_MEET_LINK', 'verifyStaffAccess'], 'pipeline handler');
mustContain(join(functionsDir, 'lib', 'shared.mjs'), ['ADMIN_PASSWORD', 'ALLOWED_ORIGINS', 'generateReferenceId'], 'env secrets + CORS + ref IDs');
mustContain(join(functionsDir, 'submit-assessment.mjs'), ['serverScoreSubmission', 'referenceId'], 'server-side scoring on submit');
mustContain(join(functionsDir, 'hr-register.mjs'), ['invite_required', 'inviteCode'], 'HR invite-only');
mustContain(join(deploy, 'careers.html'), ['after-attempt-box', 'Assessment process'], 'careers after-attempt copy');
mustContain(join(deploy, 'admin.html'), ['Assessment data (with answers) loads only after successful admin sign-in', 'admin-logged-out', 'id="admin-dashboard" hidden'], 'admin login-gated shell');
mustContain(join(deploy, 'careers.css'), ['admin-dashboard[hidden]', 'body.admin-logged-out #admin-dashboard'], 'admin dashboard hidden CSS override fix');
mustContain(join(deploy, 'admin.js'), ['admin-logged-in', 'admin-logged-out', 'showLogin'], 'admin session body classes');
mustContain(join(deploy, 'assessment.js'), ['Submission received', 'Next steps'], 'professional post-assessment copy');

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
    'candidate-register.mjs',
    'candidate-login.mjs',
    'candidate-reset-password.mjs',
    'admin-candidates.mjs',
    'admin-password-reset.mjs',
    'admin-resumes.mjs',
    'hr-register.mjs',
    'hr-login.mjs',
    'pipeline.mjs',
    'admin-hr.mjs',
    'admin-hr-invite.mjs',
    'admin-audit.mjs',
    'pause-assessment.mjs',
    'resume-assessment.mjs',
    'admin-paused.mjs',
    'admin-generate-otp.mjs',
    'submit-assessment.mjs',
    'check-eligibility.mjs',
    'staff-employees.mjs'
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
