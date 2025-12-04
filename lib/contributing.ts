import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function generateContributing(repoData: {
  name: string;
  language: string | null;
  files: { path: string; content: string }[];
  tree: string[];
}): Promise<string> {
  const hasFile = (name: string) => repoData.tree.some(f => f.toLowerCase().includes(name.toLowerCase()));
  
  const context = {
    hasTests: hasFile('test') || hasFile('spec'),
    hasEslint: hasFile('eslint'),
    hasPrettier: hasFile('prettier'),
    hasDocker: hasFile('docker'),
    hasGithubActions: hasFile('.github/workflows'),
    packageManager: repoData.tree.includes('yarn.lock') ? 'yarn' : 
                    repoData.tree.includes('pnpm-lock.yaml') ? 'pnpm' : 'npm',
  };

  const prompt = `You are an expert open source maintainer creating a CONTRIBUTING.md for a GitHub repository.

## Repository: ${repoData.name}
## Primary Language: ${repoData.language || 'Unknown'}
## Package Manager: ${context.packageManager}

## Detected Features
- Has tests: ${context.hasTests}
- Has ESLint: ${context.hasEslint}
- Has Prettier: ${context.hasPrettier}
- Has Docker: ${context.hasDocker}
- Has GitHub Actions: ${context.hasGithubActions}

## File Structure (sample)
${repoData.tree.slice(0, 30).join('\n')}

---

## YOUR TASK

Generate a professional, welcoming CONTRIBUTING.md that makes it easy for new contributors to get started.

## STRUCTURE

1. **Welcome Header**
   - Warm, encouraging opening
   - Brief statement that contributions are welcome

2. **Table of Contents**
   - Link to each major section

3. **Code of Conduct**
   - Brief reference (link to CODE_OF_CONDUCT.md if they want full version)
   - Keep it to 2-3 bullet points of expected behavior

4. **Getting Started**
   - Prerequisites (Node version, etc.)
   - Fork & clone instructions
   - Install dependencies (use detected package manager)
   - Run locally

5. **Development Workflow**
   - Branch naming conventions (feature/, bugfix/, etc.)
   - How to run tests (if detected)
   - Linting/formatting (if detected)
   - Commit message format

6. **Pull Request Process**
   - Step-by-step PR checklist
   - What to include in PR description
   - Review process expectations

7. **Issue Guidelines**
   - Bug report expectations
   - Feature request process
   - Good first issues mention

8. **Style Guide** (brief)
   - Code style basics
   - Link to linter config if present

9. **Recognition**
   - How contributors are recognized
   - All contributors welcome message

---

## STYLE RULES

1. **Tone**
   - Welcoming and encouraging
   - Clear and actionable
   - Not bureaucratic or intimidating

2. **Formatting**
   - Use checkboxes for checklists
   - Use code blocks for commands
   - Use tables where appropriate
   - Good spacing between sections
   - Use \`<details>\` for optional/advanced info

3. **Commands**
   - Use the detected package manager (${context.packageManager})
   - Show exact commands to copy-paste

4. **Length**
   - Comprehensive but not overwhelming
   - Hide advanced details in collapsible sections

---

## EXAMPLE SECTIONS

### Good PR Checklist Example:
\`\`\`markdown
## Pull Request Checklist

Before submitting your PR, please make sure:

- [ ] I have read the [Contributing Guidelines](CONTRIBUTING.md)
- [ ] My code follows the project's style guidelines
- [ ] I have added tests for my changes
- [ ] All new and existing tests pass
- [ ] I have updated documentation as needed
\`\`\`

### Good Branch Naming Example:
\`\`\`markdown
## Branch Naming

- \`feature/add-user-auth\` — New features
- \`fix/login-bug\` — Bug fixes
- \`docs/update-readme\` — Documentation
- \`refactor/clean-utils\` — Code refactoring
\`\`\`

---

## OUTPUT

Return ONLY the markdown. No preamble. Make it welcoming and professional.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.content[0];
  if (content.type === 'text') {
    return content.text;
  }
  throw new Error('Unexpected response format');
}
