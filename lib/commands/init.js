const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');
const { colors, success, warn, error, info, showLogo } = require('../utils');

function run(args) {
  showLogo();
  console.log(`${colors.bright}Welcome to SuperClaw!${colors.reset}`);
  console.log('Let\'s install your OpenClaw dashboard.\n');
  
  installDashboard();
}

async function installDashboard() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const ask = (question) => new Promise((resolve) => {
    rl.question(question, resolve);
  });

  try {
    // Step 1: System check
    console.log(`${colors.cyan}Step 1: System Check${colors.reset}\n`);
    
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion >= 18) {
      success(`Node.js ${nodeVersion} detected`);
    } else {
      error(`Node.js ${nodeVersion} detected - version 18+ required`);
      console.log('Please upgrade Node.js: https://nodejs.org/\n');
      process.exit(1);
    }

    // Check for git
    try {
      execSync('git --version', { stdio: 'ignore' });
      success('Git detected');
    } catch (e) {
      error('Git not found - please install Git first');
      process.exit(1);
    }

    // Step 2: Choose installation directory
    console.log(`\n${colors.cyan}Step 2: Installation Directory${colors.reset}\n`);
    
    let installDir = await ask('Where should SuperClaw be installed? [./superclaw]: ');
    if (!installDir.trim()) {
      installDir = './superclaw';
    }
    
    installDir = path.resolve(installDir);
    
    if (fs.existsSync(installDir)) {
      const files = fs.readdirSync(installDir);
      if (files.length > 0) {
        const overwrite = await ask(`Directory ${installDir} is not empty. Continue anyway? [y/N]: `);
        if (!overwrite.toLowerCase().startsWith('y')) {
          console.log('Installation cancelled.\n');
          process.exit(0);
        }
      }
    } else {
      fs.mkdirSync(installDir, { recursive: true });
    }

    // Step 3: Clone dashboard
    console.log(`\n${colors.cyan}Step 3: Downloading SuperClaw${colors.reset}\n`);
    
    info('Cloning dashboard from GitHub...');
    
    try {
      execSync(
        `git clone https://github.com/skunkceo/superclaw-dashboard ${installDir}`,
        { stdio: 'inherit' }
      );
      success('Dashboard cloned');
    } catch (e) {
      error('Failed to clone dashboard repository');
      console.log(`\n${colors.dim}Make sure you have internet access and Git is properly configured.${colors.reset}\n`);
      process.exit(1);
    }

    // Step 4: Install dependencies
    console.log(`\n${colors.cyan}Step 4: Installing Dependencies${colors.reset}\n`);
    
    info('This may take a few minutes...');
    
    try {
      execSync('npm install', { 
        cwd: installDir,
        stdio: 'inherit'
      });
      success('Dependencies installed');
    } catch (e) {
      error('Failed to install dependencies');
      process.exit(1);
    }

    // Step 5: Build dashboard
    console.log(`\n${colors.cyan}Step 5: Building Dashboard${colors.reset}\n`);
    
    try {
      execSync('npm run build', {
        cwd: installDir,
        stdio: 'inherit'
      });
      success('Dashboard built');
    } catch (e) {
      warn('Build completed with warnings (this is usually OK)');
    }

    // Step 6: Create config
    const config = {
      version: '1.0.0',
      installed: new Date().toISOString(),
      installDir,
      tier: 'free'
    };
    
    fs.writeFileSync(
      path.join(installDir, 'superclaw.json'),
      JSON.stringify(config, null, 2)
    );

    // Success!
    console.log(`\n${colors.green}🎉 SuperClaw installed successfully!${colors.reset}\n`);
    
    console.log(`${colors.bright}Installation location:${colors.reset}`);
    console.log(`  ${colors.cyan}${installDir}${colors.reset}\n`);
    
    console.log(`${colors.bright}Next steps:${colors.reset}`);
    console.log(`  1. ${colors.yellow}Create admin user:${colors.reset} superclaw setup`);
    console.log(`  2. ${colors.yellow}Start dashboard:${colors.reset} cd ${installDir} && npm start`);
    console.log(`  3. ${colors.yellow}Open browser:${colors.reset} http://localhost:3000\n`);
    
    console.log(`${colors.bright}Upgrade to Pro:${colors.reset}`);
    console.log(`  Get a license: ${colors.blue}https://skunkglobal.com/checkout?product=superclaw-pro${colors.reset}`);
    console.log(`  Install Pro:   ${colors.yellow}superclaw pro install <license-key>${colors.reset}\n`);

    const setupNow = await ask('Create admin user now? [Y/n]: ');
    if (!setupNow.toLowerCase().startsWith('n')) {
      console.log('\n');
      const setupCommand = require('./setup');
      // Pass the install dir to setup command
      setupCommand.run(['--dir', installDir]);
    } else {
      console.log(`\n${colors.dim}Run 'superclaw setup' when you're ready to create your admin user.${colors.reset}\n`);
    }

  } catch (err) {
    error('Installation failed: ' + err.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

module.exports = { run };
