---
sidebar_position: 2
---

# Using AI Skills

:::note
This content is a work in progress and is updated regularly as AI steering methodologies evolve.
:::

In the **Shape & Ship** paradigm, the primary mechanism for steering an agentic AI developer is through **AI Skills**.

An **AI Skill** is a machine-readable document (usually `SKILL.md` or packaged inside a `.zip` file along with static assets and schemas) that provides an AI agent with context-specific instructions, constraints, and resources for a project or brand.

---

## Why Use Skills?

Standard LLMs are trained on public web data and lack context about your specific project's architectural decisions, color palettes, folder structures, or prohibited libraries. 

If you do not specify these constraints, agents will guess—often defaulting to outdated or generic code. Feeding a skill solves this issue:

```
[Agent Context] + [No Skill]     --> Outputs generic/standard code (e.g., Tailwind, generic colors)
[Agent Context] + [Brand Skill]  --> Outputs styled code conforming to brand guidelines (#EA5148, Sora font)
```

---

## How Agents Consume Skills

Different agentic setups consume skills in different ways:

### 1. File Reference (System Prompts)
You can directly reference a skill file in your prompt or append it to the system context.
* **Instruction:** *"Follow the design guidelines and use the tokens defined in `docs/SKILL.md` to modify our styles."*
* **Outcome:** The agent reads the file, parses the color tokens, and applies them exactly as instructed.

### 2. Auto-Discovery (`llms.txt` or `brand.json`)
Modern agents scan project roots for standard files:
* **`brand.json`**: Contains color tokens, logo paths, and voice constraints in machine-readable JSON format.
- **`llms.txt`**: A markdown-like directory that links to documentation files, detailing how agents should interact with your API or code.
- **`SKILL.md`**: Direct agent instructions containing rules, styling guides, and code templates.

---

## Real-World Example: Incrementic Brand Skill

On [brand.incrementic.com](https://brand.incrementic.com), developers and agents can download the **Brand Skill Bundle** (`incrementic-brand-skill.zip`).

When unpacked, this skill contains:
1. **`SKILL.md`**: Markdown containing CSS color tokens, rules on how to format company text, logo alignment policies, and constraints (e.g. *"never rotate or stretch the logo"*).
2. **`brand.json`**: Machine-readable configuration detailing the primary color `#EA5148`, fonts, and allowed variations.
3. **Logo Assets**: High-resolution SVGs that the agent can insert directly into codebases.

### Feeding a Brand Skill to a Coding Agent

When starting a task (like branding a website), the agent follows these sequential steps:
1. **Locate and read** `brand.json` or `SKILL.md`.
2. **Import tokens** into the project's styling sheet (e.g., mapping `--ifm-color-primary` to the primary brand color).
3. **Retrieve and place** downloaded SVG assets into the `/static/` or `/assets/` folders.
4. **Compile & Verify** that the layout doesn't violate forbidden guidelines (such as scaling the logo incorrectly).

---

## Next Steps

Now that you know how agents use skills to maintain code consistency, learn how to build your own:
- **[Creating AI Skills](./creating-skills.md)**: Guide on structure, schema, and authoring guidelines for custom project skills.
