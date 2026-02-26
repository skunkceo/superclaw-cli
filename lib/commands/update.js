const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');
const { colors, success, warn, error, info } = require('../utils');
const { checkLicense, installPro } = require('./pro');

function run(args) {
  console.log(`\n${colors.cyan}${colors.bright}SuperClaw Update${colors.reset}\n`);

  // Find the workspace
  const workspace = findWorkspace();
  if (!workspace) {
    error('No SuperClaw workspace found.');
    console.log('Run this command from your workspace directory or its subdirectories.\n');
    process.exit(1);
  }

  info(`Workspace: ${workspace}`);
  console.log('');

  // Check what needs updating
  const dashboardPath = path.join(workspace, 'node_modules', '@skunkceo', 'superclaw-dashboard');
  const hasDashboard = fs.existsSync(dashboardPath);

  if (args.includes('--check') || args.includes('-c')) {
    checkForUpdates(workspace, hasDashboard);
    return;
  }

  // Update CLI
  console.log(`${colors.cyan}Updating SuperClaw CLI...${colors.reset}`);
  try {
    execSync('npm update -g @skunkceo/superclaw-cli', { stdio: 'inherit' });
    success('CLI updated');
  } catch (e) {
    warn('Could not update CLI globally. Try: sudo npm update -g @skunkceo/superclaw-cli');
  }

  // Update dashboard if installed
  if (hasDashboard) {
    console.log(`\n${colors.cyan}Updating SuperClaw Dashboard...${colors.reset}`);
    updateDashboard(workspace);
  }

  console.log(`\n${colors.green}${colors.bright}Update complete!${colors.reset}\n`);
}

function findWorkspace() {
  let dir = process.cwd();
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'AGENTS.md')) || 
        fs.existsSync(path.join(dir, '.clawdbot')) ||
        fs.existsSync(path.join(dir, 'clawdbot.json'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return null;
}

function getLatestRelease() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: '/repos/skunkceo/superclaw-dashboard-dist/releases/latest',
      headers: { 'User-Agent': 'superclaw-cli' }
    };
    
    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const release = JSON.parse(data);
          if (release.tag_name) {
            const version = release.tag_name.replace(/^v/, '');
            const asset = release.assets.find(a => a.name.endsWith('.zip'));
            resolve({ 
              version, 
              downloadUrl: asset ? asset.browser_download_url : null,
              tagName: release.tag_name
            });
          } else {
            reject(new Error('No release found'));
          }
        } catch (e) { 
          reject(e); 
        }
      });
    }).on('error', reject);
  });
}

function downloadRelease(downloadUrl, destDir) {
  return new Promise((resolve, reject) => {
    const tmpZip = path.join(destDir, 'superclaw-update.zip');
    const file = fs.createWriteStream(tmpZip);
    
    const download = (url) => {
      https.get(url, { headers: { 'User-Agent': 'superclaw-cli' } }, (res) => {
        // Follow redirects
        if (res.statusCode === 302 || res.statusCode === 301) {
          download(res.headers.location);
          return;
        }
        
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          try {
            // Extract zip (extracts superclaw-dashboard-dist/ folder)
            execSync(`unzip -o "${tmpZip}" -d "${destDir}"`, { stdio: 'inherit' });
            fs.unlinkSync(tmpZip);
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', (e) => {
        fs.unlinkSync(tmpZip);
        reject(e);
      });
    };
    
    download(downloadUrl);
  });
}

async function updateDashboard(workspace) {
  try {
    // Get latest release info
    const release = await getLatestRelease();
    
    if (!release.downloadUrl) {
      error('No download available for latest release');
      return;
    }
    
    // Get current version
    const dashboardPath = path.join(workspace, 'node_modules', '@skunkceo', 'superclaw-dashboard');
    const versionPath = path.join(dashboardPath, 'version.json');
    let currentVersion = '0.0.0';
    
    if (fs.existsSync(versionPath)) {
      try {
        const versionData = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
        currentVersion = versionData.version;
      } catch (e) {
        // Fall back to package.json
        try {
          const pkg = require(path.join(dashboardPath, 'package.json'));
          currentVersion = pkg.version;
        } catch (e2) {}
      }
    }
    
    if (currentVersion === release.version) {
      success(`Dashboard is already at latest version (v${currentVersion})`);
      return;
    }
    
    info(`Downloading v${release.version}...`);
    
    // Download to temp directory
    const tmpDir = path.join(workspace, '.superclaw-update-tmp');
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tmpDir, { recursive: true });
    
    await downloadRelease(release.downloadUrl, tmpDir);
    
    // The extracted folder is superclaw-dashboard-dist/
    const extractedPath = path.join(tmpDir, 'superclaw-dashboard-dist');
    
    if (!fs.existsSync(extractedPath)) {
      error('Download extraction failed - directory not found');
      fs.rmSync(tmpDir, { recursive: true, force: true });
      return;
    }
    
    info('Installing dependencies...');
    execSync('npm install --production', { 
      cwd: extractedPath, 
      stdio: 'inherit' 
    });
    
    info('Building dashboard...');
    execSync('npm run build', { 
      cwd: extractedPath, 
      stdio: 'inherit' 
    });
    
    // Backup current dashboard
    const backupPath = path.join(workspace, '.superclaw-dashboard-backup');
    if (fs.existsSync(backupPath)) {
      fs.rmSync(backupPath, { recursive: true, force: true });
    }
    if (fs.existsSync(dashboardPath)) {
      fs.renameSync(dashboardPath, backupPath);
    }
    
    // Move new dashboard into place
    fs.mkdirSync(path.dirname(dashboardPath), { recursive: true });
    fs.renameSync(extractedPath, dashboardPath);
    
    // Clean up
    fs.rmSync(tmpDir, { recursive: true, force: true });
    if (fs.existsSync(backupPath)) {
      fs.rmSync(backupPath, { recursive: true, force: true });
    }
    
    success(`Dashboard updated to v${release.version}`);
    console.log(`\n${colors.yellow}Note: Restart your dashboard process to apply changes.${colors.reset}`);
    
    // Check if user has Pro license and update Pro package
    const license = checkLicense(workspace);
    if (license.valid && license.tier === 'pro') {
      console.log(`\n${colors.cyan}Updating Pro package...${colors.reset}`);
      try {
        const licenseFile = path.join(dashboardPath, '.license');
        if (fs.existsSync(licenseFile)) {
          const licenseData = JSON.parse(fs.readFileSync(licenseFile, 'utf8'));
          installPro(workspace, licenseData.key);
        } else {
          warn('Pro license found but license file missing - skipping Pro update');
        }
      } catch (e) {
        warn('Could not update Pro package: ' + e.message);
      }
    }
  } catch (e) {
    error('Failed to update dashboard: ' + e.message);
  }
}

async function checkForUpdates(workspace, hasDashboard) {
  console.log(`${colors.cyan}Checking for updates...${colors.reset}\n`);

  // Check CLI version
  try {
    const currentCli = require('../../package.json').version;
    const latestCliRaw = execSync('npm view @skunkceo/superclaw-cli version 2>/dev/null', { encoding: 'utf8' }).trim();
    
    if (latestCliRaw && latestCliRaw !== currentCli) {
      warn(`CLI: v${currentCli} → v${latestCliRaw} available`);
    } else {
      success(`CLI: v${currentCli} (latest)`);
    }
  } catch (e) {
    info('CLI: Could not check for updates');
  }

  // Check dashboard version
  if (hasDashboard) {
    try {
      const dashboardPath = path.join(workspace, 'node_modules', '@skunkceo', 'superclaw-dashboard');
      const versionPath = path.join(dashboardPath, 'version.json');
      let currentDash = '0.0.0';
      
      if (fs.existsSync(versionPath)) {
        const versionData = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
        currentDash = versionData.version;
      } else {
        const pkg = require(path.join(dashboardPath, 'package.json'));
        currentDash = pkg.version;
      }
      
      const release = await getLatestRelease();
      
      if (release.version !== currentDash) {
        warn(`Dashboard: v${currentDash} → v${release.version} available`);
      } else {
        success(`Dashboard: v${currentDash} (latest)`);
      }
    } catch (e) {
      info('Dashboard: Could not check for updates');
    }
  } else {
    info('Dashboard: Not installed');
  }

  console.log(`\nRun ${colors.cyan}superclaw update${colors.reset} to install updates.\n`);
}

module.exports = { run };
