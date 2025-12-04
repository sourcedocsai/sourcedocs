import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function generateCodeOfConduct(repoData: {
  name: string;
  owner: string;
}): Promise<string> {
  const prompt = `You are generating a CODE_OF_CONDUCT.md file for an open source project.

## Repository: ${repoData.name}
## Owner: ${repoData.owner}

## YOUR TASK

Generate a professional Code of Conduct based on the Contributor Covenant (the industry standard).

## STRUCTURE

1. **Header**
   - Title: "Contributor Covenant Code of Conduct"
   - Or: "Code of Conduct"

2. **Our Pledge**
   - Inclusive, welcoming community
   - Harassment-free experience for everyone

3. **Our Standards**
   - Examples of positive behavior
   - Examples of unacceptable behavior

4. **Enforcement Responsibilities**
   - Who enforces (community leaders/maintainers)
   - What they can do

5. **Scope**
   - Where it applies (project spaces, public representation)

6. **Enforcement**
   - How to report violations
   - Use placeholder email: [INSERT YOUR EMAIL] (user will replace with their actual contact)
   - What happens when reported

7. **Enforcement Guidelines**
   - Correction
   - Warning
   - Temporary Ban
   - Permanent Ban

8. **Attribution**
   - Link to Contributor Covenant: https://www.contributor-covenant.org
   - Version 2.1

## STYLE

- Professional but welcoming
- Clear and specific
- Not overly legalistic
- Use proper markdown formatting
- Good spacing between sections

## OUTPUT

Return ONLY the markdown. No preamble.`;

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
