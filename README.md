# Superclaw CLI

Your AI Companion Setup Tool - Create and manage AI workspaces with ease.

## Overview

Superclaw CLI helps you set up and manage workspaces for AI assistants like Clawdbot and OpenClaw. It provides a guided setup process, personality configuration, channel connections, and ongoing management tools.

## Installation

```bash
npm install -g @skunkceo/superclaw
```

## Quick Start

```bash
# Create your first AI workspace
superclaw init

# Customize your AI's personality
superclaw soul

# Connect to Slack, Discord, etc.
superclaw connect

# Check everything is working
superclaw status
```

## Commands

### Setup & Configuration

- **`superclaw init`** - Guided first-time setup wizard
- **`superclaw soul`** - Configure AI personality and behavior
- **`superclaw connect`** - Add communication channels (Slack, Discord, Telegram, WhatsApp)

### Management & Monitoring

- **`superclaw status`** - Health check and diagnostics
- **`superclaw memory`** - Set up and manage memory system
- **`superclaw module <name>`** - Install capability modules
- **`superclaw costs`** - Token usage and optimization tips
- **`superclaw doctor`** - Troubleshoot common issues

### Information

- **`superclaw help`** - Show command help
- **`superclaw version`** - Show version information

## Workspace Structure

When you run `superclaw init`, it creates a workspace with these files:

```
superclaw-workspace/
├── superclaw-config.json    # Main configuration
├── SOUL.md                  # AI personality definition
├── USER.md                  # Information about you
├── AGENTS.md                # Workspace guidelines
├── MEMORY.md                # Long-term memory
├── memory/                  # Daily memory files
│   └── YYYY-MM-DD.md
└── modules/                 # Installed capability modules
    └── <module-name>/
```

## AI Backends

Superclaw supports multiple AI backends:

- **Clawdbot** - Cloud-based, easy setup
- **OpenClaw** - Self-hosted, more control
- **Other** - Manual configuration for custom setups

## Channels

Connect your AI to various communication platforms:

- **Slack** - Bot tokens, Socket Mode support
- **Discord** - Bot integration with servers
- **Telegram** - Bot creation via @BotFather
- **WhatsApp** - Business API integration

## Modules

Extend your AI's capabilities with modules:

- **web-search** - Search and fetch web content
- **email** - IMAP/SMTP email integration
- **calendar** - Google Calendar, Outlook integration
- **task-management** - Todoist, Linear, GitHub Issues
- **file-ops** - Advanced file operations
- **social-media** - Twitter, LinkedIn, Reddit
- **analytics** - Google Analytics, reporting
- **coding** - Git, code review, deployment

```bash
# List available modules
superclaw module available

# Install a module
superclaw module web-search

# List installed modules
superclaw module list
```

## Memory System

Your AI maintains context through a memory system:

- **Daily files** - Raw logs of daily interactions
- **Long-term memory** - Curated important information
- **Auto-cleanup** - Configurable retention policies
- **Archiving** - Compress old files to save space

```bash
# Configure memory retention
superclaw memory

# View memory statistics
superclaw memory stats

# Backup memory files
superclaw memory backup
```

## Cost Optimization

Monitor and optimize AI usage costs:

```bash
# View cost analysis
superclaw costs

# Get optimization tips
superclaw costs optimize

# Compare model pricing
superclaw costs models

# Estimate costs for your setup
superclaw costs estimate
```

## Troubleshooting

If something isn't working:

```bash
# Run comprehensive diagnostics
superclaw doctor

# Check current status
superclaw status
```

Common issues and solutions:

### "No workspace found"
- Run `superclaw init` to create a workspace
- Make sure you're in the right directory

### "Configuration corrupted"
- Check JSON syntax in `superclaw-config.json`
- Re-run `superclaw init` to recreate

### "Channel connection failed"
- Verify API tokens and credentials
- Check network connectivity
- Review channel-specific documentation

### "Module not working"
- Check `config.json` has real values (not placeholders)
- Ensure module is enabled in `module.json`
- Run `superclaw status` to see module status

## Development

```bash
# Clone the repository
git clone https://github.com/skunkceo/superclaw-cli.git

# Install dependencies
cd superclaw-cli
npm install

# Test locally
node bin/superclaw.js help

# Link for global testing
npm link
```

## File Structure

```
superclaw-cli/
├── bin/
│   └── superclaw.js           # Main CLI entry point
├── lib/
│   ├── commands/              # Command implementations
│   │   ├── init.js
│   │   ├── soul.js
│   │   ├── connect.js
│   │   ├── memory.js
│   │   ├── module.js
│   │   ├── status.js
│   │   ├── costs.js
│   │   └── doctor.js
│   └── templates/             # Workspace file templates
│       ├── SOUL.md
│       ├── USER.md
│       ├── AGENTS.md
│       └── MEMORY.md
├── package.json
└── README.md
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

- Documentation: [GitHub Wiki](https://github.com/skunkceo/superclaw-cli/wiki)
- Issues: [GitHub Issues](https://github.com/skunkceo/superclaw-cli/issues)
- Community: [Discord Server](https://discord.gg/superclaw)

## Related Projects

- [Clawdbot](https://clawdbot.com) - Cloud AI assistant platform
- [OpenClaw](https://github.com/skunkceo/openclaw) - Self-hosted AI assistant
- [Skunk CLI](https://github.com/skunkceo/skunk-cli) - WordPress/AI integration tools