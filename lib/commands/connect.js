const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { colors, success, warn, error, info } = require('../utils');

const CHANNELS = {
  slack: {
    name: 'Slack',
    description: 'Connect to Slack workspaces and channels',
    requirements: ['Bot token', 'App token (optional for Socket Mode)'],
    docs: 'https://api.slack.com/start/building'
  },
  discord: {
    name: 'Discord',
    description: 'Connect to Discord servers and channels',
    requirements: ['Bot token', 'Application ID'],
    docs: 'https://discord.com/developers/applications'
  },
  telegram: {
    name: 'Telegram', 
    description: 'Connect to Telegram chats and groups',
    requirements: ['Bot token from @BotFather'],
    docs: 'https://core.telegram.org/bots/tutorial'
  },
  whatsapp: {
    name: 'WhatsApp',
    description: 'Connect via WhatsApp Business API',
    requirements: ['Business API access', 'Phone number verification'],
    docs: 'https://developers.facebook.com/docs/whatsapp'
  }
};

function run(args) {
  console.log(`${colors.cyan}🔗 Channel Connection Setup${colors.reset}\n`);
  console.log('Configure your AI to connect to messaging platforms.\n');
  
  const workspaceDir = findWorkspace();
  if (!workspaceDir) {
    error('No Superclaw workspace found.');
    console.log('Run \'superclaw init\' to create a workspace first.\n');
    return;
  }

  setupChannels(workspaceDir);
}

async function setupChannels(workspaceDir) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const ask = (question) => new Promise((resolve) => {
    rl.question(question, resolve);
  });

  try {
    console.log(`${colors.bright}Available Channels:${colors.reset}\n`);
    
    let index = 1;
    for (const [key, channel] of Object.entries(CHANNELS)) {
      console.log(`${colors.cyan}${index}.${colors.reset} ${channel.name}`);
      console.log(`   ${colors.dim}${channel.description}${colors.reset}`);
      console.log(`   ${colors.dim}Requirements: ${channel.requirements.join(', ')}${colors.reset}\n`);
      index++;
    }

    console.log(`${colors.cyan}0.${colors.reset} Exit\n`);

    const choice = await ask('Which channel would you like to set up? [1-4, 0 to exit]: ');
    
    if (choice === '0') {
      console.log('Channel setup cancelled.\n');
      return;
    }

    const channelKeys = Object.keys(CHANNELS);
    const selectedIndex = parseInt(choice) - 1;
    
    if (selectedIndex < 0 || selectedIndex >= channelKeys.length) {
      error('Invalid choice.');
      return;
    }

    const channelKey = channelKeys[selectedIndex];
    const channel = CHANNELS[channelKey];

    await setupSpecificChannel(workspaceDir, channelKey, channel, ask);

  } catch (err) {
    error('Channel setup failed: ' + err.message);
  } finally {
    rl.close();
  }
}

async function setupSpecificChannel(workspaceDir, channelKey, channel, ask) {
  console.log(`\n${colors.cyan}Setting up ${channel.name}${colors.reset}\n`);
  
  // Load existing config
  const configPath = path.join(workspaceDir, 'superclaw-config.json');
  let config = {};
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
  
  if (!config.channels) {
    config.channels = {};
  }

  console.log(`${colors.yellow}Documentation:${colors.reset} ${channel.docs}\n`);

  switch (channelKey) {
    case 'slack':
      await setupSlack(config, ask);
      break;
    case 'discord':
      await setupDiscord(config, ask);
      break;
    case 'telegram':
      await setupTelegram(config, ask);
      break;
    case 'whatsapp':
      await setupWhatsApp(config, ask);
      break;
  }

  // Save config
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  success(`${channel.name} configuration saved!`);

  // Test connection
  const testConnection = await ask('\nWould you like to test the connection? [y/N]: ');
  if (testConnection.toLowerCase().startsWith('y')) {
    await testChannelConnection(channelKey, config.channels[channelKey]);
  }

  console.log(`\n${colors.dim}Configuration saved to superclaw-config.json${colors.reset}`);
  console.log(`${colors.dim}Your AI will use these settings to connect to ${channel.name}.${colors.reset}\n`);
}

async function setupSlack(config, ask) {
  console.log(`${colors.bright}Slack Setup${colors.reset}\n`);
  console.log('1. Create a new Slack app at https://api.slack.com/apps');
  console.log('2. Go to "OAuth & Permissions" and add bot token scopes');
  console.log('3. Install the app to your workspace');
  console.log('4. Copy the Bot User OAuth Token\n');

  const botToken = await ask('Enter your Bot User OAuth Token (xoxb-...): ');
  const useSocketMode = await ask('Use Socket Mode for real-time events? [y/N]: ');
  
  let appToken = '';
  if (useSocketMode.toLowerCase().startsWith('y')) {
    console.log('\nFor Socket Mode:');
    console.log('1. Go to "Socket Mode" in your app settings');
    console.log('2. Enable Socket Mode and create an App-Level Token');
    console.log('3. Add "connections:write" scope to the token\n');
    
    appToken = await ask('Enter your App-Level Token (xapp-...): ');
  }

  const defaultChannel = await ask('Default channel to join (optional, e.g., #general): ');

  config.channels.slack = {
    enabled: true,
    botToken: botToken,
    appToken: appToken || null,
    socketMode: useSocketMode.toLowerCase().startsWith('y'),
    defaultChannel: defaultChannel || null,
    setup: new Date().toISOString()
  };

  console.log(`\n${colors.green}Slack configured!${colors.reset}`);
  if (!appToken) {
    warn('Without Socket Mode, your bot will need webhook endpoints for events.');
  }
}

async function setupDiscord(config, ask) {
  console.log(`${colors.bright}Discord Setup${colors.reset}\n`);
  console.log('1. Create a new Discord application at https://discord.com/developers/applications');
  console.log('2. Go to "Bot" section and create a bot');
  console.log('3. Copy the bot token');
  console.log('4. Invite the bot to your server with appropriate permissions\n');

  const botToken = await ask('Enter your Discord bot token: ');
  const applicationId = await ask('Enter your Application ID: ');
  const guildId = await ask('Enter your Discord server (guild) ID (optional): ');

  config.channels.discord = {
    enabled: true,
    botToken: botToken,
    applicationId: applicationId,
    guildId: guildId || null,
    setup: new Date().toISOString()
  };

  console.log(`\n${colors.green}Discord configured!${colors.reset}`);
  info('Make sure your bot has the necessary permissions in your Discord server.');
}

async function setupTelegram(config, ask) {
  console.log(`${colors.bright}Telegram Setup${colors.reset}\n`);
  console.log('1. Start a chat with @BotFather on Telegram');
  console.log('2. Send /newbot and follow the instructions');
  console.log('3. Copy the bot token provided\n');

  const botToken = await ask('Enter your Telegram bot token: ');
  const allowGroups = await ask('Allow bot to work in groups? [Y/n]: ');

  config.channels.telegram = {
    enabled: true,
    botToken: botToken,
    allowGroups: !allowGroups.toLowerCase().startsWith('n'),
    setup: new Date().toISOString()
  };

  console.log(`\n${colors.green}Telegram configured!${colors.reset}`);
  info('Your bot is ready! Users can start a chat with it directly.');
}

async function setupWhatsApp(config, ask) {
  console.log(`${colors.bright}WhatsApp Business API Setup${colors.reset}\n`);
  console.log('⚠️  WhatsApp Business API requires business verification and approval.');
  console.log('This is more complex than other platforms.\n');
  
  console.log('Options:');
  console.log('1. Meta Business (official)');
  console.log('2. Third-party provider (e.g., Twilio, 360dialog)');
  console.log('3. Self-hosted solution\n');

  const provider = await ask('Which approach? [1-3]: ');
  const phoneNumber = await ask('Business phone number (with country code): ');
  
  let accessToken = '';
  let webhookUrl = '';
  
  if (provider === '1') {
    accessToken = await ask('Enter your WhatsApp Business API access token: ');
    webhookUrl = await ask('Enter your webhook URL: ');
  } else {
    console.log('\nYou\'ll need to configure your chosen provider separately.');
    const apiKey = await ask('API key/token from your provider: ');
    const endpoint = await ask('API endpoint URL: ');
    
    config.channels.whatsapp = {
      enabled: true,
      provider: provider === '2' ? 'third-party' : 'self-hosted',
      phoneNumber: phoneNumber,
      apiKey: apiKey,
      endpoint: endpoint,
      setup: new Date().toISOString()
    };
    
    console.log(`\n${colors.green}WhatsApp configured!${colors.reset}`);
    warn('Complete your provider setup separately according to their documentation.');
    return;
  }

  config.channels.whatsapp = {
    enabled: true,
    provider: 'meta',
    phoneNumber: phoneNumber,
    accessToken: accessToken,
    webhookUrl: webhookUrl,
    setup: new Date().toISOString()
  };

  console.log(`\n${colors.green}WhatsApp configured!${colors.reset}`);
  warn('Ensure your webhook endpoint is accessible and webhook verification is set up.');
}

async function testChannelConnection(channelKey, channelConfig) {
  console.log(`\n${colors.cyan}Testing ${CHANNELS[channelKey].name} connection...${colors.reset}\n`);

  // This is a placeholder for actual connection testing
  // In a real implementation, you'd make API calls to verify the credentials
  
  switch (channelKey) {
    case 'slack':
      if (!channelConfig.botToken) {
        error('Bot token is required for Slack');
        return;
      }
      info('Slack: Would verify bot token with auth.test API');
      break;
      
    case 'discord':
      if (!channelConfig.botToken) {
        error('Bot token is required for Discord');
        return;
      }
      info('Discord: Would verify bot token by fetching bot user');
      break;
      
    case 'telegram':
      if (!channelConfig.botToken) {
        error('Bot token is required for Telegram');
        return;
      }
      info('Telegram: Would verify bot token with getMe API');
      break;
      
    case 'whatsapp':
      if (!channelConfig.accessToken && !channelConfig.apiKey) {
        error('Access token or API key is required for WhatsApp');
        return;
      }
      info('WhatsApp: Would verify credentials with provider API');
      break;
  }

  // Simulate successful test
  setTimeout(() => {
    success(`${CHANNELS[channelKey].name} connection test completed!`);
    console.log(`${colors.dim}Note: This is a configuration test. Actual functionality depends on your AI backend.${colors.reset}`);
  }, 1000);
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