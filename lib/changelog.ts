import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface CommitData {
  sha: string;
  message: string;
  date: string;
  author: string;
}

export interface ReleaseData {
  tag: string;
  name: string;
  body: string;
  date: string;
}

export async function generateChangelog(
  repoName: string,
  commits: CommitData[],
  releases: ReleaseData[],
  tags: string[]
): Promise<string> {
  const releasesContext = releases.length > 0
    ? `## Releases\n${releases.map(r => `- ${r.tag} (${r.date}): ${r.name}\n${r.body}`).join('\n\n')}`
    : 'No releases found.';

  const commitsContext = commits.length > 0
    ? `## Recent Commits\n${commits.map(c => `- ${c.sha}: ${c.message} (${c.author}, ${c.date})`).join('\n')}`
    : 'No commits found.';

  const tagsContext = tags.length > 0
    ? `## Tags\n${tags.join(', ')}`
    : 'No tags found.';

  const prompt = `You are generating a CHANGELOG.md for a GitHub repository.

## Repository: ${repoName}

${releasesContext}

${commitsContext}

${tagsContext}

---

## YOUR TASK

Generate a professional CHANGELOG following the Keep a Changelog format (keepachangelog.com).

## STRUCTURE

1. Header with format explanation
2. Version sections (most recent first)
3. Categories: Added, Changed, Deprecated, Removed, Fixed, Security
4. Unreleased section if there are commits after the latest release

## RULES

- Start entries with a verb (Add, Fix, Update, Remove)
- Be concise but specific
- Group related commits
- Skip merge commits and trivial changes
- No commit hashes or author names in output
- Consolidate similar changes
- Write for users, not developers

## OUTPUT

Return ONLY the markdown. No preamble.`;

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
