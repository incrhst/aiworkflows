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

The **Hermes Agent** runs persistently on your server, hosting a dashboard (WebUI) to track runs, inspect files, and review suggestions.

1. Clone and install the Hermes WebUI repository:
   ```bash
   git clone https://github.com/nousresearch/hermes-agent.git
   cd hermes-agent
   npm install
   ```

2. Configure the host environment to bind only to localhost or your Tailscale IP (to prevent public exposure):
   ```bash
   # Create a local environment configuration
   echo "HOST=0.0.0.0" >> .env
   echo "PORT=8080" >> .env
   ```
   > [!NOTE]
   > Binding to `0.0.0.0` inside your server makes it listen on all interfaces. However, because you do not open port `8080` on your public cloud firewall (e.g., AWS Security Groups or UFW), it will **only** be reachable by devices connected to your encrypted Tailscale network.

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

Once the server is running, launch the Hermes agent server:
```bash
npm run start
```

Now, from your laptop, tablet, or phone (with Tailscale turned on):

1. Open your browser and navigate to your server's Tailscale IP:
   `http://100.82.12.94:8080`

2. *(Optional)* If you have **MagicDNS** enabled in your Tailscale admin console, you can use your machine's hostname directly:
   `http://agent-server:8080`

---

## Best Practices & Security

> [!WARNING]
> Because Claude Code and Hermes have full read/write terminal access, exposing this portal to the open internet is extremely hazardous. Always follow these rules:

* **No Port Forwarding:** Never open port `8080` in UFW, AWS Security Groups, or router settings. Rely exclusively on Tailscale for incoming traffic.
* **Enable Tailscale HTTPS:** In your Tailscale settings, enable HTTPS certificates to encrypt traffic between your client device and the Hermes WebUI.
* **Workspace Isolation:** Run the agent server in a sandbox or isolated user account so it only has access to repositories you intend to edit.
