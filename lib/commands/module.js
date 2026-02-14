const fs = require('fs');
const path = require('path');
const https = require('https');
const { colors, success, warn, error, info } = require('../../bin/superclaw');

// Module registry - available capability modules
const MODULE_REGISTRY = {
  'web-search': {
    name: 'Web Search',
    description: 'Search the web and fetch content from URLs',
    capabilities: ['web_search', 'web_fetch'],
    config: ['search_engine', 'api_key'],
    docs: 'https://github.com/skunkceo/superclaw-modules/blob/main/web-search/README.md'
  },
  'email': {
    name: 'Email Integration', 
    description: 'Send and receive emails via IMAP/SMTP',
    capabilities: ['email_send', 'email_read', 'email_search'],
    config: ['smtp_host', 'smtp_port', 'imap_host', 'email', 'password'],
    docs: 'https://github.com/skunkceo/superclaw-modules/blob/main/email/README.md'
  },
  'calendar': {
    name: 'Calendar Management',
    description: 'Google Calendar, Outlook calendar integration',
    capabilities: ['calendar_read', 'calendar_create', 'calendar_update'],
    config: ['provider', 'credentials'],
    docs: 'https://github.com/skunkceo/superclaw-modules/blob/main/calendar/README.md'
  },
  'task-management': {
    name: 'Task Management',
    description: 'Todoist, Linear, GitHub Issues integration',
    capabilities: ['task_create', 'task_update', 'task_list'],
    config: ['provider', 'api_token'],
    docs: 'https://github.com/skunkceo/superclaw-modules/blob/main/tasks/README.md'
  },
  'file-ops': {
    name: 'File Operations',
    description: 'Advanced file system operations and management',
    capabilities: ['file_search', 'file_sync', 'file_backup'],
    config: ['backup_location', 'sync_folders'],
    docs: 'https://github.com/skunkceo/superclaw-modules/blob/main/file-ops/README.md'
  },
  'social-media': {
    name: 'Social Media',
    description: 'Twitter, LinkedIn, Reddit posting and monitoring',
    capabilities: ['social_post', 'social_monitor', 'social_analytics'],
    config: ['platforms', 'api_keys'],
    docs: 'https://github.com/skunkceo/superclaw-modules/blob/main/social/README.md'
  },
  'analytics': {
    name: 'Analytics & Reporting',
    description: 'Google Analytics, website metrics, data visualization',
    capabilities: ['analytics_fetch', 'report_generate', 'data_viz'],
    config: ['ga_credentials', 'report_schedule'],
    docs: 'https://github.com/skunkceo/superclaw-modules/blob/main/analytics/README.md'
  },
  'coding': {
    name: 'Code Assistant',
    description: 'Git integration, code review, deployment tools',
    capabilities: ['git_ops', 'code_review', 'deploy'],
    config: ['git_credentials', 'deployment_targets'],
    docs: 'https://github.com/skunkceo/superclaw-modules/blob/main/coding/README.md'
  }
};

function run(args) {
  const moduleName = args[0];
  const subCommand = args[1];

  if (!moduleName) {
    showHelp();
    return;
  }

  const workspaceDir = findWorkspace();
  if (!workspaceDir) {
    error('No Superclaw workspace found.');
    console.log('Run \'superclaw init\' to create a workspace first.\n');
    return;
  }

  switch (moduleName) {
    case 'list':
      listInstalledModules(workspaceDir);
      break;
    case 'available':
      listAvailableModules();
      break;
    case 'info':
      showModuleInfo(subCommand);
      break;
    default:
      if (subCommand === 'remove' || subCommand === 'uninstall') {
        removeModule(workspaceDir, moduleName);
      } else {
        installModule(workspaceDir, moduleName);
      }
  }
}

function showHelp() {
  console.log(`${colors.cyan}📦 Module Management${colors.reset}\n`);
  console.log(`${colors.bright}Usage:${colors.reset}`);
  console.log('  superclaw module list                 List installed modules');
  console.log('  superclaw module available            List available modules');
  console.log('  superclaw module info <name>          Show module information');
  console.log('  superclaw module <name>               Install a module');
  console.log('  superclaw module <name> remove        Remove a module\n');
  
  console.log(`${colors.bright}Examples:${colors.reset}`);
  console.log('  superclaw module web-search           Install web search capability');
  console.log('  superclaw module email                Install email integration');
  console.log('  superclaw module calendar remove      Remove calendar module\n');
}

function listAvailableModules() {
  console.log(`${colors.cyan}📦 Available Modules${colors.reset}\n`);
  
  for (const [key, module] of Object.entries(MODULE_REGISTRY)) {
    console.log(`${colors.green}●${colors.reset} ${colors.bright}${module.name}${colors.reset} (${key})`);
    console.log(`  ${colors.dim}${module.description}${colors.reset}`);
    console.log(`  ${colors.dim}Capabilities: ${module.capabilities.join(', ')}${colors.reset}\n`);
  }
  
  console.log(`${colors.dim}Install with: superclaw module <name>${colors.reset}\n`);
}

function listInstalledModules(workspaceDir) {
  console.log(`${colors.cyan}📦 Installed Modules${colors.reset}\n`);
  
  const modulesDir = path.join(workspaceDir, 'modules');
  
  if (!fs.existsSync(modulesDir)) {
    console.log('No modules installed yet.');
    console.log('Run \'superclaw module available\' to see available modules.\n');
    return;
  }

  const installedModules = fs.readdirSync(modulesDir).filter(f => {
    const modulePath = path.join(modulesDir, f);
    return fs.statSync(modulePath).isDirectory() && 
           fs.existsSync(path.join(modulePath, 'module.json'));
  });

  if (installedModules.length === 0) {
    console.log('No modules installed yet.\n');
    return;
  }

  for (const moduleName of installedModules) {
    const modulePath = path.join(modulesDir, moduleName);
    const configPath = path.join(modulePath, 'module.json');
    
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const status = config.enabled ? colors.green + '●' + colors.reset : colors.red + '●' + colors.reset;
      
      console.log(`${status} ${colors.bright}${config.name}${colors.reset} (${moduleName})`);
      console.log(`  ${colors.dim}${config.description}${colors.reset}`);
      console.log(`  ${colors.dim}Installed: ${config.installed}${colors.reset}`);
      console.log(`  ${colors.dim}Status: ${config.enabled ? 'Enabled' : 'Disabled'}${colors.reset}\n`);
      
    } catch (err) {
      console.log(`${colors.red}●${colors.reset} ${moduleName} ${colors.red}(corrupted)${colors.reset}\n`);
    }
  }
}

function showModuleInfo(moduleName) {
  if (!moduleName) {
    error('Module name required. Usage: superclaw module info <name>');
    return;
  }

  const module = MODULE_REGISTRY[moduleName];
  if (!module) {
    error(`Unknown module: ${moduleName}`);
    console.log('\nRun \'superclaw module available\' to see available modules.\n');
    return;
  }

  console.log(`${colors.cyan}📦 ${module.name}${colors.reset}\n`);
  console.log(`${colors.bright}Description:${colors.reset} ${module.description}\n`);
  console.log(`${colors.bright}Capabilities:${colors.reset}`);
  module.capabilities.forEach(cap => {
    console.log(`  ${colors.green}●${colors.reset} ${cap}`);
  });
  
  console.log(`\n${colors.bright}Configuration Required:${colors.reset}`);
  module.config.forEach(cfg => {
    console.log(`  ${colors.yellow}●${colors.reset} ${cfg}`);
  });
  
  console.log(`\n${colors.bright}Documentation:${colors.reset} ${module.docs}`);
  console.log(`\n${colors.dim}Install with: superclaw module ${moduleName}${colors.reset}\n`);
}

async function installModule(workspaceDir, moduleName) {
  const module = MODULE_REGISTRY[moduleName];
  if (!module) {
    error(`Unknown module: ${moduleName}`);
    console.log('\nRun \'superclaw module available\' to see available modules.\n');
    return;
  }

  console.log(`${colors.cyan}Installing ${module.name}...${colors.reset}\n`);
  
  // Create modules directory
  const modulesDir = path.join(workspaceDir, 'modules');
  const moduleDir = path.join(modulesDir, moduleName);
  
  if (fs.existsSync(moduleDir)) {
    warn(`Module ${moduleName} is already installed.`);
    console.log('Use \'superclaw module <name> remove\' to uninstall first.\n');
    return;
  }

  fs.mkdirSync(moduleDir, { recursive: true });

  // Create module configuration
  const moduleConfig = {
    name: module.name,
    description: module.description,
    capabilities: module.capabilities,
    configRequired: module.config,
    installed: new Date().toISOString(),
    enabled: false,
    version: '1.0.0'
  };

  fs.writeFileSync(
    path.join(moduleDir, 'module.json'),
    JSON.stringify(moduleConfig, null, 2)
  );

  // Create placeholder configuration file
  const configTemplate = {};
  module.config.forEach(key => {
    configTemplate[key] = `YOUR_${key.toUpperCase().replace(/-/g, '_')}`;
  });

  fs.writeFileSync(
    path.join(moduleDir, 'config.json'),
    JSON.stringify(configTemplate, null, 2)
  );

  // Create README with setup instructions
  const readmeContent = generateModuleReadme(module, moduleName);
  fs.writeFileSync(path.join(moduleDir, 'README.md'), readmeContent);

  success(`Module ${module.name} installed successfully!`);
  
  console.log(`\n${colors.bright}Next steps:${colors.reset}`);
  console.log(`1. Configure the module: Edit ${moduleDir}/config.json`);
  console.log(`2. Read setup instructions: ${moduleDir}/README.md`);
  console.log(`3. Test the module: superclaw status`);
  
  warn('Module is disabled by default. Configure it first, then enable it.');
  console.log(`\n${colors.dim}Documentation: ${module.docs}${colors.reset}\n`);
}

function removeModule(workspaceDir, moduleName) {
  const moduleDir = path.join(workspaceDir, 'modules', moduleName);
  
  if (!fs.existsSync(moduleDir)) {
    error(`Module ${moduleName} is not installed.`);
    return;
  }

  // Load module info for confirmation
  const configPath = path.join(moduleDir, 'module.json');
  let modulDisplayName = moduleName;
  
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      modulDisplayName = config.name || moduleName;
    } catch (err) {
      // Use default name
    }
  }

  console.log(`${colors.red}Removing module: ${modulDisplayName}${colors.reset}`);
  
  // Remove the module directory
  fs.rmSync(moduleDir, { recursive: true, force: true });
  success(`Module ${modulDisplayName} removed successfully.`);
  
  console.log(`${colors.dim}You may need to restart your AI to fully unload the module.${colors.reset}\n`);
}

function generateModuleReadme(module, moduleName) {
  return `# ${module.name} Module

${module.description}

## Capabilities

${module.capabilities.map(cap => `- ${cap}`).join('\n')}

## Configuration

Edit \`config.json\` and provide values for:

${module.config.map(cfg => `- **${cfg}**: Description of this configuration option`).join('\n')}

## Setup Instructions

1. Fill in your credentials/configuration in \`config.json\`
2. Test the configuration with \`superclaw status\`
3. Enable the module by setting \`enabled: true\` in \`module.json\`

## Documentation

For detailed setup instructions, see: ${module.docs}

## Troubleshooting

- Check your API keys and credentials
- Verify network connectivity
- Run \`superclaw doctor\` for diagnostic help
- Check the module logs in your AI assistant

---

*This module was installed on ${new Date().toISOString()}*
`;
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