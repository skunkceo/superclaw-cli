#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { homedir } = require('os');

const SUPPORTED_MODELS = [
  { name: 'llama3.2:3b', size: '2.0GB', description: 'Llama 3.2 3B - Fast, good quality' },
  { name: 'phi3:mini', size: '2.3GB', description: 'Phi-3 Mini - Faster, decent quality' },
  { name: 'qwen2.5:3b', size: '2.3GB', description: 'Qwen 2.5 3B - Best quality for size' }
];

async function setupLocalModel() {
  console.log('\n🐾 SuperClaw Local Model Setup\n');
  console.log('Local models provide instant responses for casual chat,');
  console.log('while keeping your conversations private on your machine.\n');

  // Check if Ollama is installed
  console.log('Checking for Ollama...');
  let ollamaInstalled = false;
  
  try {
    execSync('ollama --version', { stdio: 'pipe' });
    ollamaInstalled = true;
    console.log('✓ Ollama is installed\n');
  } catch (e) {
    console.log('✗ Ollama is not installed\n');
  }

  if (!ollamaInstalled) {
    console.log('Installing Ollama...');
    console.log('Visit: https://ollama.com/download\n');
    console.log('Or run (Linux/macOS):');
    console.log('  curl -fsSL https://ollama.com/install.sh | sh\n');
    
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    await new Promise((resolve) => {
      readline.question('Install Ollama now? (Y/n): ', (answer) => {
        readline.close();
        if (answer.toLowerCase() !== 'n') {
          try {
            console.log('\nInstalling Ollama...');
            execSync('curl -fsSL https://ollama.com/install.sh | sh', { stdio: 'inherit' });
            console.log('✓ Ollama installed successfully\n');
            ollamaInstalled = true;
          } catch (e) {
            console.error('Failed to install Ollama:', e.message);
            console.log('\nPlease install manually and run this command again.');
            process.exit(1);
          }
        }
        resolve();
      });
    });

    if (!ollamaInstalled) {
      console.log('Ollama installation skipped.');
      console.log('Install it manually and run: superclaw localmodel setup');
      process.exit(0);
    }
  }

  // Check if Ollama is running
  console.log('Checking if Ollama is running...');
  try {
    execSync('curl -s http://localhost:11434/api/tags > /dev/null 2>&1', { stdio: 'pipe' });
    console.log('✓ Ollama is running\n');
  } catch (e) {
    console.log('✗ Ollama is not running\n');
    console.log('Starting Ollama...');
    console.log('Run in another terminal: ollama serve\n');
    console.log('Or it should start automatically. Waiting 3 seconds...');
    
    // Give it a moment
    setTimeout(() => {}, 3000);
  }

  // List available models
  console.log('Available models:\n');
  SUPPORTED_MODELS.forEach((model, i) => {
    console.log(`${i + 1}. ${model.description}`);
    console.log(`   Model: ${model.name} (${model.size})\n`);
  });

  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const modelIndex = await new Promise((resolve) => {
    readline.question('Select a model (1-3) [default: 1]: ', (answer) => {
      readline.close();
      const idx = parseInt(answer) - 1;
      resolve(isNaN(idx) || idx < 0 || idx > 2 ? 0 : idx);
    });
  });

  const selectedModel = SUPPORTED_MODELS[modelIndex];
  console.log(`\n📦 Downloading ${selectedModel.name}...`);
  console.log(`Size: ${selectedModel.size} (this may take a few minutes)\n`);

  try {
    execSync(`ollama pull ${selectedModel.name}`, { stdio: 'inherit' });
    console.log(`\n✓ ${selectedModel.name} downloaded successfully\n`);
  } catch (e) {
    console.error(`Failed to download model: ${e.message}`);
    process.exit(1);
  }

  // Save config
  const configPath = path.join(homedir(), '.superclaw', 'config.json');
  let config = {};
  
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }

  config.localModel = {
    enabled: true,
    model: selectedModel.name,
    provider: 'ollama'
  };

  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  console.log('✓ Local model configured\n');
  console.log('Test it:');
  console.log('  superclaw chat --local "Tell me about SuperClaw"\n');
  console.log('Or enable it in the dashboard Settings page.');
}

async function listLocalModels() {
  try {
    const result = execSync('ollama list', { encoding: 'utf8' });
    console.log('\n🤖 Installed Local Models:\n');
    console.log(result);
  } catch (e) {
    console.error('Failed to list models:', e.message);
    console.log('Is Ollama installed? Run: superclaw localmodel setup');
  }
}

async function testLocalModel() {
  const configPath = path.join(homedir(), '.superclaw', 'config.json');
  
  if (!fs.existsSync(configPath)) {
    console.log('No local model configured. Run: superclaw localmodel setup');
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const modelName = config.localModel?.model;

  if (!modelName) {
    console.log('No local model configured. Run: superclaw localmodel setup');
    process.exit(1);
  }

  console.log(`\n🧪 Testing ${modelName}...\n`);

  const testPrompt = 'What is SuperClaw in one sentence?';
  console.log(`Prompt: ${testPrompt}\n`);

  try {
    const response = execSync(
      `curl -s http://localhost:11434/api/generate -d '{"model":"${modelName}","prompt":"${testPrompt}","stream":false}'`,
      { encoding: 'utf8' }
    );
    
    const data = JSON.parse(response);
    console.log(`Response: ${data.response}\n`);
    console.log('✓ Local model is working!\n');
  } catch (e) {
    console.error('Failed to test model:', e.message);
    console.log('Is Ollama running? Try: ollama serve');
  }
}

module.exports = {
  setupLocalModel,
  listLocalModels,
  testLocalModel
};

if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'setup':
      setupLocalModel();
      break;
    case 'list':
      listLocalModels();
      break;
    case 'test':
      testLocalModel();
      break;
    default:
      console.log('\nUsage:');
      console.log('  superclaw localmodel setup  - Install and configure a local model');
      console.log('  superclaw localmodel list   - List installed models');
      console.log('  superclaw localmodel test   - Test the configured model\n');
  }
}
