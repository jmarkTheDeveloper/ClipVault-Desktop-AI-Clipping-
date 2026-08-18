const { execSync } = require('child_process');
const path = require('path');

const gitPath = path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Git', 'cmd', 'git.exe');

function run(cmd) {
  try {
    const gitCmd = `"${gitPath}" ${cmd}`;
    return execSync(gitCmd, { encoding: 'utf-8', stdio: 'pipe' });
  } catch (err) {
    if (err.stdout) console.log(err.stdout.toString());
    if (err.stderr) console.error(err.stderr.toString());
    return null;
  }
}

console.log('\x1b[33m⚡ [ClipVault Git Sync]\x1b[0m Checking for code changes...');

const status = run('status -s');
if (!status || !status.trim()) {
  console.log('\x1b[32m✔ Everything is already up to date on GitHub!\x1b[0m');
  process.exit(0);
}

console.log('\x1b[36m📦 Staging changed files...\x1b[0m');
run('add .');

const timestamp = new Date().toLocaleString();
const commitMsg = process.argv[2] || `Update: ${timestamp}`;

console.log(`\x1b[34m📝 Committing changes: "${commitMsg}"...\x1b[0m`);
run(`commit -m "${commitMsg}"`);

console.log('\x1b[35m🚀 Pushing to GitHub (main branch)...\x1b[0m');
const pushResult = run('push origin main');

if (pushResult !== null) {
  console.log('\x1b[32m✨ Successfully pushed and synced to GitHub in REAL TIME!\x1b[0m');
  console.log('\x1b[90m👉 https://github.com/jmarkTheDeveloper/ClipVault-Desktop-AI-Clipping-\x1b[0m');
} else {
  console.log('\x1b[31m❌ Push encountered an error. Check authentication or connection.\x1b[0m');
}
