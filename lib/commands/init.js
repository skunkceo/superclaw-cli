const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');
const { colors, success, warn, error, info, showLogo } = require('../../bin/superclaw');

function run(args) {
  showLogo();
  console.log(`${colors.bright}Welcome to Superclaw!${colors.reset}`);
  console.log('Let\'s set up your AI companion workspace.\n');
  
  initWorkspace();
}

async function initWorkspace() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const ask = (question) => new Promise((resolve) => {
    rl.question(question, resolve);
  });

  try {
    // Step 1: Check Node.js version
    console.log(`${colors.cyan}Step 1: System Check${colors.reset}\n`);
    
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion >= 16) {
      success(`Node.js ${nodeVersion} detected`);
    } else {
      error(`Node.js ${nodeVersion} detected - version 16+ required`);
      console.log('Please upgrade Node.js: https://nodejs.org/\n');
      process.exit(1);
    }

    // Step 2: Choose workspace directory
    console.log(`\n${colors.cyan}Step 2: Workspace Setup${colors.reset}\n`);
    
    let workspaceDir = await ask('Where would you like to create your AI workspace? [./superclaw-workspace]: ');
    if (!workspaceDir.trim()) {
      workspaceDir = './superclaw-workspace';
    }
    
    workspaceDir = path.resolve(workspaceDir);
    
    if (fs.existsSync(workspaceDir)) {
      const overwrite = await ask(`Directory ${workspaceDir} exists. Continue anyway? [y/N]: `);
      if (!overwrite.toLowerCase().startsWith('y')) {
        console.log('Setup cancelled.\n');
        process.exit(0);
      }
    } else {
      fs.mkdirSync(workspaceDir, { recursive: true });
    }

    // Step 3: AI Backend selection
    console.log(`\n${colors.cyan}Step 3: AI Backend${colors.reset}\n`);
    console.log('Which AI backend will you use?');
    console.log('1. OpenClaw (self-hosted AI for WordPress)');
    console.log('2. Other (manual configuration)\n');
    
    const backendChoice = await ask('Choose [1-2]: ');
    let backend = 'other';
    
    switch (backendChoice) {
      case '1':
        backend = 'openclaw';
        break;
      default:
        backend = 'other';
        break;
    }

    // Step 4: AI Personality
    console.log(`\n${colors.cyan}Step 4: AI Personality${colors.reset}\n`);
    
    const aiName = await ask('What should your AI be called? [Assistant]: ') || 'Assistant';
    
    console.log('\nPersonality style:');
    console.log('1. Professional (formal, business-focused)');
    console.log('2. Friendly (casual, warm, conversational)'); 
    console.log('3. Direct (concise, to-the-point)');
    console.log('4. Creative (expressive, imaginative)');
    console.log('5. Custom (describe your own)');
    
    const personalityChoice = await ask('\nChoose personality [1-5]: ');
    let personality = 'Balanced and helpful';
    let communicationStyle = 'Clear and informative';
    
    switch (personalityChoice) {
      case '1':
        personality = 'Professional';
        communicationStyle = 'Formal, structured, business-focused communication';
        break;
      case '2':
        personality = 'Friendly';
        communicationStyle = 'Warm, conversational, using natural language';
        break;
      case '3':
        personality = 'Direct';
        communicationStyle = 'Concise, to-the-point, no fluff';
        break;
      case '4':
        personality = 'Creative';
        communicationStyle = 'Expressive, imaginative, thinking outside the box';
        break;
      case '5':
        const customPersonality = await ask('Describe your preferred personality: ');
        personality = customPersonality || 'Custom';
        const customStyle = await ask('Describe communication style: ');
        communicationStyle = customStyle || 'Adaptive communication style';
        break;
    }

    // Step 5: User information
    console.log(`\n${colors.cyan}Step 5: About You${colors.reset}\n`);
    
    const userName = await ask('What\'s your name? ');
    const userRole = await ask('What\'s your role/profession? [Developer]: ') || 'Developer';
    const userTimezone = await ask('Your timezone? [UTC]: ') || 'UTC';

    // Step 6: Create files
    console.log(`\n${colors.cyan}Step 6: Creating Workspace${colors.reset}\n`);
    
    // Create directories
    fs.mkdirSync(path.join(workspaceDir, 'memory'), { recursive: true });
    
    // Create SOUL.md
    const soulTemplate = fs.readFileSync(path.join(__dirname, '..', 'templates', 'SOUL.md'), 'utf8');
    const soulContent = soulTemplate
      .replace('{AI_NAME}', aiName)
      .replace('{PERSONALITY_TYPE}', personality)
      .replace('{COMMUNICATION_STYLE}', communicationStyle)
      .replace('{COMMUNICATION_DETAILS}', communicationStyle)
      .replace('{SPECIAL_INSTRUCTIONS}', 'None yet - customize as needed');
    
    fs.writeFileSync(path.join(workspaceDir, 'SOUL.md'), soulContent);
    success('Created SOUL.md');
    
    // Create USER.md  
    const userTemplate = fs.readFileSync(path.join(__dirname, '..', 'templates', 'USER.md'), 'utf8');
    const userContent = userTemplate
      .replace('{USER_NAME}', userName)
      .replace('{PREFERRED_NAME}', userName)
      .replace('{USER_ROLE}', userRole)
      .replace('{USER_LOCATION}', 'Not specified')
      .replace('{USER_TIMEZONE}', userTimezone)
      .replace('{PREFERRED_COMMUNICATION_STYLE}', 'Natural and helpful')
      .replace('{FORMALITY_LEVEL}', 'Casual but respectful')
      .replace('{RESPONSE_PREFERENCE}', 'Clear and informative')
      .replace('{FEEDBACK_PREFERENCE}', 'Direct and constructive')
      .replace('{WORKING_HOURS}', 'Not specified')
      .replace('{PRODUCTIVITY_STYLE}', 'To be determined')
      .replace('{DECISION_STYLE}', 'To be determined')
      .replace('{USER_INTERESTS}', 'To be filled in over time')
      .replace('{USER_GOALS}', 'To be discussed and documented')
      .replace('{KEY_POINTS}', 'None yet - will be added as we work together')
      .replace('{BOUNDARIES}', 'Respect privacy and ask before taking external actions');
    
    fs.writeFileSync(path.join(workspaceDir, 'USER.md'), userContent);
    success('Created USER.md');
    
    // Copy AGENTS.md and MEMORY.md templates
    fs.copyFileSync(
      path.join(__dirname, '..', 'templates', 'AGENTS.md'),
      path.join(workspaceDir, 'AGENTS.md')
    );
    success('Created AGENTS.md');
    
    fs.copyFileSync(
      path.join(__dirname, '..', 'templates', 'MEMORY.md'),
      path.join(workspaceDir, 'MEMORY.md')
    );
    success('Created MEMORY.md');

    // Create initial daily memory file
    const today = new Date().toISOString().slice(0, 10);
    const memoryContent = `# Memory Log - ${today}\n\n## Setup\n\n- Created Superclaw workspace\n- AI name: ${aiName}\n- Personality: ${personality}\n- User: ${userName} (${userRole})\n\n## Notes\n\n*Daily events and context go here*\n`;
    
    fs.writeFileSync(path.join(workspaceDir, 'memory', `${today}.md`), memoryContent);
    success(`Created memory/${today}.md`);

    // Create config file
    const config = {
      version: '1.0.0',
      created: new Date().toISOString(),
      backend,
      workspace: workspaceDir,
      ai: {
        name: aiName,
        personality
      },
      user: {
        name: userName,
        role: userRole,
        timezone: userTimezone
      }
    };
    
    fs.writeFileSync(path.join(workspaceDir, 'superclaw-config.json'), JSON.stringify(config, null, 2));
    success('Created configuration file');

    // Step 7: Next steps
    console.log(`\n${colors.green}🎉 Workspace created successfully!${colors.reset}\n`);
    
    console.log(`${colors.bright}Your workspace is ready at:${colors.reset}`);
    console.log(`  ${colors.cyan}${workspaceDir}${colors.reset}\n`);
    
    console.log(`${colors.bright}Next steps:${colors.reset}`);
    console.log(`  1. ${colors.yellow}Set up channels:${colors.reset} superclaw connect`);
    console.log(`  2. ${colors.yellow}Check status:${colors.reset} superclaw status`);
    console.log(`  3. ${colors.yellow}Install modules:${colors.reset} superclaw module <name>`);
    
    if (backend === 'openclaw') {
      console.log(`\n${colors.dim}For OpenClaw, make sure your WordPress site has the OpenClaw plugin installed.${colors.reset}`);
    }

    const runConnect = await ask('\nWould you like to set up channels now? [y/N]: ');
    if (runConnect.toLowerCase().startsWith('y')) {
      console.log('\n');
      const connectCommand = require('./connect');
      connectCommand.run([]);
    } else {
      console.log(`\n${colors.dim}Run 'superclaw connect' when you're ready to set up channels.${colors.reset}\n`);
    }

  } catch (err) {
    error('Setup failed: ' + err.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

module.exports = { run };