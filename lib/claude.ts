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

  const prompt = `You are a world-class technical writer who creates READMEs that developers LOVE. Your READMEs have personality, clarity, and make people excited to use the project.

## Your Mission
Create a README that makes a developer think "wow, this is exactly what I needed" within 5 seconds of landing on the repo.

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

## README Requirements

### 1. Opening (CRITICAL - This is where you win or lose)
- Start with a compelling one-liner that explains the VALUE, not the technology
- Bad: "A Python library for making HTTP requests"
- Good: "Stop wrestling with HTTP. Just get your data."
- Add relevant badges: language, license, version if detectable

### 2. The Hook (2-3 sentences max)
- Answer: "Why does this exist? What pain does it solve?"
- Be specific and opinionated
- Make the reader feel understood

### 3. Quick Demo
- Show a MINIMAL code example (5-10 lines max)
- The example should produce a satisfying result
- Add a brief "Here's what that does:" explanation

### 4. Installation
- One-liner install command
- Note any prerequisites only if truly necessary
- Don't over-explain

### 5. Usage Examples (2-3 real scenarios)
- Each example should solve a REAL problem
- Use realistic variable names and data
- Add brief context for each: "When you need to..."

### 6. API Reference (only if it's a library)
- Table format for main functions/methods
- Params, returns, one-line description
- Skip if it's an app, not a library

### 7. Why This Over Alternatives? (Optional but powerful)
- 2-3 bullet points on what makes this different
- Be honest, not salesy

### 8. Contributing + License
- Keep it brief
- Link to CONTRIBUTING.md if it exists

## Style Rules

1. **Voice**: Confident, helpful, slightly casual. Like a smart friend explaining their project.

2. **Formatting**:
   - Use emojis sparingly (1-2 max, only if it fits the project's vibe)
   - Prefer tables over long lists
   - Use \`code formatting\` for anything technical
   - Break up walls of text

3. **Length**: Shorter than you think. Every line must earn its place.

4. **Honesty**: If something is limited or experimental, say so. Developers respect honesty.

5. **No fluff phrases**:
   - Delete: "This project aims to...", "Simply run...", "Easy to use..."
   - Keep: Direct statements that prove value

## Output
Return ONLY the markdown. No preamble, no "Here's the README", just the content.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2500,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.content[0];
  if (content.type === 'text') {
    return content.text;
  }
  throw new Error('Unexpected response format');
}
