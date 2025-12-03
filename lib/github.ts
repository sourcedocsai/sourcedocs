const GITHUB_API = 'https://api.github.com';

export interface RepoFile {
  path: string;
  content: string;
}

export interface RepoData {
  name: string;
  description: string | null;
  language: string | null;
  files: RepoFile[];
  tree: string[];
}

export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
}

async function fetchFile(owner: string, repo: string, path: string): Promise<string | null> {
  try {
    const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`, {
      headers: { 'Accept': 'application/vnd.github.v3.raw' },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function fetchTree(owner: string, repo: string): Promise<string[]> {
  try {
    const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.tree
      ?.filter((item: any) => item.type === 'blob')
      ?.map((item: any) => item.path)
      ?.slice(0, 100) || [];
  } catch {
    return [];
  }
}

export async function fetchRepoData(owner: string, repo: string): Promise<RepoData> {
  // Fetch repo metadata
  const metaRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`);
  const meta = metaRes.ok ? await metaRes.json() : {};

  // Fetch file tree
  const tree = await fetchTree(owner, repo);

  // Key files to fetch for context
  const keyFiles = [
    'package.json',
    'pyproject.toml',
    'Cargo.toml',
    'go.mod',
    'requirements.txt',
    'README.md',
    'src/index.ts',
    'src/main.ts',
    'src/index.js',
    'src/main.py',
    'main.go',
    'lib/index.ts',
    'app/page.tsx',
  ];

  const files: RepoFile[] = [];
  
  for (const path of keyFiles) {
    if (tree.includes(path)) {
      const content = await fetchFile(owner, repo, path);
      if (content) {
        // Limit file size to avoid token explosion
        files.push({ path, content: content.slice(0, 3000) });
      }
    }
    if (files.length >= 5) break; // Cap at 5 files
  }

  return {
    name: meta.name || repo,
    description: meta.description || null,
    language: meta.language || null,
    files,
    tree: tree.slice(0, 50), // First 50 files for structure overview
  };
}
