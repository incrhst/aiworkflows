---
sidebar_position: 3
---

# Creating AI Skills

:::note
This content is a work in progress and is updated regularly as AI steering methodologies evolve.
:::

Creating an **AI Skill** is the process of writing machine-readable documentation that establishes styling, architecture, and tool constraints for LLM agents. 

A high-quality skill file ensures that when an agent joins your codebase, it has immediate alignment with your team's development standards without manual onboarding.

---

## Anatomical Structure of a `SKILL.md`

A standard developer-oriented `SKILL.md` file should include the following core sections:

```
SKILL.md
 ├── 1. Context & Intent (Purpose of the project)
 ├── 2. Tech Stack & Directory Mapping
 ├── 3. Coding Guidelines (Do's and Don'ts)
 ├── 4. Tool & Dependency Constraints
 └── 5. Verification & Validation Steps
```

---

## Step-by-Step: Authoring your first Skill

### Step 1: Define Context & Scope
Provide a 2-3 sentence overview of what the project is, who the users are, and why it is built.
> **Example:**
> *"This repository is the AI Workflows documentation website. It is built using Docusaurus (v3) and deployed on Vercel. Coding agents should focus on keeping documentation simple, brief, and highly readable."*

### Step 2: Establish Directory Mapping
Explain where different types of files belong so the agent doesn't write scratch scripts in your production directories.
* **Documentation:** `/docs/`
* **Custom Styles:** `/src/css/custom.css`
* **Static Images:** `/static/img/`

### Step 3: Outline Coding Guidelines (Do's and Don'ts)
Provide clear, actionable rules. Avoid vague instructions like *"write clean code."* Instead, use specific, quantifiable directions:

| ✅ Do | ❌ Do Not |
| :--- | :--- |
| Use CSS variables from `custom.css` for colors. | Hardcode hex values in component files. |
| Use standard HTML5 semantic tags (`<header>`, `<main>`). | Nest infinite generic `<div>` blocks. |
| Import icons as inline theme-responsive SVGs. | Import large external icon libraries (e.g., FontAwesome). |

### Step 4: Define Tool & Dependency Constraints
LLMs will often try to run shell commands to download packages or run configurations. Tell the agent exactly which commands are allowed and which are prohibited.
:::info Example Constraints
- **Allowed:** Always use `uv` package manager (e.g. `uv add react`) for python environments.
- **Prohibited:** Never use raw `pip install` commands.
:::

### Step 5: Specify Verification Methods
Tell the agent how to test its changes before ending its turn.
> **Verification Command:**
> ```bash
> npm run build
> ```
> *"The agent must verify that the build compiles successfully without any broken links or TypeScript compile errors before completing the task."*

---

## Packaging a Skill

For advanced setups, you can package a skill as a **Skill Bundle** (ZIP). This is especially useful for design systems, styling frameworks, or complex APIs:

1. **`SKILL.md`**: The primary text instructions for the model.
2. **`schema.json`**: Machine-readable constraints (like color palettes in HEX or REST API routing definitions).
3. **`assets/`**: Logos, icons, or component templates that the model can copy-paste.

---

## Iterative Refinement

A skill file is not static. If you notice a coding agent making a recurring mistake (e.g. using Tailwind classes on a vanilla CSS project):
1. **Analyze the error:** Why did the agent use Tailwind? (Likely because it is a common default).
2. **Update the skill:** Add a specific "Prohibited" rule to `SKILL.md` (e.g. *"Prohibited: Do not install or use Tailwind CSS"*).
3. **Re-run:** Observe if the agent corrects its behavior in subsequent runs.
