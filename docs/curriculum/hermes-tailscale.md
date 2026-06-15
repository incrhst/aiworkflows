---
sidebar_position: 4
---

# Secure Remote Agents: Hermes, Claude Code, & Tailscale

This guide walks you through setting up an **always-on, self-hosted AI agent portal**. By combining **Hermes Agent** (Nous Research) for persistent orchestration, **Claude Code** for specialized software engineering execution, and **Tailscale** for secure remote networking, you can access your private AI development workstation from any device in the world.

---

## Architecture Overview

Traditional coding agents run in short-lived local terminal sessions. To build long-running workflows (e.g., continuous refactoring or automated test monitoring), we need a self-hosted agent server. 

To prevent exposing this powerful development interface to the public internet, we route all traffic through a private **Tailscale** tunnel (Tailnet).

```mermaid
graph LR
    User[Developer Device<br>Laptop / Mobile] -- Encrypted Tailnet Tunnel --> TS[Tailscale Network]
    TS -- Port 8080 --> Server[Self-Hosted VPS / Home Server]
    
    subgraph Server ["Developer Server Environment"]
        WebUI[Hermes WebUI] <--> Hermes[Hermes Agent Orchestrator]
        Hermes -- Command Delegation --> Claude[Claude Code CLI]
        Claude <--> Workspace[Project Files / Workspace]
    end
    
    style Server fill:var(--ifm-background-flat-color),stroke:var(--ifm-color-emphasis-300),stroke-width:2px
    style WebUI fill:var(--incrementic-red),color:#fff
    style Claude fill:var(--incrementic-charcoal),color:#fff
```

---

## Step 1: Secure the Host with Tailscale

**Tailscale** creates a zero-config peer-to-peer VPN (a "tailnet") that assigns a stable, private IP address (in the `100.x.y.z` range) to each of your devices.

1. **Install Tailscale** on your agent server:
   ```bash
   # For macOS (using Homebrew)
   brew install tailscale
   
   # For Ubuntu/Debian Linux
   curl -fsSL https://tailscale.com/install.sh | sh
   ```

2. **Authenticate and Start** the service:
   ```bash
   sudo tailscale up
   ```
   *Follow the printed browser link to authenticate the server to your Tailscale account.*

3. **Verify the Private IP**:
   ```bash
   tailscale ip -4
   # Output will be something like: 100.82.12.94
   ```

---

## Step 2: Install Hermes Agent & WebUI

Setting up the server environment involves installing the core **Hermes Agent** and then building the **Hermes WebUI** (a lightweight browser dashboard to manage your AI sessions).

### 1. Install the Core Hermes Agent
Run the official installer command to install the core agent:
```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
```

### 2. Install and Build the WebUI
Clone the lightweight python/web interface wrapper and compile the frontend:

1. Clone the web dashboard repository:
   ```bash
   git clone https://github.com/sanchomuzax/hermes-webui.git
   cd hermes-webui
   ```

2. Create an isolated Python virtual environment and install the package:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -e .
   ```

3. Compile the frontend Vite assets:
   ```bash
   cd frontend
   npm install
   npx vite build
   cd ..
   ```

4. Configure the server variables. Create a `.env` file in the root of the `hermes-webui` directory:
   ```bash
   HOST=0.0.0.0
   PORT=8080
   ```
   :::note
   Binding to `0.0.0.0` inside your server makes it listen on all interfaces. However, because you do not open port `8080` on your public cloud firewall (e.g., AWS Security Groups or UFW), it will **only** be reachable by devices connected to your encrypted Tailscale network.
   :::

3. **Configure API Keys in `config.yaml`**:
   Hermes looks for providers and key settings in the configuration file located at `~/.hermes/config.yaml`. Open this file and specify Anthropic as your provider:
   ```yaml
   provider: anthropic
   model:
     default: claude-3-5-sonnet-latest
   providers:
     anthropic:
       api_key: sk-ant-your-anthropic-api-key-here
   ```
   *(Alternatively, you can run the interactive setup wizard via `hermes setup` or `hermes model` to input keys directly, or add `ANTHROPIC_API_KEY=sk-ant-...` inside `~/.hermes/.env`).*

---

## Step 3: Integrate Claude Code as the Engine

While Hermes manages context, scheduling, and chat surfaces, it delegates complex, terminal-heavy software engineering tasks to **Claude Code** (the specialized CLI coding agent from Anthropic).

1. Install **Claude Code** globally on the server:
   ```bash
   npm install -g @anthropic-ai/claude-code
   ```

2. Authenticate Claude Code with your Anthropic key:
   ```bash
   claude login
   ```

3. Enable the **Hermes-to-Claude** execution bridge. In your Hermes WebUI config dashboard:
   - Navigate to **Settings > Integrations**.
   - Enable **Claude Code CLI**.
   - Set the working workspace path to `/Users/username/projects` (or your preferred repository directory).

---

## Step 4: Access Your Agent Remotely

Once the installation is complete, launch the WebUI server:
```bash
# Make sure your python virtual environment is active
source venv/bin/activate

# Launch the server
hermes-webui
```

Now, from your laptop, tablet, or phone (with Tailscale turned on):

1. Open your browser and navigate to your server's Tailscale IP:
   `http://100.82.12.94:8080`

2. *(Optional)* If you have **MagicDNS** enabled in your Tailscale admin console, you can use your machine's hostname directly:
   `http://agent-server:8080`

---

## macOS Gotchas & Setup Notes

If you are setting up your agent server or client on **macOS**, pay attention to the following platform-specific gotchas:

### 1. App Store vs. Homebrew CLI Pathing
Tailscale on macOS has two main distributions: the Standalone/Homebrew package and the Mac App Store App. 
* **The Gotcha:** If you install the Mac App Store app, the `tailscale` CLI command is **not** added to your shell `$PATH` automatically. 
* **The Fix:** If you want to use CLI commands (like `tailscale up` or `tailscale status`), you must manually link the binary from the App Store bundle:
  ```bash
  sudo ln -s /Applications/Tailscale.app/Contents/Resources/bin/tailscale /usr/local/bin/tailscale
  ```
  *Alternatively, if you installed via Homebrew (`brew install tailscale`), the CLI will be in your path immediately.*

### 2. Network Extension & VPN Profile Approvals
On macOS, Tailscale runs as a **Network Extension**.
* **The Gotcha:** During installation or when run for the first time, macOS will show a prompt: *"Tailscale" Would Like to Add VPN Configurations*. 
* **The Fix:** You **must** click **Allow** and authenticate using your macOS user password. If this popup is dismissed or denied, Tailscale will be stuck in a disconnected state.
* **Note for Managed Macs:** If you are using a corporate Mac managed by MDM (Mobile Device Management), local extensions might be restricted. Check **System Settings > Privacy & Security > Extensions** to verify.

### 3. MagicDNS Cache Refresh
* **The Gotcha:** Sometimes, after connecting to your tailnet, macOS fails to resolve `.ts.net` addresses immediately due to DNS caching.
* **The Fix:** Flush the macOS DNS resolver cache using the following command:
  ```bash
  sudo killall -HUP mDNSResponder
  ```

---

## Best Practices & Security

:::warning
Because Claude Code and Hermes have full read/write terminal access, exposing this portal to the open internet is extremely hazardous. Always follow these rules:
:::

* **No Port Forwarding:** Never open port `8080` in UFW, AWS Security Groups, or router settings. Rely exclusively on Tailscale for incoming traffic.
* **Enable Tailscale HTTPS:** In your Tailscale settings, enable HTTPS certificates to encrypt traffic between your client device and the Hermes WebUI.
* **Workspace Isolation:** Run the agent server in a sandbox or isolated user account so it only has access to repositories you intend to edit.
