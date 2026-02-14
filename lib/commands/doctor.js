const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { colors, success, warn, error, info } = require('../../bin/superclaw');

function run(args) {
  console.log(`${colors.cyan}🩺 Superclaw Doctor${colors.reset}\n`);
  console.log('Running comprehensive diagnostics...\n');
  
  const workspaceDir = findWorkspace();
  if (!workspaceDir) {
    error('No Superclaw workspace found.');
    console.log('Run \'superclaw init\' to create a workspace first.\n');
    return;
  }

  runDiagnostics(workspaceDir);
}

function runDiagnostics(workspaceDir) {
  const issues = [];
  
  console.log(`${colors.bright}🔍 System Diagnostics${colors.reset}\n`);
  
  // 1. System Requirements
  console.log(`${colors.cyan}1. System Requirements${colors.reset}`);
  checkSystemRequirements(issues);
  
  // 2. Workspace Structure
  console.log(`\n${colors.cyan}2. Workspace Structure${colors.reset}`);
  checkWorkspaceStructure(workspaceDir, issues);
  
  // 3. Configuration Files
  console.log(`\n${colors.cyan}3. Configuration Files${colors.reset}`);
  checkConfigurationFiles(workspaceDir, issues);
  
  // 4. Memory System
  console.log(`\n${colors.cyan}4. Memory System${colors.reset}`);
  checkMemorySystem(workspaceDir, issues);
  
  // 5. Channel Connections
  console.log(`\n${colors.cyan}5. Channel Connections${colors.reset}`);
  checkChannelConnections(workspaceDir, issues);
  
  // 6. Modules
  console.log(`\n${colors.cyan}6. Installed Modules${colors.reset}`);
  checkModules(workspaceDir, issues);
  
  // 7. File Permissions
  console.log(`\n${colors.cyan}7. File Permissions${colors.reset}`);
  checkFilePermissions(workspaceDir, issues);
  
  // 8. Network Connectivity
  console.log(`\n${colors.cyan}8. Network Connectivity${colors.reset}`);
  checkNetworkConnectivity(issues);
  
  // Show summary
  showDiagnosticSummary(issues);
}

function checkSystemRequirements(issues) {
  // Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion >= 16) {
    console.log(`  ${colors.green}✓${colors.reset} Node.js ${nodeVersion} (minimum 16.0.0)`);
  } else {
    console.log(`  ${colors.red}✗${colors.reset} Node.js ${nodeVersion} - requires 16.0.0 or higher`);
    issues.push({
      type: 'critical',
      category: 'System',
      issue: 'Node.js version too old',
      fix: 'Update Node.js from https://nodejs.org/'
    });
  }
  
  // Available memory
  const freeMem = process.memoryUsage();
  const freeMemMB = Math.round(freeMem.heapUsed / 1024 / 1024);
  
  if (freeMemMB < 100) {
    console.log(`  ${colors.green}✓${colors.reset} Memory usage: ${freeMemMB}MB`);
  } else {
    console.log(`  ${colors.yellow}!${colors.reset} Memory usage: ${freeMemMB}MB (higher than expected)`);
    issues.push({
      type: 'warning',
      category: 'System',
      issue: 'High memory usage',
      fix: 'Close other applications or restart Node.js'
    });
  }
  
  // Platform
  console.log(`  ${colors.green}✓${colors.reset} Platform: ${process.platform} (${process.arch})`);
}

function checkWorkspaceStructure(workspaceDir, issues) {
  const requiredFiles = [
    'superclaw-config.json',
    'SOUL.md',
    'USER.md', 
    'AGENTS.md',
    'MEMORY.md'
  ];
  
  const requiredDirs = [
    'memory'
  ];
  
  // Check files
  for (const file of requiredFiles) {
    const filePath = path.join(workspaceDir, file);
    if (fs.existsSync(filePath)) {
      console.log(`  ${colors.green}✓${colors.reset} ${file}`);
    } else {
      console.log(`  ${colors.red}✗${colors.reset} ${file} (missing)`);
      issues.push({
        type: 'critical',
        category: 'Workspace',
        issue: `Missing required file: ${file}`,
        fix: `Re-run 'superclaw init' or create ${file} manually`
      });
    }
  }
  
  // Check directories
  for (const dir of requiredDirs) {
    const dirPath = path.join(workspaceDir, dir);
    if (fs.existsSync(dirPath)) {
      console.log(`  ${colors.green}✓${colors.reset} ${dir}/ directory`);
    } else {
      console.log(`  ${colors.yellow}!${colors.reset} ${dir}/ directory (missing)`);
      issues.push({
        type: 'warning',
        category: 'Workspace',
        issue: `Missing directory: ${dir}`,
        fix: `Create directory: mkdir -p ${dirPath}`
      });
    }
  }
}

function checkConfigurationFiles(workspaceDir, issues) {
  // Check superclaw-config.json
  const configPath = path.join(workspaceDir, 'superclaw-config.json');
  
  if (!fs.existsSync(configPath)) {
    console.log(`  ${colors.red}✗${colors.reset} Configuration file missing`);
    issues.push({
      type: 'critical',
      category: 'Configuration',
      issue: 'superclaw-config.json missing',
      fix: 'Re-run \'superclaw init\' to recreate configuration'
    });
    return;
  }
  
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log(`  ${colors.green}✓${colors.reset} Configuration file valid JSON`);
    
    // Check required fields
    const requiredFields = ['version', 'workspace', 'ai', 'user'];
    for (const field of requiredFields) {
      if (config[field]) {
        console.log(`  ${colors.green}✓${colors.reset} Configuration has ${field}`);
      } else {
        console.log(`  ${colors.yellow}!${colors.reset} Configuration missing ${field}`);
        issues.push({
          type: 'warning',
          category: 'Configuration',
          issue: `Missing configuration field: ${field}`,
          fix: 'Update configuration file or re-run setup'
        });
      }
    }
    
    // Check AI configuration
    if (config.ai) {
      if (config.ai.name) {
        console.log(`  ${colors.green}✓${colors.reset} AI name configured: ${config.ai.name}`);
      } else {
        console.log(`  ${colors.yellow}!${colors.reset} AI name not set`);
        issues.push({
          type: 'warning',
          category: 'Configuration',
          issue: 'AI name not configured',
          fix: 'Run \'superclaw soul\' to set AI personality'
        });
      }
    }
    
  } catch (err) {
    console.log(`  ${colors.red}✗${colors.reset} Configuration file corrupted: ${err.message}`);
    issues.push({
      type: 'critical',
      category: 'Configuration', 
      issue: 'Configuration file corrupted',
      fix: 'Fix JSON syntax or re-run \'superclaw init\''
    });
  }
  
  // Check SOUL.md
  const soulPath = path.join(workspaceDir, 'SOUL.md');
  if (fs.existsSync(soulPath)) {
    const soulContent = fs.readFileSync(soulPath, 'utf8');
    if (soulContent.includes('{AI_NAME}') || soulContent.includes('{PERSONALITY_TYPE}')) {
      console.log(`  ${colors.yellow}!${colors.reset} SOUL.md has placeholder values`);
      issues.push({
        type: 'warning',
        category: 'Configuration',
        issue: 'SOUL.md not fully configured',
        fix: 'Run \'superclaw soul\' to complete AI personality setup'
      });
    } else {
      console.log(`  ${colors.green}✓${colors.reset} SOUL.md configured`);
    }
  }
}

function checkMemorySystem(workspaceDir, issues) {
  const memoryDir = path.join(workspaceDir, 'memory');
  
  if (!fs.existsSync(memoryDir)) {
    console.log(`  ${colors.red}✗${colors.reset} Memory directory missing`);
    issues.push({
      type: 'critical',
      category: 'Memory',
      issue: 'Memory directory missing',
      fix: `Create directory: mkdir -p ${memoryDir}`
    });
    return;
  }
  
  console.log(`  ${colors.green}✓${colors.reset} Memory directory exists`);
  
  // Check for memory files
  const memoryFiles = fs.readdirSync(memoryDir).filter(f => f.endsWith('.md'));
  
  if (memoryFiles.length === 0) {
    console.log(`  ${colors.yellow}!${colors.reset} No daily memory files found`);
    issues.push({
      type: 'info',
      category: 'Memory',
      issue: 'No daily memory files',
      fix: 'Memory files will be created automatically during AI interactions'
    });
  } else {
    console.log(`  ${colors.green}✓${colors.reset} ${memoryFiles.length} daily memory files`);
    
    // Check for today's file
    const today = new Date().toISOString().slice(0, 10);
    const todayFile = `${today}.md`;
    
    if (memoryFiles.includes(todayFile)) {
      console.log(`  ${colors.green}✓${colors.reset} Today's memory file exists`);
    } else {
      console.log(`  ${colors.blue}i${colors.reset} No memory file for today yet`);
    }
  }
  
  // Check memory file permissions
  try {
    const testFile = path.join(memoryDir, 'test-write.tmp');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    console.log(`  ${colors.green}✓${colors.reset} Memory directory writable`);
  } catch (err) {
    console.log(`  ${colors.red}✗${colors.reset} Memory directory not writable`);
    issues.push({
      type: 'critical',
      category: 'Memory',
      issue: 'Cannot write to memory directory',
      fix: 'Check file permissions: chmod 755 ' + memoryDir
    });
  }
}

function checkChannelConnections(workspaceDir, issues) {
  const configPath = path.join(workspaceDir, 'superclaw-config.json');
  
  if (!fs.existsSync(configPath)) {
    console.log(`  ${colors.yellow}!${colors.reset} No configuration file to check channels`);
    return;
  }
  
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    if (!config.channels || Object.keys(config.channels).length === 0) {
      console.log(`  ${colors.blue}i${colors.reset} No channels configured yet`);
      issues.push({
        type: 'info',
        category: 'Channels',
        issue: 'No communication channels configured',
        fix: 'Run \'superclaw connect\' to set up Slack, Discord, etc.'
      });
      return;
    }
    
    for (const [channelName, channelConfig] of Object.entries(config.channels)) {
      if (channelConfig.enabled) {
        const configValid = validateChannelConfig(channelName, channelConfig);
        if (configValid.valid) {
          console.log(`  ${colors.green}✓${colors.reset} ${channelName} configured`);
        } else {
          console.log(`  ${colors.red}✗${colors.reset} ${channelName} configuration invalid`);
          issues.push({
            type: 'error',
            category: 'Channels',
            issue: `${channelName}: ${configValid.error}`,
            fix: 'Run \'superclaw connect\' to reconfigure this channel'
          });
        }
      } else {
        console.log(`  ${colors.dim}○${colors.reset} ${channelName} disabled`);
      }
    }
    
  } catch (err) {
    console.log(`  ${colors.red}✗${colors.reset} Error reading channel configuration`);
  }
}

function validateChannelConfig(channelName, config) {
  switch (channelName) {
    case 'slack':
      if (!config.botToken) return { valid: false, error: 'Missing bot token' };
      if (!config.botToken.startsWith('xoxb-')) return { valid: false, error: 'Invalid bot token format' };
      return { valid: true };
      
    case 'discord':
      if (!config.botToken) return { valid: false, error: 'Missing bot token' };
      if (!config.applicationId) return { valid: false, error: 'Missing application ID' };
      return { valid: true };
      
    case 'telegram':
      if (!config.botToken) return { valid: false, error: 'Missing bot token' };
      if (!config.botToken.includes(':')) return { valid: false, error: 'Invalid bot token format' };
      return { valid: true };
      
    case 'whatsapp':
      if (!config.phoneNumber) return { valid: false, error: 'Missing phone number' };
      if (!config.accessToken && !config.apiKey) return { valid: false, error: 'Missing access token or API key' };
      return { valid: true };
      
    default:
      return { valid: true }; // Unknown channel, assume valid
  }
}

function checkModules(workspaceDir, issues) {
  const modulesDir = path.join(workspaceDir, 'modules');
  
  if (!fs.existsSync(modulesDir)) {
    console.log(`  ${colors.blue}i${colors.reset} No modules directory (no modules installed)`);
    return;
  }
  
  const moduleNames = fs.readdirSync(modulesDir).filter(f => {
    const modulePath = path.join(modulesDir, f);
    return fs.statSync(modulePath).isDirectory();
  });
  
  if (moduleNames.length === 0) {
    console.log(`  ${colors.blue}i${colors.reset} No modules installed`);
    return;
  }
  
  for (const moduleName of moduleNames) {
    const moduleDir = path.join(modulesDir, moduleName);
    const configPath = path.join(moduleDir, 'module.json');
    const moduleConfigPath = path.join(moduleDir, 'config.json');
    
    // Check module.json
    if (!fs.existsSync(configPath)) {
      console.log(`  ${colors.red}✗${colors.reset} ${moduleName}: module.json missing`);
      issues.push({
        type: 'error',
        category: 'Modules',
        issue: `${moduleName}: Missing module.json`,
        fix: 'Reinstall the module or create module.json manually'
      });
      continue;
    }
    
    try {
      const moduleConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      console.log(`  ${colors.green}✓${colors.reset} ${moduleName}: Valid module.json`);
      
      // Check config.json if module is enabled
      if (moduleConfig.enabled) {
        if (!fs.existsSync(moduleConfigPath)) {
          console.log(`  ${colors.red}✗${colors.reset} ${moduleName}: config.json missing`);
          issues.push({
            type: 'error',
            category: 'Modules',
            issue: `${moduleName}: Missing config.json`,
            fix: 'Create config.json with required settings'
          });
        } else {
          const config = JSON.parse(fs.readFileSync(moduleConfigPath, 'utf8'));
          const hasPlaceholders = Object.values(config).some(value => 
            typeof value === 'string' && value.startsWith('YOUR_')
          );
          
          if (hasPlaceholders) {
            console.log(`  ${colors.yellow}!${colors.reset} ${moduleName}: Has placeholder values`);
            issues.push({
              type: 'warning',
              category: 'Modules',
              issue: `${moduleName}: Configuration has placeholder values`,
              fix: 'Edit config.json and replace YOUR_* placeholders with actual values'
            });
          } else {
            console.log(`  ${colors.green}✓${colors.reset} ${moduleName}: Configured and enabled`);
          }
        }
      } else {
        console.log(`  ${colors.dim}○${colors.reset} ${moduleName}: Disabled`);
      }
      
    } catch (err) {
      console.log(`  ${colors.red}✗${colors.reset} ${moduleName}: Corrupted module.json`);
      issues.push({
        type: 'error',
        category: 'Modules',
        issue: `${moduleName}: Corrupted configuration`,
        fix: 'Reinstall the module'
      });
    }
  }
}

function checkFilePermissions(workspaceDir, issues) {
  try {
    // Test read permission on workspace
    fs.accessSync(workspaceDir, fs.constants.R_OK);
    console.log(`  ${colors.green}✓${colors.reset} Workspace readable`);
    
    // Test write permission on workspace
    fs.accessSync(workspaceDir, fs.constants.W_OK);
    console.log(`  ${colors.green}✓${colors.reset} Workspace writable`);
    
    // Test creating a file
    const testFile = path.join(workspaceDir, '.superclaw-test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    console.log(`  ${colors.green}✓${colors.reset} Can create and delete files`);
    
  } catch (err) {
    console.log(`  ${colors.red}✗${colors.reset} File permission error: ${err.message}`);
    issues.push({
      type: 'critical',
      category: 'Permissions',
      issue: 'Insufficient file permissions',
      fix: 'Check and fix file permissions: chmod -R 755 ' + workspaceDir
    });
  }
}

function checkNetworkConnectivity(issues) {
  // This is a basic check - in a real implementation you might ping specific services
  console.log(`  ${colors.blue}i${colors.reset} Network connectivity not tested`);
  console.log(`  ${colors.dim}    Test manually: ping google.com${colors.reset}`);
  
  // Check if curl is available for network testing
  try {
    execSync('which curl', { stdio: 'ignore' });
    console.log(`  ${colors.green}✓${colors.reset} curl available for network testing`);
  } catch (err) {
    console.log(`  ${colors.yellow}!${colors.reset} curl not found (optional)`);
    issues.push({
      type: 'info',
      category: 'Network',
      issue: 'curl not available for network testing',
      fix: 'Install curl for better network diagnostics'
    });
  }
}

function showDiagnosticSummary(issues) {
  console.log(`\n${colors.bright}📋 Diagnostic Summary${colors.reset}\n`);
  
  const critical = issues.filter(i => i.type === 'critical');
  const errors = issues.filter(i => i.type === 'error');
  const warnings = issues.filter(i => i.type === 'warning');
  const info = issues.filter(i => i.type === 'info');
  
  if (issues.length === 0) {
    console.log(`${colors.green}🎉 No issues found!${colors.reset}`);
    console.log(`Your Superclaw workspace is healthy and ready to use.\n`);
    return;
  }
  
  if (critical.length > 0) {
    console.log(`${colors.red}❌ ${critical.length} Critical Issue${critical.length > 1 ? 's' : ''}${colors.reset}`);
    critical.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.category}: ${issue.issue}`);
      console.log(`   ${colors.cyan}Fix: ${issue.fix}${colors.reset}\n`);
    });
  }
  
  if (errors.length > 0) {
    console.log(`${colors.red}🔥 ${errors.length} Error${errors.length > 1 ? 's' : ''}${colors.reset}`);
    errors.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.category}: ${issue.issue}`);
      console.log(`   ${colors.cyan}Fix: ${issue.fix}${colors.reset}\n`);
    });
  }
  
  if (warnings.length > 0) {
    console.log(`${colors.yellow}⚠️  ${warnings.length} Warning${warnings.length > 1 ? 's' : ''}${colors.reset}`);
    warnings.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.category}: ${issue.issue}`);
      console.log(`   ${colors.cyan}Fix: ${issue.fix}${colors.reset}\n`);
    });
  }
  
  if (info.length > 0) {
    console.log(`${colors.blue}ℹ️  ${info.length} Info${colors.reset}`);
    info.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.category}: ${issue.issue}`);
      console.log(`   ${colors.cyan}Note: ${issue.fix}${colors.reset}\n`);
    });
  }
  
  // Next steps
  if (critical.length > 0 || errors.length > 0) {
    console.log(`${colors.red}🚨 Action Required${colors.reset}`);
    console.log('Fix critical issues and errors before using Superclaw.\n');
  } else if (warnings.length > 0) {
    console.log(`${colors.yellow}✨ Recommended Actions${colors.reset}`);
    console.log('Fix warnings to improve your Superclaw experience.\n');
  } else {
    console.log(`${colors.green}✅ Ready to Go${colors.reset}`);
    console.log('Your workspace is ready. Address info items as needed.\n');
  }
}

function findWorkspace() {
  const possiblePaths = [
    './superclaw-workspace',
    '../superclaw-workspace',
    process.cwd(),
    path.join(process.env.HOME || process.env.USERPROFILE || '.', 'superclaw-workspace')
  ];

  for (const dir of possiblePaths) {
    if (fs.existsSync(path.join(dir, 'superclaw-config.json'))) {
      return dir;
    }
  }

  return null;
}

module.exports = { run };