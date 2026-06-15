---
sidebar_position: 5
---

# Using the Claude API in Workflows

While pre-built interfaces and CLI agents (like Claude Code) are excellent for standard tasks, building **custom AI workflows** requires interacting directly with the **Anthropic Claude API**. 

Direct API integration allows you to automate code reviews, build custom repository indexing scripts, orchestrate multi-agent runs, and steer model behavior with high precision.

---

## 1. Setup & SDK Installation

Anthropic provides official libraries for Node.js and Python. We recommend using **`uv`** to run scripts instantly with their dependencies without polluting your global environment.

### Python Setup (using `uv`)
Run your script directly with the `anthropic` library dependency declared:
```bash
uv run --with anthropic python script.py
```

### Authentication
Set the API key as an environment variable in your terminal or `.env` file:
```bash
export ANTHROPIC_API_KEY="your-api-key-here"
```

---

## 2. Core API Implementation

The primary entry point for Claude is the **Messages API**. Here is a production-ready Python example demonstrating system prompt steering and the messages array:

```python
import os
from anthropic import Anthropic

# Initialize client (looks for ANTHROPIC_API_KEY in environment)
client = Anthropic()

response = client.messages.create(
    model="claude-3-5-sonnet-latest",
    max_tokens=2000,
    temperature=0.2,
    system="You are an expert Incrementic coding agent. Always output clean, vanilla CSS and follow plain over clever formatting.",
    messages=[
        {
            "role": "user",
            "content": "Create a CSS design token for our primary brand color (Incrementic Red, #EA5148)."
        }
    ]
)

print(response.content[0].text)
```

---

## 3. Advanced Workflow Patterns

To build fast, economical, and robust workflows, you must leverage Claude-specific API features:

### A. Prompt Caching (Essential for Codebases)
When building coding agents, you frequently send large files or repo contexts in your prompts. Claude's **Prompt Caching** allows you to cache these static contexts (like system instructions or base codebases) to reduce costs by **85%** and latency by **90%**.

> [!IMPORTANT]
> To enable caching, add the `cache_control` block to the end of the static content you want to cache (e.g. system instructions or a large file block):

```json
{
  "role": "user",
  "content": [
    {
      "type": "text",
      "text": "... 50,000 lines of codebase files ...",
      "cache_control": {"type": "ephemeral"}
    },
    {
      "type": "text",
      "text": "Find where the primary color is defined and replace it."
    }
  ]
}
```

### B. Steering with XML Tags
Claude is specifically trained to structure its thinking, context, and responses using XML tags. Always wrap dynamic inputs in clean tags to guide the model's focus.

* **Prompt Pattern:**
  ```xml
  You are a code refactoring assistant.
  
  <codebase_rules>
  - Always use spaces, not tabs.
  - Primary color is #EA5148.
  </codebase_rules>
  
  Please refactor the following source code:
  <source_code>
  const color = "green";
  </source_code>
  ```

### C. Tool Use (Function Calling)
You can equip Claude with custom "tools" (like reading a file, running a shell command, or calling a search API). The model will decide when to call these tools based on the user request.

```python
response = client.messages.create(
    model="claude-3-5-sonnet-latest",
    max_tokens=1024,
    tools=[
        {
            "name": "read_file",
            "description": "Read the contents of a file in the workspace",
            "input_schema": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Absolute path to the file"}
                },
                "required": ["path"]
            }
        }
    ],
    messages=[{"role": "user", "content": "Read /src/css/custom.css"}]
)

# If Claude decides to call the tool, response.stop_reason will be "tool_use"
```

---

## Best Practices

* **Temperature Control:** Use low temperatures (`0.0` to `0.2`) for deterministic coding tasks. Use higher temperatures (`0.5` to `0.7`) for brainstorming, naming products, or writing blog posts.
* **System Prompt Isolation:** Put style guidelines, allowed tools, and rules in the `system` parameter rather than mixing them into the `messages` array.
* **Handle Rate Limits:** Build retry mechanisms (like exponential backoff) into your custom API workflows to handle rate limits gracefully during large concurrent operations.
