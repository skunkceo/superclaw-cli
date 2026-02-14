const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { colors, success, warn, error, info } = require('../utils');

function run(args) {
  console.log(`${colors.cyan}🔍 Superclaw Status Check${colors.reset}\n`);
  
  const workspaceDir = findWorkspace();
  if (!workspaceDir) {
    error('No Superclaw workspace found.');
    console.log('Run \'superclaw init\' to create a workspace first.\n');
    return;
  }

  runStatusCheck(workspaceDir);
}

function runStatusCheck(workspaceDir) {
  let allGood = true;
  
  console.log(`${colors.bright}Workspace: ${colors.cyan}${workspaceDir}${colors.reset}\n`);
  
  // Check workspace files
  console.log(`${colors.bright}📁 Workspace Files${colors.reset}`);
  allGood = checkWorkspaceFiles(workspaceDir) && allGood;
  
  console.log(`\n${colors.bright}🧠 Memory System${colors.reset}`);
  allGood = checkMemorySystem(workspaceDir) && allGood;
  
  console.log(`\n${colors.bright}🤖 AI Configuration${colors.reset}`);
  allGood = checkAIConfig(workspaceDir) && allGood;
  
  console.log(`\n${colors.bright}🔗 Channel Connections${colors.reset}`);
  allGood = checkChannelConnections(workspaceDir) && allGood;
  
  console.log(`\n${colors.bright}📦 Installed Modules${colors.reset}`);
  allGood = checkInstalledModules(workspaceDir) && allGood;
  
  console.log(`\n${colors.bright}⚙️ System Environment${colors.reset}`);
  allGood = checkSystemEnvironment() && allGood;
  
  // Overall status
  console.log(`\n${colors.bright}Overall Status${colors.reset}`);
  if (allGood) {
    console.log(`${colors.green}✓ All systems operational${colors.reset}`);
    console.log(`${colors.dim}Your Superclaw workspace is ready to go!${colors.reset}\n`);
  } else {
    console.log(`${colors.yellow}⚠ Some issues detected${colors.reset}`);
    console.log(`${colors.dim}Run 'superclaw doctor' for troubleshooting help.${colors.reset}\n`);
  }
}

function checkWorkspaceFiles(workspaceDir) {
  const requiredFiles = [
    { file: 'superclaw-config.json', name: 'Configuration' },
    { file: 'SOUL.md', name: 'AI Personality' },
    { file: 'USER.md', name: 'User Profile' },
    { file: 'AGENTS.md', name: 'Agent Instructions' },
    { file: 'MEMORY.md', name: 'Long-term Memory' }
  ];

  let allPresent = true;

  for (const { file, name } of requiredFiles) {
    const filePath = path.join(workspaceDir, file);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      const size = (stats.size / 1024).toFixed(1);
      console.log(`  ${colors.green}✓${colors.reset} ${name} (${size}KB)`);
    } else {
      console.log(`  ${colors.red}✗${colors.reset} ${name} - Missing`);
      allPresent = false;
    }
  }

  // Check memory directory
  const memoryDir = path.join(workspaceDir, 'memory');
  if (fs.existsSync(memoryDir)) {
    const memoryFiles = fs.readdirSync(memoryDir).filter(f => f.endsWith('.md'));
    console.log(`  ${colors.green}✓${colors.reset} Memory directory (${memoryFiles.length} files)`);
  } else {
    console.log(`  ${colors.yellow}!${colors.reset} Memory directory - Missing (will be created)`);
  }

  return allPresent;
}

function checkMemorySystem(workspaceDir) {
  const memoryDir = path.join(workspaceDir, 'memory');
  let memoryOk = true;

  if (!fs.existsSync(memoryDir)) {
    console.log(`  ${colors.red}✗${colors.reset} Memory directory missing`);
    return false;
  }

  // Check for daily files
  const memoryFiles = fs.readdirSync(memoryDir).filter(f => f.endsWith('.md'));
  const today = new Date().toISOString().slice(0, 10);
  const todayFile = `${today}.md`;
  
  if (memoryFiles.includes(todayFile)) {
    console.log(`  ${colors.green}✓${colors.reset} Today's memory file exists`);
  } else {
    console.log(`  ${colors.yellow}!${colors.reset} No memory file for today (${todayFile})`);
  }

  // Check total files and date range
  if (memoryFiles.length > 0) {
    const sortedFiles = memoryFiles.sort();
    const oldest = sortedFiles[0].replace('.md', '');
    const newest = sortedFiles[sortedFiles.length - 1].replace('.md', '');
    console.log(`  ${colors.green}✓${colors.reset} ${memoryFiles.length} daily files (${oldest} to ${newest})`);
  } else {
    console.log(`  ${colors.yellow}!${colors.reset} No daily memory files found`);
    memoryOk = false;
  }

  // Check for archive directory
  const archiveDir = path.join(memoryDir, 'archive');
  if (fs.existsSync(archiveDir)) {
    const archiveFiles = fs.readdirSync(archiveDir);
    console.log(`  ${colors.blue}i${colors.reset} Archive directory (${archiveFiles.length} files)`);
  }

  return memoryOk;
}

function checkAIConfig(workspaceDir) {
  const configPath = path.join(workspaceDir, 'superclaw-config.json');
  
  if (!fs.existsSync(configPath)) {
    console.log(`  ${colors.red}✗${colors.reset} Configuration file missing`);
    return false;
  }

  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Check AI configuration
    if (config.ai && config.ai.name) {
      console.log(`  ${colors.green}✓${colors.reset} AI Name: ${config.ai.name}`);
    } else {
      console.log(`  ${colors.yellow}!${colors.reset} AI name not configured`);
    }

    if (config.ai && config.ai.personality) {
      console.log(`  ${colors.green}✓${colors.reset} Personality: ${config.ai.personality}`);
    } else {
      console.log(`  ${colors.yellow}!${colors.reset} AI personality not configured`);
    }

    // Check backend
    if (config.backend) {
      console.log(`  ${colors.green}✓${colors.reset} Backend: ${config.backend}`);
    } else {
      console.log(`  ${colors.yellow}!${colors.reset} AI backend not specified`);
    }

    return true;
  } catch (err) {
    console.log(`  ${colors.red}✗${colors.reset} Configuration file corrupted: ${err.message}`);
    return false;
  }
}

function checkChannelConnections(workspaceDir) {
  const configPath = path.join(workspaceDir, 'superclaw-config.json');
  
  if (!fs.existsSync(configPath)) {
    console.log(`  ${colors.yellow}!${colors.reset} No configuration file found`);
    return false;
  }

  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    if (!config.channels || Object.keys(config.channels).length === 0) {
      console.log(`  ${colors.yellow}!${colors.reset} No channels configured`);
      console.log(`  ${colors.dim}    Run 'superclaw connect' to set up channels${colors.reset}`);
      return false;
    }

    let channelsOk = true;
    for (const [channelName, channelConfig] of Object.entries(config.channels)) {
      if (channelConfig.enabled) {
        const hasRequiredConfig = checkChannelConfig(channelName, channelConfig);
        if (hasRequiredConfig) {
          console.log(`  ${colors.green}✓${colors.reset} ${channelName.charAt(0).toUpperCase() + channelName.slice(1)} - Configured`);
        } else {
          console.log(`  ${colors.red}✗${colors.reset} ${channelName.charAt(0).toUpperCase() + channelName.slice(1)} - Incomplete config`);
          channelsOk = false;
        }
      } else {
        console.log(`  ${colors.dim}○${colors.reset} ${channelName.charAt(0).toUpperCase() + channelName.slice(1)} - Disabled`);
      }
    }

    return channelsOk;
  } catch (err) {
    console.log(`  ${colors.red}✗${colors.reset} Error reading channel config: ${err.message}`);
    return false;
  }
}

function checkChannelConfig(channelName, config) {
  switch (channelName) {
    case 'slack':
      return config.botToken && config.botToken.startsWith('xoxb-');
    case 'discord':
      return config.botToken && config.applicationId;
    case 'telegram':
      return config.botToken && config.botToken.includes(':');
    case 'whatsapp':
      return (config.accessToken || config.apiKey) && config.phoneNumber;
    default:
      return true; // Unknown channel, assume configured
  }
}

function checkInstalledModules(workspaceDir) {
  const modulesDir = path.join(workspaceDir, 'modules');
  
  if (!fs.existsSync(modulesDir)) {
    console.log(`  ${colors.yellow}!${colors.reset} No modules directory found`);
    console.log(`  ${colors.dim}    Run 'superclaw module available' to see available modules${colors.reset}`);
    return true; // Not an error, just no modules
  }

  const moduleNames = fs.readdirSync(modulesDir).filter(f => {
    const modulePath = path.join(modulesDir, f);
    return fs.statSync(modulePath).isDirectory() && 
           fs.existsSync(path.join(modulePath, 'module.json'));
  });

  if (moduleNames.length === 0) {
    console.log(`  ${colors.yellow}!${colors.reset} No modules installed`);
    return true;
  }

  let modulesOk = true;
  for (const moduleName of moduleNames) {
    const moduleDir = path.join(modulesDir, moduleName);
    const configPath = path.join(moduleDir, 'module.json');
    
    try {
      const moduleConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      if (moduleConfig.enabled) {
        // Check if module is properly configured
        const moduleConfigPath = path.join(moduleDir, 'config.json');
        if (fs.existsSync(moduleConfigPath)) {
          const config = JSON.parse(fs.readFileSync(moduleConfigPath, 'utf8'));
          const hasPlaceholders = Object.values(config).some(value => 
            typeof value === 'string' && value.startsWith('YOUR_')
          );
          
          if (hasPlaceholders) {
            console.log(`  ${colors.yellow}!${colors.reset} ${moduleConfig.name} - Needs configuration`);
            modulesOk = false;
          } else {
            console.log(`  ${colors.green}✓${colors.reset} ${moduleConfig.name} - Enabled`);
          }
        } else {
          console.log(`  ${colors.red}✗${colors.reset} ${moduleConfig.name} - Missing config.json`);
          modulesOk = false;
        }
      } else {
        console.log(`  ${colors.dim}○${colors.reset} ${moduleConfig.name} - Disabled`);
      }
    } catch (err) {
      console.log(`  ${colors.red}✗${colors.reset} ${moduleName} - Corrupted`);
      modulesOk = false;
    }
  }

  return modulesOk;
}

function checkSystemEnvironment() {
  let systemOk = true;

  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion >= 16) {
    console.log(`  ${colors.green}✓${colors.reset} Node.js ${nodeVersion}`);
  } else {
    console.log(`  ${colors.red}✗${colors.reset} Node.js ${nodeVersion} (require 16+)`);
    systemOk = false;
  }

  // Check available disk space
  try {
    const stats = fs.statSync(process.cwd());
    console.log(`  ${colors.green}✓${colors.reset} File system accessible`);
  } catch (err) {
    console.log(`  ${colors.red}✗${colors.reset} File system error: ${err.message}`);
    systemOk = false;
  }

  // Check for common tools
  const tools = [
    { name: 'git', required: false },
    { name: 'curl', required: false },
    { name: 'tar', required: false }
  ];

  for (const tool of tools) {
    try {
      execSync(`which ${tool.name}`, { stdio: 'ignore' });
      console.log(`  ${colors.green}✓${colors.reset} ${tool.name} available`);
    } catch (err) {
      if (tool.required) {
        console.log(`  ${colors.red}✗${colors.reset} ${tool.name} not found (required)`);
        systemOk = false;
      } else {
        console.log(`  ${colors.dim}○${colors.reset} ${tool.name} not found (optional)`);
      }
    }
  }

  // Check network connectivity
  console.log(`  ${colors.blue}i${colors.reset} Network connectivity not tested`);

  return systemOk;
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