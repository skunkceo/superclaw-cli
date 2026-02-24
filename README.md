# SuperClaw CLI

Command-line tool for installing and managing SuperClaw - the beautiful web dashboard for OpenClaw.

## Overview

SuperClaw CLI helps you install the dashboard, manage Pro features, and configure your OpenClaw setup.

## Installation

```bash
npm install -g @skunkceo/superclaw-cli
```

## Quick Start

```bash
# Install SuperClaw dashboard
superclaw init

# Check status
superclaw status

# Upgrade to Pro (requires license)
superclaw pro install <your-license-key>
```

## Free vs Pro

**Free Tier:**
- Dashboard overview
- Chat interface  
- Sessions management
- Agent monitoring
- Workspace file browser
- Error tracking

**Pro Tier** (requires license from [skunkglobal.com](https://skunkglobal.com/checkout?product=superclaw-pro)):
- Smart Router - AI model selection and routing
- Settings - Advanced configuration
- Team - Multi-user management
- Tasks - Project tracking
- Stats - Advanced analytics
- Skills - Skills marketplace
- Command - Command palette
- Scheduled - Job scheduling

## Commands

### Installation & Setup

- **`superclaw init`** - Install SuperClaw dashboard
- **`superclaw setup`** - Create dashboard admin user
- **`superclaw setup user add <email>`** - Add dashboard user
- **`superclaw setup user list`** - List all users
- **`superclaw setup user delete <email>`** - Delete user
- **`superclaw setup user reset <email>`** - Reset user password

### Pro Features

- **`superclaw pro status`** - Check Pro license status
- **`superclaw pro install <key>`** - Install Pro features with license key

### Updates & Maintenance

- **`superclaw update`** - Update CLI and dashboard
- **`superclaw update --check`** - Check for available updates
- **`superclaw doctor`** - Troubleshoot common issues
- **`superclaw status`** - Health check and diagnostics

### Information

- **`superclaw help`** - Show all commands
- **`superclaw version`** - Show version info

## How It Works

**Installation Flow:**

1. `npm install -g @skunkceo/superclaw-cli` - Install CLI globally
2. `superclaw init` - Clones free dashboard from GitHub, installs locally
3. `superclaw setup` - Creates first admin user
4. Dashboard runs on `http://localhost:3000`

**Upgrading to Pro:**

1. Purchase license from [skunkglobal.com](https://skunkglobal.com/checkout?product=superclaw-pro)
2. `superclaw pro install <license-key>` - Validates license, downloads Pro package
3. Pro features automatically merge into your dashboard
4. Restart dashboard to see new features

## Architecture

SuperClaw consists of two repositories:

- **superclaw-dashboard** (public) - Free tier features
- **superclaw-dashboard-pro** (private) - Pro features

The CLI manages installation of both. Pro features are protected by license validation and require access to the private repository.

## Troubleshooting

If something isn't working:

```bash
# Run comprehensive diagnostics
superclaw doctor

# Check current status
superclaw status
```

Common issues:

**Dashboard won't start**
- Check if port 3000 is already in use
- Make sure Node.js is installed: `node --version`
- Try rebuilding: `cd <dashboard-path> && npm run build`

**Pro installation fails**
- Verify license key is correct
- Check GitHub authentication: `gh auth status`
- Make sure you have access to the private Pro repo

**Updates not applying**
- Run `superclaw update` to get latest versions
- Restart the dashboard after updates
- Clear browser cache if UI doesn't update

## Development

To contribute or modify SuperClaw:

```bash
# Clone the repos
git clone https://github.com/skunkceo/superclaw-cli.git
git clone https://github.com/skunkceo/superclaw-dashboard.git

# Link CLI locally
cd superclaw-cli
npm link

# Now 'superclaw' command uses your local version
```

## License

MIT License - See LICENSE file for details

**Pro package:** Proprietary - Requires valid license from [skunkglobal.com](https://skunkglobal.com)

## Links

- Dashboard (Free): [github.com/skunkceo/superclaw-dashboard](https://github.com/skunkceo/superclaw-dashboard)
- CLI: [github.com/skunkceo/superclaw-cli](https://github.com/skunkceo/superclaw-cli)
- Purchase Pro: [skunkglobal.com](https://skunkglobal.com/checkout?product=superclaw-pro)
- OpenClaw: [github.com/openclaw/openclaw](https://github.com/openclaw/openclaw)

## Support

- GitHub Issues: [github.com/skunkceo/superclaw-cli/issues](https://github.com/skunkceo/superclaw-cli/issues)
- Documentation: [docs.openclaw.ai](https://docs.openclaw.ai)
