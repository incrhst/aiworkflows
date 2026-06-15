---
sidebar_position: 6
---

# Managing Environment Variables & Config Files

In modern AI development, managing configurations and environment variables is critical. Your workspace files, API keys (e.g. `ANTHROPIC_API_KEY`), and tool behaviors are defined here. 

Because coding agents have terminal execution and file modification access, a single mistake could lead to committing secrets to public repositories or corrupting project configurations.

---

## 1. Environment Variables & `.env` Files

Environment variables are key-value pairs stored in the operating system environment. They are the standard way to supply secret API keys to SDKs and agents.

### The Template Pattern (`.env.example`)
You should **never** commit actual secrets or `.env` files to Git. Instead, commit a template file named `.env.example` that shows what variables are required:

```bash
# Example .env.example (Safe to commit)
ANTHROPIC_API_KEY=your_anthropic_api_key_here
PORT=8080
HOST=127.0.0.1
```

When a developer or coding agent clones the repository, they copy the template to create their private, local `.env` file:
```bash
cp .env.example .env
```

### Preventing Agent Commits (`.gitignore`)
Always ensure that `.env` is listed in your project's `.gitignore` file. This prevents AI agents (which might stage and commit files automatically) from accidentally pushing your private keys to remote hosts:

```
# .gitignore
.env
.env.local
.env.development.local
```

> [!CAUTION]
> **Secret Exposure:** If you accidentally commit a `.env` containing active API keys to GitHub, Anthropic and other providers will automatically detect the leak and instantly revoke your keys to prevent abuse.

---

## 2. Reading Variables in Code

Different runtime environments load `.env` variables into execution memory differently:

### Python (using `python-dotenv`)
1. Install the dependency: `uv add python-dotenv`
2. Load and read variables in code:
   ```python
   import os
   from dotenv import load_dotenv

   # Load variables from .env file
   load_dotenv()

   # Retrieve key
   api_key = os.getenv("ANTHROPIC_API_KEY")
   ```

### Node.js (native / `dotenv`)
* **Node.js (v20.6.0+):** You can load `.env` files natively without third-party libraries:
  ```bash
  node --env-file=.env index.js
  ```
- **Using SDK library:**
  ```javascript
  import 'dotenv/config'; // loads key-value pairs into process.env
  const apiKey = process.env.ANTHROPIC_API_KEY;
  ```

---

## 3. Tool-Specific Configuration Files

Many developer tools store their setups in configuration files:

| Tool | Config File Path | Format | Primary Use |
| :--- | :--- | :--- | :--- |
| **Hermes Agent** | `~/.hermes/config.yaml` | YAML | Routing keys, default LLM, custom providers, and system presets. |
| **Claude Code** | `~/.config/claude/config.json` | JSON | Authentication tokens, default project scopes, and CLI editor choices. |
| **Docusaurus** | `./docusaurus.config.ts` | TypeScript | Site title, navigation structures, plugin parameters, and header branding. |
| **Vercel** | `./vercel.json` | JSON | Deployment build commands, output routing directories, and redirects. |

### Steering Agents with Config Files
When configuring these tools:
1. **Prefer local configs** inside the project workspace directory (e.g. `./vercel.json`) over global configs (e.g. `~/.config/`) whenever possible, so that standard configurations are tracked in Git.
2. **Keep API keys out of configs** by referencing env variables (e.g., leaving `api_key` empty in config if the tool can fall back to the `ANTHROPIC_API_KEY` env variable).
3. **Use the `llms.txt` file** at the root of your project to tell agents where local configurations and templates are located.
