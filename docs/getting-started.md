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

## 3. Install `headroom-ai` via `uv`

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

## 4. Run your first Wrapped Command

Once `headroom-ai` is installed and in your shell `PATH`, you can use it to wrap commands (e.g., the Claude CLI or other developer tools):

```bash
headroom wrap claude
```
