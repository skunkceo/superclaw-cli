const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { colors, success, warn, error, info } = require('../utils');

/**
 * Fix dashboard .env configuration
 * Ensures OPENCLAW_WORKSPACE is correctly set
 */
async function run(args) {
  console.log(`\n${colors.cyan}SuperClaw Environment Fix${colors.reset}\n`);
  
  // Find OpenClaw workspace
  let openclawWorkspace;
  try {
    const status = execSync('openclaw status --json', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
    const statusData = JSON.parse(status);
    openclawWorkspace = statusData.workspace;
  } catch (e) {
    const homeDir = process.env.HOME || process.env.USERPROFILE || process.env.HOMEPATH;
    openclawWorkspace = path.join(homeDir, '.openclaw', 'workspace');
    warn(`OpenClaw not running. Using default: ${openclawWorkspace}`);
  }
  
  if (!fs.existsSync(openclawWorkspace)) {
    error('OpenClaw workspace not found');
    console.log('\nOptions:');
    console.log('  1. Start OpenClaw: openclaw gateway start');
    console.log('  2. Install OpenClaw: npm install -g openclaw\n');
    process.exit(1);
  }
  
  success(`Found OpenClaw workspace: ${openclawWorkspace}`);
  
  // Find dashboard directory
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  const commonPaths = [
    process.cwd(),
    './superclaw',
    path.join(process.cwd(), 'superclaw'),
    path.join(homeDir, 'Documents', 'superclaw'),
    path.join(homeDir, 'superclaw'),
    process.env.SUPERCLAW_DIR
  ].filter(Boolean);
  
  let dashboardDir;
  for (const p of commonPaths) {
    const pkgPath = path.join(p, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.name === '@skunkceo/superclaw-dashboard') {
          dashboardDir = p;
          break;
        }
      } catch (e) {
        // Not a valid package.json, try next
      }
    }
  }
  
  if (!dashboardDir) {
    error('Could not find SuperClaw dashboard');
    console.log('\nRun this command from the dashboard directory, or specify the path:');
    console.log(`  ${colors.yellow}superclaw fix-env --dir /path/to/superclaw${colors.reset}\n`);
    process.exit(1);
  }
  
  success(`Found dashboard: ${dashboardDir}`);
  
  // Check/create .env file
  const envPath = path.join(dashboardDir, '.env');
  const envContent = `OPENCLAW_WORKSPACE=${openclawWorkspace}\n`;
  
  if (fs.existsSync(envPath)) {
    const existing = fs.readFileSync(envPath, 'utf-8');
    if (existing.includes('OPENCLAW_WORKSPACE')) {
      const match = existing.match(/OPENCLAW_WORKSPACE=(.+)/);
      if (match && match[1].trim() === openclawWorkspace) {
        success('.env already configured correctly');
        console.log(`\n${colors.dim}No changes needed.${colors.reset}\n`);
        return;
      } else {
        info('.env exists but has wrong path, updating...');
        // Replace the line
        const updated = existing.replace(/OPENCLAW_WORKSPACE=.+/, `OPENCLAW_WORKSPACE=${openclawWorkspace}`);
        fs.writeFileSync(envPath, updated);
        success('Updated .env file');
      }
    } else {
      info('.env exists but missing OPENCLAW_WORKSPACE, adding...');
      fs.appendFileSync(envPath, envContent);
      success('Added OPENCLAW_WORKSPACE to .env');
    }
  } else {
    info('Creating .env file...');
    fs.writeFileSync(envPath, envContent);
    success('Created .env file');
  }
  
  console.log(`\n${colors.green}✓ Configuration fixed!${colors.reset}\n`);
  console.log(`Dashboard is now configured to use:`);
  console.log(`  ${colors.cyan}${openclawWorkspace}${colors.reset}\n`);
  console.log(`${colors.bright}Next steps:${colors.reset}`);
  console.log(`  1. Restart the dashboard: cd ${dashboardDir} && npm run dev`);
  console.log(`  2. Memory files should now load correctly`);
  console.log(`  3. Agent workspaces should be accessible\n`);
}

module.exports = { run };
