import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function generateReadme(repoData: {
  name: string;
  description: string | null;
  language: string | null;
  files: { path: string; content: string }[];
  tree: string[];
}): Promise<string> {
  const filesContext = repoData.files
    .map(f => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
    .join('\n\n');

  const prompt = `You are an expert technical writer creating a README.md for a GitHub repository.

## Repository Info
- Name: ${repoData.name}
- Description: ${repoData.description || 'Not provided'}
- Primary Language: ${repoData.language || 'Unknown'}

## File Structure (first 50 files)
${repoData.tree.join('\n')}

## Key Files
${filesContext}

---

Generate a professional README.md with these sections:

1. **Project Title + Badge** (language/framework badge if applicable)
2. **One-liner description** (be specific about what this actually does)
3. **Features** (3-5 bullet points, inferred from the code)
4. **Quick Start** (installation + basic usage, use actual commands from package.json/pyproject.toml/etc)
5. **Usage Examples** (1-2 realistic examples based on the code)
6. **API Reference** (only if it's a library—brief overview of main exports)
7. **Contributing** (short, standard)
8. **License** (if detectable, otherwise "MIT")

Rules:
- Be concise. Developers skim.
- Use REAL details from the code, not generic placeholders.
- If something is unclear, omit it rather than guess.
- Match the project's apparent complexity (don't over-document a simple script).
- Output raw markdown only. No commentary.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.content[0];
  if (content.type === 'text') {
    return content.text;
  }
  throw new Error('Unexpected response format');
}
