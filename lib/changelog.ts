import Anthropic from '@anthropic-ai/sdk';
import { CommitData, ReleaseData } from './github';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function generateChangelog(data: {
  name: string;
  commits: CommitData[];
  releases: ReleaseData[];
  tags: string[];
}): Promise<string> {
  const commitsText = data.commits
    .map(c => `- ${c.date.slice(0, 10)} | ${c.sha} | ${c.message} (${c.author})`)
    .join('\n');

  const releasesText = data.releases.length > 0
    ? data.releases.map(r => `## ${r.tag} - ${r.date.slice(0, 10)}\n${r.body}`).join('\n\n')
    : 'No releases found.';

  const prompt = `You are an expert technical writer creating a professional CHANGELOG.md for a GitHub repository.

## Repository: ${data.name}

## Existing Releases
${releasesText}

## Recent Commits
${commitsText}

## Available Tags
${data.tags.join(', ') || 'None'}

---

## YOUR TASK

Generate a professional CHANGELOG.md following the Keep a Changelog format (https://keepachangelog.com).

## FORMAT RULES

1. **Header**
\`\`\`markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
\`\`\`

2. **Version Sections**
- Use \`## [version] - YYYY-MM-DD\` format
- If releases exist, use those versions
- If no releases, infer versions from tags or group by date
- Most recent first

3. **Change Categories** (only include if relevant)
- \`### Added\` — New features
- \`### Changed\` — Changes in existing functionality
- \`### Deprecated\` — Soon-to-be removed features
- \`### Removed\` — Removed features
- \`### Fixed\` — Bug fixes
- \`### Security\` — Vulnerability fixes

4. **Entry Format**
- Start each entry with a verb: Add, Fix, Update, Remove, Improve
- Be concise but specific
- Group related commits into single entries
- Skip merge commits, version bumps, and trivial changes

5. **Unreleased Section**
- If there are commits after the latest release, add \`## [Unreleased]\` at the top

## STYLE

- Clean, scannable formatting
- Blank line between sections
- No commit hashes in the output
- No author names
- Consolidate similar changes
- Make it useful for users, not developers

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
