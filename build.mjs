import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'fs';
import { join } from 'path';

const root = import.meta.dirname;
const deploy = join(root, 'deploy');

const siteFiles = [
    'index.html', 'about.html', 'careers.html', 'healthcare.html', 'assessment.html', 'admin.html',
    '404.html', 'thank-you.html',
    'styles.css', 'careers.css', 'main.js', 'api.js', 'careers.js', 'healthcare.js',
    'assessment.js', 'assessment-aptitude.js', 'assessment-data.js', 'assessment-data-attempt2.js', 'admin.js',
    'logo-icon.png', 'logo-full.png', 'logo-wordmark.png'
];

if (!existsSync(deploy)) {
    mkdirSync(deploy, { recursive: true });
} else {
    for (const entry of readdirSync(deploy)) {
        if (entry !== '.git') {
            rmSync(join(deploy, entry), { recursive: true, force: true });
        }
    }
}

for (const file of siteFiles) {
    const src = join(root, file);
    if (existsSync(src)) {
        cpSync(src, join(deploy, file));
    }
}

const assetsSrc = join(root, 'assets');
const assetsDest = join(deploy, 'assets');
if (existsSync(assetsSrc)) {
    cpSync(assetsSrc, assetsDest, { recursive: true });
}

console.log('Build complete: deploy/');