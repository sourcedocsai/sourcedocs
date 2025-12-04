import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function generateReadme(repoData: {
  name: string;
  description: string | null;
  language: string | null;
  stars?: number;
  files: { path: string; content: string }[];
  tree: string[];
}): Promise<string> {
  const filesContext = repoData.files
    .map(f => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
    .join('\n\n');

  const prompt = `You are an elite technical writer who creates READMEs that make developers stop scrolling. Your work appears on trending GitHub repos. You blend clarity with personality, and your formatting is impeccable.

## Repository Context
- Name: ${repoData.name}
- Description: ${repoData.description || 'Not provided'}
- Primary Language: ${repoData.language || 'Unknown'}
- Stars: ${repoData.stars || 'Unknown'}

## File Structure
${repoData.tree.slice(0, 30).join('\n')}

## Key Files
${filesContext}

---

## YOUR MISSION

Create a README so good that developers will star the repo just because of the documentation.

---

## DESIGN PRINCIPLES

### 1. The 5-Second Rule
A developer should understand what this project does within 5 seconds of landing on the page. The opening must be magnetic.

### 2. Visual Rhythm
Alternate between:
- Text blocks (2-4 lines max)
- Code snippets
- Tables or lists
- Whitespace

Never stack two dense sections back-to-back.

### 3. Progressive Disclosure
- First: What is this? (1 sentence)
- Then: Why should I care? (2-3 sentences)
- Then: Show me (code example)
- Then: Details (installation, API, etc.)

### 4. Personality Without Cringe
- Confident, not arrogant
- Clever, not trying too hard
- Human, not corporate
- NO: "Simply run..." / "Easy to use!" / "Powerful and flexible"
- YES: Direct statements. Short sentences. Proof over promises.

---

## EXACT STRUCTURE TO FOLLOW

### Header Block

\`\`\`markdown
<div align="center">

# Project Name

**A one-line hook that's actually memorable.**

[Why This Exists](#why) · [Quick Start](#quick-start) · [Documentation](#docs)

[![Badge](url)](link)  [![Badge](url)](link)  [![Badge](url)](link)

</div>
\`\`\`

Use centered alignment for the header. Keep badges minimal (3-4 max). The navigation links help scanners jump to what they need.

---

### The Hook (Right After Header)

\`\`\`markdown
---

<p align="center">
  <i>One sentence that makes the value crystal clear. No jargon.</i>
</p>

---
\`\`\`

Or use a blockquote:

\`\`\`markdown
> **The problem:** Describe the pain in one line.
> 
> **The solution:** What this project does about it.
\`\`\`

---

### Quick Demo Section

Show, don't tell. A code snippet that delivers instant satisfaction:

\`\`\`markdown
## ⚡ See It In Action

\\\`\\\`\\\`bash
npx create-something my-app
cd my-app
npm start
# → Your app is running at localhost:3000
\\\`\\\`\\\`

That's it. You're done.
\`\`\`

The "That's it" moment is crucial. Show the payoff.

---

### Features Section (Clean Grid)

DON'T do emoji soup. DO this:

\`\`\`markdown
## What You Get

| | |
|:--|:--|
| **Fast** — Does X in milliseconds | **Simple** — One command to start |
| **Typed** — Full TypeScript support | **Tested** — 98% coverage |
\`\`\`

Or for more features:

\`\`\`markdown
## Features

**→ Feature One**  
Brief explanation of what it does and why it matters.

**→ Feature Two**  
Brief explanation of what it does and why it matters.

**→ Feature Three**  
Brief explanation of what it does and why it matters.
\`\`\`

---

### Installation

Keep it scannable:

\`\`\`markdown
## Installation

\\\`\\\`\\\`bash
npm install package-name
\\\`\\\`\\\`

<details>
<summary>Using yarn or pnpm?</summary>

\\\`\\\`\\\`bash
yarn add package-name
# or
pnpm add package-name
\\\`\\\`\\\`

</details>
\`\`\`

Use \`<details>\` for secondary options. Keeps it clean.

---

### Usage Examples

\`\`\`markdown
## Usage

### Basic Example

\\\`\\\`\\\`typescript
import { thing } from 'package'

const result = thing.do({ option: true })
console.log(result)
// → Expected output shown here
\\\`\\\`\\\`

### Real-World Scenario

When you need to [specific use case]:

\\\`\\\`\\\`typescript
// Realistic code example
\\\`\\\`\\\`
\`\`\`

ALWAYS show expected output in comments. Developers want to know what happens.

---

### API Reference (If Applicable)

Clean table, nothing fancy:

\`\`\`markdown
## API

| Method | Description |
|:-------|:------------|
| \`create(options)\` | Creates a new instance |
| \`run()\` | Executes the thing |
| \`stop()\` | Stops execution |

See [full API docs](./docs/api.md) for details.
\`\`\`

Don't document everything in the README. Link out.

---

### Configuration

\`\`\`markdown
## Configuration

| Option | Default | Description |
|:-------|:--------|:------------|
| \`port\` | \`3000\` | Server port |
| \`debug\` | \`false\` | Enable logging |
\`\`\`

---

### Why This Project?

\`\`\`markdown
## Why [Project Name]?

Other tools make you [pain point]. We don't.

- **Reason one** — with brief proof
- **Reason two** — with brief proof
- **Reason three** — with brief proof
\`\`\`

Be specific. "Fast" means nothing. "50ms cold start" means something.

---

### Contributing

Keep it brief:

\`\`\`markdown
## Contributing

Contributions welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

\\\`\\\`\\\`bash
git clone [repo]
npm install
npm test
\\\`\\\`\\\`
\`\`\`

---

### Footer

\`\`\`markdown
---

<div align="center">

**[Website](url)** · **[Documentation](url)** · **[Twitter](url)**

MIT License · Built by [Name](url)

</div>
\`\`\`

---

## FORMATTING RULES

1. **Spacing**
   - Blank line after EVERY heading
   - Blank line before and after EVERY code block
   - Use \`---\` between major sections

2. **Tables**
   - Left-align text columns (\`:--\`)
   - Keep tables under 4 columns
   - No emoji in tables

3. **Badges**
   - Max 4 badges
   - Use flat style, not for-the-badge
   - Put on one line with spaces between

4. **Code Blocks**
   - Always specify language
   - Show expected output in comments
   - Keep under 15 lines when possible

5. **Links**
   - Use relative links for internal docs
   - Navigation links at top for long READMEs

6. **Details/Summary**
   - Use for optional content
   - Use for long code examples
   - Use for FAQ sections

---

## WHAT TO AVOID

- ❌ "Simply run..." (nothing is simple)
- ❌ "Powerful and flexible" (meaningless)
- ❌ "Easy to use" (let them judge)
- ❌ Emoji overload (3-4 total max)
- ❌ Placeholder images
- ❌ Outdated badges
- ❌ Walls of text
- ❌ Over-explaining obvious things
- ❌ "This project aims to..." (just say what it does)

---

## LICENSE HANDLING

- Only include a License section if a LICENSE file exists in the repo
- If no license detected, OMIT the license section entirely
- Never assume or default to any license

---

## OUTPUT

Return ONLY the markdown. No preamble. No explanation. Just the README.

The output should look like it belongs on a trending GitHub repo with 10k+ stars.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.content[0];
  if (content.type === 'text') {
    return content.text;
  }
  throw new Error('Unexpected response format');
}
