const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const gitPath = path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Git', 'cmd', 'git.exe');

let syncTimeout = null;
let isSyncing = false;

function doSync() {
  if (isSyncing) return;
  isSyncing = true;

  try {
    const status = execSync(`"${gitPath}" status -s`, { encoding: 'utf-8' });
    if (!status || !status.trim()) {
      isSyncing = false;
      return;
    }

    console.log(`\n\x1b[33m⚡ [Real-Time Auto-Push]\x1b[0m Detected changes, syncing to GitHub...`);
    execSync(`"${gitPath}" add .`, { stdio: 'pipe' });
    const timestamp = new Date().toLocaleTimeString();
    execSync(`"${gitPath}" commit -m "Live update: ${timestamp}"`, { stdio: 'pipe' });
    execSync(`"${gitPath}" push origin main`, { stdio: 'pipe' });
    console.log(`\x1b[32m✔ [${timestamp}] Live updates successfully synced to GitHub!\x1b[0m`);
  } catch (err) {
    console.error(`\x1b[31m[Auto-Sync Error]\x1b[0m ${err.message}`);
  } finally {
    isSyncing = false;
  }
}

console.log(`\x1b[36m👀 [Live Real-Time GitHub Watcher] Started!\x1b[0m`);
console.log(`\x1b[90mEvery time you or AI edit code, it will auto-push to GitHub in real time...\x1b[0m\n`);

// Watch src and engine directories
const watchDirs = ['src', 'engine', 'electron'];
watchDirs.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (fs.existsSync(fullPath)) {
    fs.watch(fullPath, { recursive: true }, (eventType, filename) => {
      if (!filename || filename.includes('.git') || filename.includes('node_modules')) return;
      
      // Debounce so multiple quick edits trigger a single clean push
      if (syncTimeout) clearTimeout(syncTimeout);
      syncTimeout = setTimeout(doSync, 3000);
    });
  }
});
