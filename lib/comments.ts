import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Language detection based on file extension
const LANGUAGE_CONFIG: Record<string, { name: string; commentStyle: string; docStyle: string }> = {
  // JavaScript/TypeScript
  js: { name: 'JavaScript', commentStyle: '//', docStyle: 'JSDoc' },
  jsx: { name: 'JavaScript (React)', commentStyle: '//', docStyle: 'JSDoc' },
  ts: { name: 'TypeScript', commentStyle: '//', docStyle: 'TSDoc' },
  tsx: { name: 'TypeScript (React)', commentStyle: '//', docStyle: 'TSDoc' },
  mjs: { name: 'JavaScript (ESM)', commentStyle: '//', docStyle: 'JSDoc' },
  
  // Python
  py: { name: 'Python', commentStyle: '#', docStyle: 'docstrings (Google style)' },
  pyi: { name: 'Python (stub)', commentStyle: '#', docStyle: 'docstrings (Google style)' },
  
  // Go
  go: { name: 'Go', commentStyle: '//', docStyle: 'GoDoc' },
  
  // Rust
  rs: { name: 'Rust', commentStyle: '//', docStyle: 'rustdoc (///)' },
  
  // Java/Kotlin
  java: { name: 'Java', commentStyle: '//', docStyle: 'Javadoc' },
  kt: { name: 'Kotlin', commentStyle: '//', docStyle: 'KDoc' },
  kts: { name: 'Kotlin (script)', commentStyle: '//', docStyle: 'KDoc' },
  
  // C/C++
  c: { name: 'C', commentStyle: '//', docStyle: 'Doxygen' },
  h: { name: 'C Header', commentStyle: '//', docStyle: 'Doxygen' },
  cpp: { name: 'C++', commentStyle: '//', docStyle: 'Doxygen' },
  hpp: { name: 'C++ Header', commentStyle: '//', docStyle: 'Doxygen' },
  cc: { name: 'C++', commentStyle: '//', docStyle: 'Doxygen' },
  
  // C#
  cs: { name: 'C#', commentStyle: '//', docStyle: 'XML documentation comments' },
  
  // Ruby
  rb: { name: 'Ruby', commentStyle: '#', docStyle: 'YARD' },
  
  // PHP
  php: { name: 'PHP', commentStyle: '//', docStyle: 'PHPDoc' },
  
  // Swift
  swift: { name: 'Swift', commentStyle: '//', docStyle: 'Swift documentation comments' },
  
  // Scala
  scala: { name: 'Scala', commentStyle: '//', docStyle: 'Scaladoc' },
  
  // Shell
  sh: { name: 'Shell', commentStyle: '#', docStyle: 'inline comments' },
  bash: { name: 'Bash', commentStyle: '#', docStyle: 'inline comments' },
  zsh: { name: 'Zsh', commentStyle: '#', docStyle: 'inline comments' },
  
  // Lua
  lua: { name: 'Lua', commentStyle: '--', docStyle: 'LuaDoc' },
  
  // R
  r: { name: 'R', commentStyle: '#', docStyle: 'roxygen2' },
  
  // Elixir
  ex: { name: 'Elixir', commentStyle: '#', docStyle: '@doc/@moduledoc' },
  exs: { name: 'Elixir (script)', commentStyle: '#', docStyle: '@doc/@moduledoc' },
  
  // Haskell
  hs: { name: 'Haskell', commentStyle: '--', docStyle: 'Haddock' },
  
  // SQL
  sql: { name: 'SQL', commentStyle: '--', docStyle: 'inline comments' },
  
  // YAML/Config
  yaml: { name: 'YAML', commentStyle: '#', docStyle: 'inline comments' },
  yml: { name: 'YAML', commentStyle: '#', docStyle: 'inline comments' },
  
  // Default
  default: { name: 'Unknown', commentStyle: '//', docStyle: 'standard comments' },
};

function getLanguageConfig(filename: string): { name: string; commentStyle: string; docStyle: string } {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return LANGUAGE_CONFIG[ext] || LANGUAGE_CONFIG.default;
}

export interface CommentGenerationInput {
  filename: string;
  content: string;
  repoName: string;
  owner: string;
}

export async function generateCodeComments(input: CommentGenerationInput): Promise<string> {
  const { filename, content, repoName, owner } = input;
  const langConfig = getLanguageConfig(filename);

  const prompt = `You are an expert code documentation specialist. Your task is to add comprehensive documentation comments to the following ${langConfig.name} code file.

**File:** ${filename}
**Repository:** ${owner}/${repoName}
**Documentation Style:** ${langConfig.docStyle}

## Instructions:

1. **Add documentation comments to ALL:**
   - Functions/methods (parameters, return values, exceptions, examples where helpful)
   - Classes/structs/interfaces (purpose, usage)
   - Important constants and variables
   - Complex logic blocks
   - Module/file-level documentation at the top

2. **Documentation Style Requirements (${langConfig.docStyle}):**
   - Use the native documentation format for ${langConfig.name}
   - Be concise but thorough
   - Include type information where not obvious
   - Add @param, @returns, @throws (or equivalent) tags where appropriate
   - Include brief usage examples for complex functions

3. **Spacing and Formatting:**
   - Add a blank line between each documented declaration (variable, function, class, etc.)
   - Ensure each doc comment + its declaration is visually separated from the next
   - Group related declarations together but still separate with blank lines
   - This improves readability and makes the code easier to scan

4. **Preserve:**
   - All existing code logic exactly as-is
   - Existing comments (but improve them if they're inadequate)
   - Original indentation style

5. **Output:**
   - Return ONLY the complete file with added documentation
   - No explanations, no markdown code blocks, just the raw documented code
   - The output should be directly copy-pasteable into the file

---

**Original Code:**

${content}

---

**Documented Code:**`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    messages: [{ role: 'user', content: prompt }],
  });

  const responseContent = response.content[0];
  if (responseContent.type === 'text') {
    // Clean up any accidental markdown code blocks
    let result = responseContent.text;
    
    // Remove markdown code fences if present
    if (result.startsWith('```')) {
      const lines = result.split('\n');
      lines.shift(); // Remove first line (```language)
      if (lines[lines.length - 1] === '```') {
        lines.pop(); // Remove last line (```)
      }
      result = lines.join('\n');
    }
    
    return result;
  }
  
  throw new Error('Unexpected response format');
}

// Parse GitHub file URL to extract owner, repo, branch, and path
export function parseGitHubFileUrl(url: string): {
  owner: string;
  repo: string;
  branch: string;
  path: string;
} | null {
  // Handles URLs like:
  // https://github.com/owner/repo/blob/main/src/file.ts
  // https://github.com/owner/repo/blob/branch-name/path/to/file.ts
  
  const regex = /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/blob\/([^\/]+)\/(.+)$/;
  const match = url.match(regex);
  
  if (!match) {
    return null;
  }
  
  const owner = match[1];
  const repo = match[2];
  const branch = match[3];
  const path = match[4];

  // GitHub owner and repo names: alphanumeric, dashes, underscores, and dots
  const validName = /^[A-Za-z0-9._-]+$/;
  if (!validName.test(owner) || !validName.test(repo)) {
    return null;
  }

  // Branch names in GitHub can include most ASCII except certain characters,
  // but for SSRF safety, we will be conservative. Disallow '/' (shouldn't be present), '..', null, and any dangerous chars.
  if (
    branch.includes('..') ||
    branch.includes('\0') ||
    branch.includes('%00') ||
    branch.startsWith('/') ||
    branch.includes('\\')
  ) {
    return null;
  }

  // Path: no `..`, no leading slash, no nulls, no encoded-`..`
  if (
    path.startsWith('/') ||
    path.includes('..') ||
    path.includes('\0') ||
    /%2e|%2E/.test(path) || // encoded ".", could be used for traversal
    /%2f|%2F/.test(path)    // encoded "/"
  ) {
    return null;
  }
  // Optionally require at least one `/` (subdir/file), your call:
  // if (!path.includes('/')) return null;

  return {
    owner,
    repo,
    branch,
    path,
  };
}

// Fetch file content from GitHub
export async function fetchGitHubFileContent(
  owner: string,
  repo: string,
  path: string,
  branch: string
): Promise<string> {
  const token = process.env.GITHUB_TOKEN;
  
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3.raw',
    'User-Agent': 'SourceDocs',
  };
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
  
  const response = await fetch(url, { headers });
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('File not found');
    }
    throw new Error(`GitHub API error: ${response.status}`);
  }
  
  return response.text();
}
