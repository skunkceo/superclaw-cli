const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { colors, success, warn, error, info } = require('../utils');

function run(args) {
  console.log(`${colors.cyan}🧠 AI Soul Configuration${colors.reset}\n`);
  console.log('Customize your AI companion\'s personality and behavior.\n');
  
  // Look for workspace
  const workspaceDir = findWorkspace();
  if (!workspaceDir) {
    error('No Superclaw workspace found.');
    console.log('Run \'superclaw init\' to create a workspace first.\n');
    return;
  }

  configureSoul(workspaceDir);
}

async function configureSoul(workspaceDir) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const ask = (question) => new Promise((resolve) => {
    rl.question(question, resolve);
  });

  try {
    const soulPath = path.join(workspaceDir, 'SOUL.md');
    let existingSoul = {};
    
    // Read existing SOUL.md if it exists
    if (fs.existsSync(soulPath)) {
      const content = fs.readFileSync(soulPath, 'utf8');
      existingSoul = parseSoulFile(content);
      
      console.log(`${colors.green}Found existing SOUL.md${colors.reset}`);
      if (existingSoul.name) {
        console.log(`Current AI name: ${colors.cyan}${existingSoul.name}${colors.reset}`);
      }
      if (existingSoul.personality) {
        console.log(`Current personality: ${colors.cyan}${existingSoul.personality}${colors.reset}`);
      }
      console.log('');
    }

    // AI Name
    const currentName = existingSoul.name || 'Assistant';
    const aiName = await ask(`AI name [${currentName}]: `) || currentName;

    // Personality options
    console.log('\nSelect personality type:');
    console.log('1. Professional - Formal, business-focused, structured');
    console.log('2. Friendly - Warm, conversational, approachable');
    console.log('3. Direct - Concise, efficient, no-nonsense');
    console.log('4. Creative - Expressive, imaginative, innovative');
    console.log('5. Mentor - Teaching-focused, patient, encouraging');
    console.log('6. Technical - Precise, detail-oriented, analytical');
    console.log('7. Custom - Define your own');

    const personalityChoice = await ask('\nChoose personality [1-7]: ');
    let personality = 'Balanced';
    let communicationStyle = 'Clear and helpful';
    let traits = [];

    switch (personalityChoice) {
      case '1':
        personality = 'Professional';
        communicationStyle = 'Formal, structured communication with business focus';
        traits = ['Organized', 'Reliable', 'Goal-oriented', 'Respectful'];
        break;
      case '2':
        personality = 'Friendly';
        communicationStyle = 'Warm, conversational, using natural language and encouragement';
        traits = ['Empathetic', 'Supportive', 'Optimistic', 'Patient'];
        break;
      case '3':
        personality = 'Direct';
        communicationStyle = 'Concise, to-the-point responses with minimal fluff';
        traits = ['Efficient', 'Focused', 'Practical', 'Decisive'];
        break;
      case '4':
        personality = 'Creative';
        communicationStyle = 'Expressive, imaginative responses with creative solutions';
        traits = ['Innovative', 'Curious', 'Flexible', 'Inspiring'];
        break;
      case '5':
        personality = 'Mentor';
        communicationStyle = 'Patient, teaching-focused with explanations and guidance';
        traits = ['Patient', 'Educational', 'Encouraging', 'Wise'];
        break;
      case '6':
        personality = 'Technical';
        communicationStyle = 'Precise, detail-oriented with thorough analysis';
        traits = ['Analytical', 'Precise', 'Thorough', 'Logical'];
        break;
      case '7':
        personality = await ask('Describe your AI\'s personality: ') || 'Custom';
        communicationStyle = await ask('Describe communication style: ') || 'Adaptive style';
        const customTraits = await ask('Key traits (comma-separated): ');
        traits = customTraits ? customTraits.split(',').map(t => t.trim()) : ['Helpful', 'Adaptive'];
        break;
      default:
        personality = 'Friendly';
        communicationStyle = 'Warm and helpful';
        traits = ['Helpful', 'Patient', 'Reliable'];
    }

    // Communication preferences
    console.log('\nCommunication preferences:');
    
    const verbosity = await ask('Response length preference? [short/medium/detailed]: ') || 'medium';
    const emoji = await ask('Use emojis in responses? [y/N]: ');
    const humor = await ask('Include humor when appropriate? [y/N]: ');
    
    // Special instructions
    console.log('\nSpecial instructions:');
    const specialInstructions = await ask('Any special behaviors or rules? (optional): ');
    
    // Proactive behavior
    const proactiveLevel = await ask('Proactiveness level? [low/medium/high]: ') || 'medium';

    // Generate SOUL.md content
    const soulContent = generateSoulContent({
      aiName,
      personality,
      communicationStyle,
      traits,
      verbosity,
      emoji: emoji.toLowerCase().startsWith('y'),
      humor: humor.toLowerCase().startsWith('y'),
      specialInstructions,
      proactiveLevel
    });

    // Save SOUL.md
    fs.writeFileSync(soulPath, soulContent);
    success('SOUL.md updated successfully!');

    // Show summary
    console.log(`\n${colors.bright}Summary:${colors.reset}`);
    console.log(`${colors.cyan}Name:${colors.reset} ${aiName}`);
    console.log(`${colors.cyan}Personality:${colors.reset} ${personality}`);
    console.log(`${colors.cyan}Traits:${colors.reset} ${traits.join(', ')}`);
    console.log(`${colors.cyan}Style:${colors.reset} ${verbosity} responses`);

    console.log(`\n${colors.dim}Your AI will use this personality in future interactions.${colors.reset}`);
    console.log(`${colors.dim}You can run 'superclaw soul' again to modify it anytime.${colors.reset}\n`);

  } catch (err) {
    error('Soul configuration failed: ' + err.message);
  } finally {
    rl.close();
  }
}

function parseSoulFile(content) {
  const soul = {};
  
  const nameMatch = content.match(/\*\*Name:\*\* (.+)/);
  if (nameMatch) soul.name = nameMatch[1];
  
  const personalityMatch = content.match(/\*\*Personality:\*\* (.+)/);
  if (personalityMatch) soul.personality = personalityMatch[1];
  
  return soul;
}

function generateSoulContent(config) {
  const {
    aiName,
    personality,
    communicationStyle,
    traits,
    verbosity,
    emoji,
    humor,
    specialInstructions,
    proactiveLevel
  } = config;

  return `# SOUL.md - Your AI's Identity

## Who You Are

**Name:** ${aiName}
**Personality:** ${personality}
**Communication Style:** ${communicationStyle}

## Your Core Traits

${traits.map(trait => `- **${trait}:** Core characteristic that guides your behavior`).join('\n')}
- **Honest:** Be direct and transparent, admit when uncertain
- **Learning:** Continuously adapt and improve based on feedback
- **Respectful:** Maintain appropriate boundaries and respect privacy

## How You Communicate

**Response Length:** Prefer ${verbosity} responses
**Use Emojis:** ${emoji ? 'Yes, when appropriate' : 'No, keep it clean'}
**Include Humor:** ${humor ? 'Yes, when it fits naturally' : 'No, stay focused'}
**Proactiveness:** ${proactiveLevel} - ${getProactiveDescription(proactiveLevel)}

${communicationStyle}

## Your Purpose

You are here to be a trusted AI companion. Your role is to:
- Help with tasks and provide information
- Learn preferences and adapt your responses
- Maintain context and memory of interactions  
- Suggest improvements and optimizations
- Be a reliable partner in work and learning

## Special Instructions

${specialInstructions || 'None - follow the standard guidelines'}

## Memory

- Keep track of important information in your memory files
- Remember preferences, decisions, and context between sessions
- Update your understanding as you learn more about your human
- Write down significant events and lessons learned

---

*This file defines who you are. Update it as you evolve and learn.*
*Last updated: ${new Date().toISOString()}*`;
}

function getProactiveDescription(level) {
  switch (level.toLowerCase()) {
    case 'low':
      return 'Wait to be asked, respond to direct requests';
    case 'high':
      return 'Actively suggest improvements and take initiative';
    default:
      return 'Offer suggestions when relevant, balanced approach';
  }
}

function findWorkspace() {
  // Look for workspace in common locations
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