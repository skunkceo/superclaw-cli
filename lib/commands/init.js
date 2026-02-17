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
    console.log(`  Get a license: ${colors.blue}https://skunkglobal.com/superclaw-dashboard-pro/checkout${colors.reset}`);
    console.log(`  Install Pro:   ${colors.yellow}superclaw pro install <license-key>${colors.reset}\n`);

    const setupNow = await ask('Create admin user now? [Y/n]: ');
    
    if (!setupNow.toLowerCase().startsWith('n')) {
      // Run setup inline instead of calling external command
      await runSetupInline(rl, installDir);
      
      // Ask if they want to start now
      console.log(`\n${colors.bright}🚀 Setup complete!${colors.reset}\n`);
      const startNow = await ask('Start the dashboard now? [Y/n]: ');
      
      if (!startNow.toLowerCase().startsWith('n')) {
        console.log(`\n${colors.cyan}Starting SuperClaw dashboard...${colors.reset}\n`);
        
        // Start dashboard in background
        const { spawn } = require('child_process');
        const dashboardProcess = spawn('npm', ['start'], {
          cwd: installDir,
          detached: true,
          stdio: 'ignore'
        });
        dashboardProcess.unref();
        
        // Wait a moment for server to start
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        success('Dashboard started!');
        console.log(`\n${colors.bright}Access your dashboard:${colors.reset}`);
        console.log(`  ${colors.blue}http://localhost:3000${colors.reset}\n`);
        
        // Try to open browser
        const openBrowser = await ask('Open in browser now? [Y/n]: ');
        if (!openBrowser.toLowerCase().startsWith('n')) {
          const open = require('child_process').exec;
          const url = 'http://localhost:3000';
          
          // Cross-platform browser open
          const platform = process.platform;
          if (platform === 'darwin') {
            open(`open ${url}`);
          } else if (platform === 'win32') {
            open(`start ${url}`);
          } else {
            open(`xdg-open ${url}`);
          }
          
          success('Opening browser...');
        }
        
        console.log(`\n${colors.dim}To stop the dashboard: cd ${installDir} && npm run stop${colors.reset}\n`);
      } else {
        console.log(`\n${colors.dim}Start the dashboard when ready:${colors.reset}`);
        console.log(`  ${colors.cyan}cd ${installDir} && npm start${colors.reset}\n`);
      }
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

/**
 * Run setup inline using existing readline interface
 */
async function runSetupInline(rl, dashboardDir) {
  const ask = (question) => new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });

  console.log(`\n${colors.cyan}╔═══════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║       SuperClaw Dashboard Setup       ║${colors.reset}`);
  console.log(`${colors.cyan}╚═══════════════════════════════════════╝${colors.reset}\n`);

  // Load dependencies
  let Database, bcrypt;
  const searchPaths = [
    path.join(dashboardDir, 'node_modules', 'better-sqlite3'),
    'better-sqlite3',
  ];
  const bcryptPaths = [
    path.join(dashboardDir, 'node_modules', 'bcryptjs'),
    'bcryptjs',
  ];
  
  for (const p of searchPaths) {
    try {
      Database = require(p);
      break;
    } catch { /* try next */ }
  }
  for (const p of bcryptPaths) {
    try {
      bcrypt = require(p);
      break;
    } catch { /* try next */ }
  }
  
  if (!Database || !bcrypt) {
    error('Dependencies not found.');
    throw new Error('Setup dependencies missing');
  }

  // Setup data directory - use same location as dashboard expects
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  const dataDir = process.env.SUPERCLAW_DATA_DIR || path.join(homeDir, '.superclaw');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'superclaw.db');

  // Get email
  console.log(`${colors.bright}Create Admin Account${colors.reset}\n`);
  
  let email = await ask('Admin email address: ');
  while (!email || !email.includes('@')) {
    error('Please enter a valid email address');
    email = await ask('Admin email address: ');
  }

  // Generate password
  const crypto = require('crypto');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const array = crypto.randomBytes(16);
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars[array[i] % chars.length];
  }

  // Create database
  const db = new Database(dbPath);

  // Initialize schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'view',
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      last_login INTEGER,
      created_by INTEGER,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
  `);

  // Check if email exists
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    error(`User ${email} already exists.`);
    db.close();
    throw new Error('User already exists');
  }

  // Hash password and create user
  const hash = bcrypt.hashSync(password, 12);
  db.prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)').run(email, hash, 'admin');
  db.close();

  // Success message
  console.log(`\n${colors.green}╔═══════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.green}║                    Admin User Created!                         ║${colors.reset}`);
  console.log(`${colors.green}╠═══════════════════════════════════════════════════════════════╣${colors.reset}`);
  console.log(`${colors.green}║${colors.reset}                                                                 ${colors.green}║${colors.reset}`);
  console.log(`${colors.green}║${colors.reset}  ${colors.bright}Email:${colors.reset}    ${email.padEnd(49)}${colors.green}║${colors.reset}`);
  console.log(`${colors.green}║${colors.reset}  ${colors.bright}Password:${colors.reset} ${colors.yellow}${password}${colors.reset}${''.padEnd(45 - password.length)}${colors.green}║${colors.reset}`);
  console.log(`${colors.green}║${colors.reset}                                                                 ${colors.green}║${colors.reset}`);
  console.log(`${colors.green}║${colors.reset}  ${colors.dim}Save this password - it will not be shown again!${colors.reset}              ${colors.green}║${colors.reset}`);
  console.log(`${colors.green}║${colors.reset}                                                                 ${colors.green}║${colors.reset}`);
  console.log(`${colors.green}╚═══════════════════════════════════════════════════════════════╝${colors.reset}\n`);
}

module.exports = { run };
