const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');
const { colors, success, warn, error, info, showLogo } = require('../utils');

function run(args) {
  showLogo();
  
  // Show versions
  const cliPkg = require(path.join(__dirname, '..', '..', 'package.json'));
  console.log(`${colors.bright}Welcome to SuperClaw!${colors.reset}`);
  console.log(`${colors.dim}CLI version: ${cliPkg.version}${colors.reset}`);
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
      rl.close();
      process.exit(1);
    }

    // Check for git
    try {
      execSync('git --version', { stdio: 'ignore' });
      success('Git detected');
    } catch (e) {
      error('Git not found - please install Git first');
      rl.close();
      process.exit(1);
    }

    // Check for OpenClaw
    let openclawInstalled = false;
    try {
      execSync('openclaw --version', { stdio: 'ignore' });
      success('OpenClaw detected');
      openclawInstalled = true;
    } catch (e) {
      warn('OpenClaw not found');
      console.log(`\n${colors.yellow}SuperClaw requires OpenClaw to be installed.${colors.reset}`);
      console.log(`\nInstall OpenClaw first:`);
      console.log(`  ${colors.cyan}npm install -g openclaw${colors.reset}`);
      console.log(`  ${colors.cyan}openclaw gateway start${colors.reset}\n`);
      
      const continueAnyway = await ask('Continue without OpenClaw? (dashboard will not work) [y/N]: ');
      if (!continueAnyway.toLowerCase().startsWith('y')) {
        console.log(`\n${colors.dim}Install OpenClaw first, then run: superclaw init${colors.reset}\n`);
        rl.close();
        process.exit(0);
      }
      warn('Continuing without OpenClaw - dashboard will show setup screen');
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
        const overwrite = await ask(`Directory ${installDir} is not empty. Clear it and reinstall? [y/N]: `);
        if (!overwrite.toLowerCase().startsWith('y')) {
          console.log('Installation cancelled.\n');
          process.exit(0);
        }
        // Clear the directory so git clone has a clean target
        info('Clearing existing directory...');
        fs.rmSync(installDir, { recursive: true, force: true });
        fs.mkdirSync(installDir, { recursive: true });
      }
    } else {
      fs.mkdirSync(installDir, { recursive: true });
    }

    // Step 3: Clone dashboard
    console.log(`\n${colors.cyan}Step 3: Downloading SuperClaw${colors.reset}\n`);
    
    info('Cloning dashboard from GitHub...');
    
    try {
      // Clone directly into installDir (it's now empty)
      execSync(
        `git clone https://github.com/skunkceo/superclaw-dashboard-dist "${installDir}"`,
        { stdio: 'pipe' }
      );
      
      // Show dashboard version
      const dashboardPkg = JSON.parse(fs.readFileSync(path.join(installDir, 'package.json'), 'utf-8'));
      success(`Dashboard cloned (v${dashboardPkg.version})`);
    } catch (e) {
      error('Failed to clone dashboard repository');
      console.log(`\nError: ${e.message}`);
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
      
      // Setup agents after user is created
      const { setupAgents } = require('./init-agents');
      await setupAgents(rl, openclawInstalled);
      
      // Ask if they want to start now
      console.log(`\n${colors.bright}🚀 Setup complete!${colors.reset}\n`);
      const startNow = await ask('Start the dashboard now? [Y/n]: ');
      
      if (!startNow.toLowerCase().startsWith('n')) {
        console.log(`\n${colors.cyan}Starting SuperClaw dashboard...${colors.reset}`);
        info('The dashboard will start in development mode (with live reload)\n');
        
        // Give DB a moment to flush to disk
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Start dashboard in background
        const { spawn } = require('child_process');
        const logPath = path.join(installDir, 'dashboard.log');
        
        const dashboardProcess = spawn('npm', ['run', 'dev'], {
          cwd: installDir,
          detached: true,
          stdio: 'ignore'
        });
        dashboardProcess.unref();
        
        console.log(`${colors.dim}Waiting for dashboard to start (this may take 30-60 seconds)...${colors.reset}`);
        
        // Poll for server to be ready (check localhost:3000)
        const http = require('http');
        let attempts = 0;
        let serverReady = false;
        
        while (attempts < 60 && !serverReady) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
          
          try {
            await new Promise((resolve, reject) => {
              const req = http.get('http://localhost:3000', (res) => {
                if (res.statusCode === 200 || res.statusCode === 404) {
                  serverReady = true;
                  resolve();
                } else {
                  reject();
                }
              });
              req.on('error', reject);
              req.setTimeout(1000, () => {
                req.destroy();
                reject();
              });
            });
          } catch (e) {
            // Server not ready yet, continue polling
            if (attempts % 10 === 0) {
              console.log(`${colors.dim}Still waiting... (${attempts}s)${colors.reset}`);
            }
          }
        }
        
        if (serverReady) {
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
          
          console.log(`\n${colors.dim}Dashboard is running in the background.${colors.reset}`);
          console.log(`${colors.dim}Logs: ${logPath}${colors.reset}`);
          console.log(`${colors.dim}To stop: ps aux | grep "next dev" | grep -v grep | awk '{print $2}' | xargs kill${colors.reset}\n`);
        } else {
          warn('Dashboard did not start within 60 seconds');
          console.log(`\n${colors.yellow}Check the logs:${colors.reset}`);
          console.log(`  ${colors.cyan}tail -f ${logPath}${colors.reset}\n`);
          console.log(`${colors.yellow}Or start manually:${colors.reset}`);
          console.log(`  ${colors.cyan}cd ${installDir} && npm run dev${colors.reset}\n`);
        }
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
    warn(`User ${email} already exists.`);
    console.log('\nOptions:');
    console.log('  1. Use a different email address');
    console.log('  2. Reset password for this user');
    console.log('  3. Start fresh (delete all users and data)');
    console.log('  4. Cancel\n');
    
    const choice = await ask('Choose an option [1-4]: ');
    
    if (choice === '1') {
      // Loop back to get new email
      db.close();
      email = await ask('\nAdmin email address: ');
      while (!email || !email.includes('@')) {
        error('Please enter a valid email address');
        email = await ask('Admin email address: ');
      }
      
      // Re-open database and check again
      const db2 = new Database(dbPath);
      const existing2 = db2.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existing2) {
        error(`User ${email} also exists.`);
        console.log(`\nDatabase location: ${colors.cyan}${dbPath}${colors.reset}`);
        console.log(`To start completely fresh, delete: ${colors.yellow}rm -rf ~/.superclaw${colors.reset}\n`);
        db2.close();
        throw new Error('User already exists');
      }
      db2.close();
      
      // Reopen original db and continue with new email
      const db3 = new Database(dbPath);
      const hash = bcrypt.hashSync(password, 12);
      db3.prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)').run(email, hash, 'admin');
      db3.close();
    } else if (choice === '2') {
      // Reset password
      const hash = bcrypt.hashSync(password, 12);
      db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(hash, email);
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(existing.id);
      db.close();
    } else if (choice === '3') {
      // Delete everything and start fresh
      warn('This will delete ALL users and data!');
      const confirm = await ask('Are you sure? Type "yes" to confirm: ');
      
      if (confirm.toLowerCase() === 'yes') {
        db.close();
        fs.unlinkSync(dbPath);
        success('Database deleted. Starting fresh...\n');
        
        // Re-create fresh database
        const dbNew = new Database(dbPath);
        dbNew.exec(`
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
        
        const hash = bcrypt.hashSync(password, 12);
        dbNew.prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)').run(email, hash, 'admin');
        dbNew.close();
      } else {
        db.close();
        console.log(`\n${colors.dim}Setup cancelled.${colors.reset}\n`);
        throw new Error('Setup cancelled');
      }
    } else {
      // Cancel
      db.close();
      console.log(`\n${colors.dim}Setup cancelled.${colors.reset}\n`);
      throw new Error('Setup cancelled');
    }
  } else {
    // No existing user - create new one
    const hash = bcrypt.hashSync(password, 12);
    db.prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)').run(email, hash, 'admin');
    db.close();
  }

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
  
  info(`Database location: ${dataDir}`);
  console.log(`${colors.dim}User data persists across reinstalls. To reset: rm -rf ${dataDir}${colors.reset}\n`);
}

module.exports = { run };
