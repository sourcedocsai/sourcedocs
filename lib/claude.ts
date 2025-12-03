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

  const prompt = `You are a world-class technical writer who creates READMEs that developers LOVE. Your READMEs are visually stunning, easy to scan, and make people excited to use the project.

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

## CRITICAL FORMATTING RULES

### Spacing & Breathing Room
- Add a BLANK LINE after EVERY heading
- Add a BLANK LINE before and after EVERY code block
- Add a BLANK LINE between list items if they contain multiple lines
- Use horizontal rules (---) to separate major sections
- Never have more than 3-4 lines of text without a visual break

### Visual Hierarchy
- Use a large, bold project name at the top
- Follow with a punchy tagline in **bold** or as a blockquote
- Include badges on their own line, with spacing
- Use blockquotes (>) for key callouts or the main value prop

### Modern Layout Structure

1. **Header Section**
   - Project name (# large heading)
   - One-line tagline (bold or blockquote)
   - Badges (on separate line with spacing)
   - 2-3 sentence hook explaining the value

2. **Quick Visual Demo** (if applicable)
   - Screenshot, GIF, or code snippet showing the result
   - Keep it compelling and immediate

3. **Table of Contents** (for longer READMEs)
   - Use if README has 5+ sections
   - Link format: [Section Name](#section-name)

4. **The Problem / Why This Exists**
   - Use a blockquote or bold callout
   - Make the reader feel understood

5. **Features or What You Get**
   - Use a clean table OR
   - Use emoji bullets for visual scanning
   - Keep each point to ONE line

6. **Quick Start**
   - Numbered steps (not bullets)
   - Each step = one action
   - Code blocks for commands

7. **Installation**
   - Prerequisites in a callout box if needed
   - Single copy-paste command when possible

8. **Usage Examples**
   - 2-3 real-world scenarios
   - Use descriptive headers for each: "### Scenario: When you need to..."
   - Show input AND output when possible

9. **API Reference** (if applicable)
   - Use TABLES, not lists
   - Columns: Method/Function | Parameters | Returns | Description

10. **Configuration** (if applicable)
    - Use a table for env vars or options
    - Columns: Variable | Required | Default | Description

11. **Why This Over Alternatives**
    - Use a comparison table OR
    - 3 bullet points max

12. **Contributing**
    - Keep brief
    - Link to CONTRIBUTING.md if exists

13. **License**
    - One line

14. **Footer**
    - Horizontal rule
    - Credit line or link to author/org

---

## STYLE GUIDE

### Tone
- Confident but not arrogant
- Casual but professional
- Like a smart friend showing you their project

### Formatting Elements to Use
- **Bold** for emphasis and key terms
- \`code\` for anything technical
- > Blockquotes for important callouts
- Tables for structured data (always prefer over long lists)
- Emoji sparingly (🚀 ✨ 📦 ⚡ are safe choices)

### Formatting to AVOID
- Walls of text (never more than 4 lines without a break)
- Dense bullet lists (break them up)
- Headers without spacing after them
- Code blocks jammed against text

### Example of GOOD Spacing:

\`\`\`markdown
## Installation

> **Prerequisites:** Node.js 18+ required

Install via npm:

\\\`\\\`\\\`bash
npm install my-package
\\\`\\\`\\\`

Or with yarn:

\\\`\\\`\\\`bash
yarn add my-package
\\\`\\\`\\\`

---

## Quick Start

1. Import the package

   \\\`\\\`\\\`typescript
   import { something } from 'my-package'
   \\\`\\\`\\\`

2. Initialize with your config

   \\\`\\\`\\\`typescript
   const client = new Something({ apiKey: 'xxx' })
   \\\`\\\`\\\`

3. Start using it

   \\\`\\\`\\\`typescript
   const result = await client.doThing()
   \\\`\\\`\\\`
\`\`\`

### Example of BAD Spacing (AVOID):

\`\`\`markdown
## Installation
Install via npm:
\\\`\\\`\\\`bash
npm install my-package
\\\`\\\`\\\`
Or with yarn:
\\\`\\\`\\\`bash
yarn add my-package
\\\`\\\`\\\`
## Quick Start
1. Import the package
\\\`\\\`\\\`typescript
import { something } from 'my-package'
\\\`\\\`\\\`
\`\`\`

---

## OUTPUT REQUIREMENTS

1. Return ONLY raw markdown - no preamble, no "Here's the README"
2. Ensure proper spacing throughout
3. Make it visually beautiful when rendered on GitHub
4. Keep total length reasonable (300-600 lines max for complex projects, less for simple ones)
5. Every section must have breathing room

Generate the README now.`;

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
