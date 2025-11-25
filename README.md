# Cursor Rules Generator

An intelligent MCP Server that automatically analyzes your project and generates Cursor Rules tailored to your project's characteristics.

## ✨ Features

- ✅ **Smart Project Analysis**: Automatically scans project files and identifies tech stack and dependencies
- ✅ **Tech Stack Detection**: Supports 20+ mainstream tech stacks including Node.js, Python, Go, Rust, Java
- ✅ **Multi-Module Support**: Automatically detects monorepo, microservices, and other multi-module architectures
- ✅ **Code Feature Analysis**: Identifies component structures, API routes, state management patterns
- ✅ **Consistency Checking**: Compares project documentation with actual implementation
- ✅ **Best Practices Integration**: Generates rules based on framework best practices
- ✅ **Automatic Rule Generation**: Generates `.mdc` format rule files in `.cursor/rules/` directory
- ✅ **Modular Rules**: Supports global rules + module-specific rules
- ✅ **Dependency-Driven Rules**: Automatically generates rules based on project dependencies (routing, state management, etc.)
- ✅ **Rule Requirements Analysis**: Intelligently analyzes which rule files are needed and explains why
- ✅ **Generation Location Confirmation**: Automatically detects rule file generation locations to match project structure
- ✅ **Structured Output**: Provides detailed generation summaries and explanations

## 🚀 Quick Start

### Step 1: Configure Cursor (No Installation Required!)

**Recommended: Use npx** (automatically downloads and runs, no manual installation needed)

Find your Cursor MCP configuration file:

- **macOS/Linux**: `~/Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
- **Windows**: `%APPDATA%\Cursor\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`

Add this configuration:

```json
{
  "mcpServers": {
    "cursor-rules-generators": {
      "command": "npx",
      "args": ["-y", "cursor-rules-generators"],
      "disabled": false,
      "alwaysAllow": []
    }
  }
}
```

### Step 2: Restart Cursor

Completely quit and restart Cursor to apply the configuration.

### Step 3: Generate Rules

In Cursor's AI chat window, simply say:

```
Please generate Cursor Rules for the current project
```

Or specify a project path:

```
Please generate Cursor Rules for /Users/myname/projects/my-app
```

That's it! The tool will automatically:

1. Scan your project files
2. Detect your tech stack
3. Analyze code features
4. Generate appropriate rules
5. Save them to `.cursor/rules/` directory

## 📖 Alternative Installation Methods

### Option 2: Global Installation

If you prefer to install globally:

```bash
npm install -g cursor-rules-generators
```

Then configure:

```json
{
  "mcpServers": {
    "cursor-rules-generators": {
      "command": "cursor-rules-generators",
      "disabled": false,
      "alwaysAllow": []
    }
  }
}
```

### Option 3: Local Installation

For local installation in a project:

```bash
npm install cursor-rules-generators
```

Then configure with the full path:

```json
{
  "mcpServers": {
    "cursor-rules-generators": {
      "command": "node",
      "args": ["/project/path/node_modules/cursor-rules-generators/dist/index.js"],
      "disabled": false,
      "alwaysAllow": []
    }
  }
}
```

## 🛠️ Available Tools

### 1. `generate_cursor_rules`

Analyzes the project and generates complete Cursor Rules.

**Parameters:**

- `projectPath` (required): Absolute path to project root directory
- `updateDescription` (optional): Whether to automatically update description files, default `false`
- `includeModuleRules` (optional): Whether to generate module-specific rules, default `true`

**Example:**

```
Please generate Cursor Rules for /Users/myname/projects/my-app
```

### 2. `analyze_project`

Analyzes the project only, without generating rules. Returns detailed project information.

**Parameters:**

- `projectPath` (required): Absolute path to project root directory

**Example:**

```
Please analyze the project structure and tech stack
```

### 3. `check_consistency`

Checks consistency between project documentation and actual code.

**Parameters:**

- `projectPath` (required): Absolute path to project root directory

**Example:**

```
Please check if the project documentation matches the actual code
```

### 4. `update_project_description`

Updates project description documents based on actual code.

**Parameters:**

- `projectPath` (required): Absolute path to project root directory
- `descriptionFile` (optional): File to update, default `README.md`

**Example:**

```
Please update the README based on the actual code
```

### 5. `validate_rules`

Validates the format and content of Cursor Rules files.

**Parameters:**

- `projectPath` (required): Absolute path to project root directory
- `validateModules` (optional): Whether to validate rule files in module directories, default `true`

**Example:**

```
Please validate the Cursor Rules files in the current project
```

### 6. `preview_rules_generation`

Previews the rule generation process, listing all tasks, analysis results, and decision points without actually generating files.

**Parameters:**

- `projectPath` (required): Absolute path to project root directory

**Example:**

```
Please preview what rules would be generated
```

### 7. `info`

Displays MCP tool information, including version, log configuration status, environment variables, and any detected configuration issues.

**Parameters:** None

**Example:**

```
Show tool information
```

## 📋 How It Works

```
1. Collect project files (max 10 levels deep)
   ↓
2. Detect tech stack and dependencies
   ↓
3. Identify multi-module structure
   ↓
4. Analyze code features
   ↓
5. Identify routing systems (from dependencies and file structure)
   ↓
6. Get best practices (via Context7 if configured)
   ↓
7. Analyze rule requirements (determine which rules are needed)
   ↓
8. Check documentation consistency
   ↓
9. (Optional) Prompt user to update description files
   ↓
10. Confirm generation locations (check directory structure)
   ↓
11. Generate global + module rules (based on requirements analysis)
   ↓
12. Write .cursor/rules/*.mdc files
   ↓
13. Return structured summary
```

## 🔧 Supported Tech Stacks

### Frontend Frameworks

- React, Vue, Angular, Svelte
- Next.js, Nuxt, SvelteKit

### Backend Frameworks

- Express, Fastify, NestJS, Koa, Hapi
- Django, Flask, FastAPI

### Languages

- JavaScript, TypeScript
- Python, Go, Rust, Java
- PHP, Ruby

### Tools

- npm / yarn / pnpm
- pip / pipenv
- cargo
- go modules
- maven / gradle

## 📁 Generated File Structure

### Single Module Project

```
your-project/
├── .cursor/
│   └── rules/
│       ├── global-rules.mdc      # Global rules
│       ├── code-style.mdc        # Code style rules
│       └── architecture.mdc       # Architecture rules
├── src/
├── package.json
└── README.md
```

### Multi-Module Project

```
your-multi-module-project/
├── .cursor/
│   └── rules/
│       └── global-rules.mdc      # Global rules
├── frontend/
│   ├── .cursor/
│   │   └── rules/
│   │       └── frontend-rules.mdc   # Frontend module rules
│   └── src/
├── backend/
│   ├── .cursor/
│   │   └── rules/
│   │       └── backend-rules.mdc    # Backend module rules
│   └── src/
└── shared/
    ├── .cursor/
    │   └── rules/
    │       └── shared-rules.mdc     # Shared module rules
    └── src/
```

**Smart Features:**

- ✅ Global rules in project root affect the entire project
- ✅ Module rules in their respective directories affect only that module
- ✅ Cursor automatically loads relevant rules based on current file location
- ✅ Module rules can override global rule configurations

## 📝 Example Output

Generated rules include:

- **Project Overview**: Tech stack, languages, frameworks
- **Project Structure**: Module organization and responsibilities
- **Core Features**: Components, APIs, state management, etc.
- **Development Guidelines**: Framework-specific development guides
- **Code Style**: Naming conventions, formatting, best practices
- **File Organization**: Directory structure and file naming conventions
- **Important Notes**: Common pitfalls and important reminders

## 🤝 Context7 Integration

If you have Context7 MCP Server configured in your environment, this tool will automatically fetch official documentation and best practices for your dependencies.

If Context7 is not configured, the tool will use built-in best practice templates.

**Configuring Context7 (Optional):**

Refer to [Context7 MCP Server documentation](https://context7.ai/) for setup instructions.

## 🔍 Excluded Directories

The following directories are automatically excluded:

- `node_modules`, `.git`
- `dist`, `build`, `out`
- `.next`, `.nuxt`
- `coverage`, `.cache`
- `.vscode`, `.idea`
- `__pycache__`, `.pytest_cache`
- `venv`, `env`
- `target`, `bin`, `obj`

## ⚙️ Environment Variables

### Log Level

Control log verbosity:

```bash
# Set log level (DEBUG, INFO, WARN, ERROR, NONE)
export CURSOR_RULES_GENERATOR_LOG_LEVEL=DEBUG
```

Or in Cursor configuration:

```json
{
  "mcpServers": {
    "cursor-rules-generators": {
      "command": "npx",
      "args": ["-y", "cursor-rules-generators"],
      "env": {
        "CURSOR_RULES_GENERATOR_LOG_LEVEL": "INFO"
      }
    }
  }
}
```

### Custom Log File Location

```bash
export CURSOR_RULES_GENERATOR_LOG_FILE=/path/to/your/logfile.log
```

### Debug Mode

```bash
# Enable debug mode (automatically sets log level to DEBUG)
export CURSOR_RULES_GENERATOR_DEBUG=true
```

**Log Levels:**

- `DEBUG`: All logs including detailed debugging information
- `INFO`: Informational logs (default)
- `WARN`: Warnings and errors only
- `ERROR`: Errors only
- `NONE`: No logs

### Viewing Logs

Logs are written to files (not stdout/stderr) to avoid interfering with MCP protocol communication.

**Default log locations:**

- **macOS**: `~/Library/Logs/cursor-rules-generators.log`
- **Windows**: `%USERPROFILE%\AppData\Local\cursor-rules-generators.log`
- **Linux/Unix**: `~/.local/log/cursor-rules-generators.log`

**View logs:**

```bash
# macOS/Linux
tail -f ~/Library/Logs/cursor-rules-generators.log

# Windows
Get-Content $env:USERPROFILE\AppData\Local\cursor-rules-generators.log -Tail 100
```

Or use the `info` tool to see the log file path:

```
Show tool information
```

## ⚠️ Important Notes

1. **First Generation**: First generation may take a few seconds depending on project size
2. **Large Projects**: Very large projects (10,000+ files) may take longer
3. **Rule Overwriting**: Regenerating will overwrite existing rule files
4. **Manual Editing**: Consider placing custom rules in separate files to avoid overwriting
5. **Context7**: Context7 integration is optional; basic functionality works without it
6. **Logs**: Logs are written to files, not displayed in the console

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit Issues and Pull Requests.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/ALvinCode/fe-cursor-rules-generators.git
cd cursor-rules-generators

# Install dependencies
pnpm install

# Development mode (auto-recompile)
pnpm run watch

# Build
pnpm run build

# Test
pnpm test
```

## 📮 Feedback & Support

- **GitHub Issues**: [Report Issues](https://github.com/ALvinCode/fe-cursor-rules-generators/issues)
- **Repository**: [GitHub Repository](https://github.com/ALvinCode/fe-cursor-rules-generators)

---

If this tool helps you, please give us a ⭐️!
