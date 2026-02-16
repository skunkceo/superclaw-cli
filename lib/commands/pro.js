const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { colors, success, warn, error, info } = require('../utils');

/**
 * Check if user has a valid Pro license
 * Returns { valid: boolean, tier: string }
 */
function checkLicense(workspace) {
  try {
    // Check if dashboard has Pro installed
    const dashboardPath = path.join(workspace, 'node_modules', '@skunkceo', 'superclaw-dashboard');
    if (!fs.existsSync(dashboardPath)) {
      return { valid: false, tier: 'free' };
    }

    // Check package.json for Pro marker
    const pkgPath = path.join(dashboardPath, 'package.json');
    if (!fs.existsSync(pkgPath)) {
      return { valid: false, tier: 'free' };
    }

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (pkg.superclaw?.pro?.installed) {
      return { valid: true, tier: 'pro' };
    }

    // TODO: Check license key via API when available
    // For now, assume free tier if no Pro marker
    return { valid: false, tier: 'free' };
  } catch (e) {
    console.error('License check failed:', e.message);
    return { valid: false, tier: 'free' };
  }
}

/**
 * Install Pro package
 */
function installPro(workspace, licenseKey) {
  console.log(`\n${colors.cyan}${colors.bright}Installing SuperClaw Pro${colors.reset}\n`);

  const dashboardPath = path.join(workspace, 'node_modules', '@skunkceo', 'superclaw-dashboard');
  
  if (!fs.existsSync(dashboardPath)) {
    error('SuperClaw dashboard not found. Install it first with: superclaw init');
    process.exit(1);
  }

  // Validate license key
  console.log(`${colors.cyan}Validating license...${colors.reset}`);
  const isValid = validateLicenseKey(licenseKey);
  
  if (!isValid) {
    error('Invalid license key');
    console.log(`\nGet a license at: ${colors.blue}https://skunkglobal.com/superclaw-pro/checkout${colors.reset}\n`);
    process.exit(1);
  }
  
  success('License valid');

  // Clone Pro repo (requires authentication)
  console.log(`\n${colors.cyan}Downloading Pro package...${colors.reset}`);
  const tmpDir = path.join('/tmp', 'superclaw-pro-' + Date.now());
  
  try {
    // Try to clone the private repo
    execSync(
      `git clone https://github.com/skunkceo/superclaw-dashboard-pro ${tmpDir}`,
      { stdio: 'ignore' }
    );
  } catch (e) {
    error('Failed to download Pro package');
    console.log('\nMake sure you have access to the private repository.');
    console.log('Configure GitHub credentials with: gh auth login\n');
    process.exit(1);
  }

  success('Pro package downloaded');

  // Run the Pro installer
  console.log(`\n${colors.cyan}Installing Pro features...${colors.reset}`);
  try {
    execSync(
      `node ${path.join(tmpDir, 'install.js')}`,
      { cwd: dashboardPath, stdio: 'inherit' }
    );
  } catch (e) {
    error('Pro installation failed: ' + e.message);
    // Clean up
    execSync(`rm -rf ${tmpDir}`, { stdio: 'ignore' });
    process.exit(1);
  }

  // Clean up temp directory
  execSync(`rm -rf ${tmpDir}`, { stdio: 'ignore' });

  // Store license info (encrypted in production)
  const licenseFile = path.join(dashboardPath, '.license');
  fs.writeFileSync(licenseFile, JSON.stringify({
    key: licenseKey,
    activatedAt: Date.now(),
    tier: 'pro'
  }, null, 2));

  success('Pro features installed successfully!');
  
  // Rebuild dashboard
  console.log(`\n${colors.cyan}Rebuilding dashboard...${colors.reset}`);
  try {
    execSync('npm run build', { cwd: dashboardPath, stdio: 'inherit' });
    success('Dashboard rebuilt');
  } catch (e) {
    warn('Build failed - you may need to rebuild manually');
  }

  console.log(`\n${colors.green}${colors.bright}SuperClaw Pro is ready!${colors.reset}`);
  console.log(`\nRestart your dashboard to see Pro features.\n`);
}

/**
 * Validate license key format and check with API
 */
function validateLicenseKey(key) {
  if (!key || typeof key !== 'string') {
    return false;
  }

  // Basic format check
  if (key.length < 20) {
    return false;
  }

  // TODO: Call skunkglobal.com API to validate license
  // For now, just check format
  return /^[A-Z0-9-]{20,}$/i.test(key);
}

/**
 * Show Pro status
 */
function showStatus(workspace) {
  const license = checkLicense(workspace);
  
  console.log(`\n${colors.cyan}${colors.bright}SuperClaw License Status${colors.reset}\n`);
  
  if (license.valid && license.tier === 'pro') {
    success(`Status: ${colors.green}Pro${colors.reset}`);
    
    // Try to read license file for more details
    try {
      const dashboardPath = path.join(workspace, 'node_modules', '@skunkceo', 'superclaw-dashboard');
      const licenseFile = path.join(dashboardPath, '.license');
      if (fs.existsSync(licenseFile)) {
        const licenseData = JSON.parse(fs.readFileSync(licenseFile, 'utf8'));
        const activatedDate = new Date(licenseData.activatedAt).toLocaleDateString();
        info(`Activated: ${activatedDate}`);
      }

      // Show Pro version
      const pkgPath = path.join(dashboardPath, 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.superclaw?.pro?.version) {
        info(`Pro Version: ${pkg.superclaw.pro.version}`);
      }
    } catch (e) {
      // Ignore errors reading license details
    }
  } else {
    info(`Status: ${colors.yellow}Free${colors.reset}`);
    console.log(`\nUpgrade to Pro for advanced features:`);
    console.log(`  • Smart Router - AI model selection`);
    console.log(`  • Team Management - Multi-user collaboration`);
    console.log(`  • Task Management - Project tracking`);
    console.log(`  • Advanced Analytics`);
    console.log(`  • Skills Marketplace`);
    console.log(`  • Command Palette`);
    console.log(`\n${colors.blue}https://skunkglobal.com/superclaw-pro/checkout${colors.reset}`);
  }
  
  console.log('');
}

function run(args) {
  // Find workspace
  let dir = process.cwd();
  let workspace = null;
  
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'AGENTS.md')) || 
        fs.existsSync(path.join(dir, '.clawdbot')) ||
        fs.existsSync(path.join(dir, 'clawdbot.json'))) {
      workspace = dir;
      break;
    }
    dir = path.dirname(dir);
  }

  if (!workspace) {
    error('No SuperClaw workspace found.');
    console.log('Run this command from your workspace directory.\n');
    process.exit(1);
  }

  const subcommand = args[0];

  if (!subcommand || subcommand === 'status') {
    showStatus(workspace);
  } else if (subcommand === 'install' || subcommand === 'activate') {
    const licenseKey = args[1];
    if (!licenseKey) {
      error('Please provide your license key');
      console.log('\nUsage: superclaw pro install <license-key>\n');
      process.exit(1);
    }
    installPro(workspace, licenseKey);
  } else {
    error(`Unknown subcommand: ${subcommand}`);
    console.log('\nAvailable commands:');
    console.log('  superclaw pro status                 Check license status');
    console.log('  superclaw pro install <license-key>  Install Pro features');
    console.log('');
  }
}

module.exports = { run, checkLicense, installPro };
