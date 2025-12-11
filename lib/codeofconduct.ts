import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function generateCodeOfConduct(repoData: {
  name: string;
  owner: string;
}): Promise<string> {
  const prompt = `Generate a standard CODE_OF_CONDUCT.md file for an open source project called "${repoData.name}" by ${repoData.owner}.

Use the widely-adopted Contributor Covenant format (version 2.1), which is the industry standard for open source projects.

Include these sections:
1. A welcoming header
2. "Our Pledge" - commitment to an inclusive community
3. "Our Standards" - examples of positive community behaviors
4. "Enforcement Responsibilities" - maintainer duties
5. "Scope" - where the code applies
6. "Enforcement" - how to report concerns (use placeholder: [INSERT CONTACT EMAIL])
7. "Attribution" - link to https://www.contributor-covenant.org version 2.1

Keep the tone professional, welcoming, and constructive. Focus on positive community building.

Format in clean markdown with proper headings and spacing.

Return ONLY the markdown content. No preamble or explanation.`;

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
