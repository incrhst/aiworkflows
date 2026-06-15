---
sidebar_position: 2
---

# Getting Started

Welcome! This guide will walk you through setting up a modern local development environment on **macOS** or **Linux**. We will cover installing **Homebrew** (or the direct `uv` installer), configuring your shell, installing **`uv`**, and setting up **`headroom-ai`**.

---

## 1. Install Homebrew (macOS / Linux Optional)

**Homebrew** is the primary package manager for macOS and is also available on Linux (as Linuxbrew).

### macOS Installation
Run this command in your terminal to install Homebrew:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

After installing, configure your shell to recognize Homebrew:
```bash
# Add Homebrew setup to your Zprofile (runs on new shell sessions)
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile

# Apply to your current session
eval "$(/opt/homebrew/bin/brew shellenv)"
```

---

## 2. Install the `uv` Package & Tool Manager

**`uv`** is an extremely fast Python package and tool manager written in Rust. It replaces `pip` and manages Python versions and tools in clean, isolated environments.

### Option A: Install via Homebrew (macOS / Linux)
If you have Homebrew installed, you can easily install `uv` with:
```bash
brew install uv
```

### Option B: Direct Installer (Linux / macOS standalone)
If you are on Linux or prefer to install `uv` without Homebrew, use the official standalone installation script:
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

---

## 3. Install Node.js & npm (Node Package Manager)

**Node.js** is an open-source JavaScript runtime environment, and **npm** is the default package manager bundled with it. Since many developer agent tools (like `claude-code` or `hermes-agent`) run on Node, setting up Node.js & npm is essential.

### Option A: Standard Installation via Homebrew (Recommended)
If you have Homebrew installed, you can set up Node and npm with a single command:
```bash
brew install node
```

### Option B: Node Version Manager (For managing multiple environments)
If you need to work with different Node versions or want to avoid using `sudo` for global package installs, use **`fnm`** (Fast Node Manager):

1. Install `fnm` via Homebrew:
   ```bash
   brew install fnm
   ```

2. Add the environment setup to your shell configuration (e.g. `~/.zshrc` or `~/.bashrc`):
   ```bash
   # Add to ~/.zshrc (or ~/.bashrc if using bash)
   echo 'eval "$(fnm env --use-on-cd)"' >> ~/.zshrc
   source ~/.zshrc
   ```

3. Install the current Long-Term Support (LTS) release of Node.js:
   ```bash
   fnm install --lts
   ```

### Verify your installation:
Confirm that both Node.js and npm are installed and accessible in your shell:
```bash
node -v
npm -v
```

---

## 4. Install `headroom-ai` via `uv`

Instead of installing packages globally using `pip install` (which can cause package version conflicts), we will use `uv tool` to run and manage `headroom-ai` inside a sandboxed environment.

1. Install `headroom-ai` with all features:
   ```bash
   uv tool install "headroom-ai[all]"
   ```

2. Configure your shell paths so it can find the `uv`-installed tools (this adds `~/.local/bin` to your `PATH`):
   ```bash
   uv tool update-shell
   ```

3. Reload your shell configuration to apply the new path settings:
   - For **zsh**: `source ~/.zshrc`
   - For **bash**: `source ~/.bashrc`

---

## 5. Run your first Wrapped Command

Once `headroom-ai` is installed and in your shell `PATH`, you can use it to wrap commands (e.g., the Claude CLI or other developer tools):

```bash
headroom wrap claude
```

---

## macOS Tip: Launch TextEdit from the Command Line

If you are on macOS and want to quickly open or edit a file (like a config, log, or draft markdown file) in **TextEdit** without leaving your terminal, use the native macOS `open` utility:

* **Open a file in the default text editor (typically TextEdit):**
  ```bash
  open -e filename.txt
  ```
  *(The `-e` flag stands for "editor").*

* **Open a file specifically in the TextEdit application:**
  ```bash
  open -a TextEdit filename.txt
  ```

* **Open a file in plain text mode (ignoring rich-text/RTF formatting):**
  ```bash
  open -t filename.txt
  ```
