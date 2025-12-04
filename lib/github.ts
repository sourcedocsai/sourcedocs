const GITHUB_API = 'https://api.github.com';

export interface RepoFile {
  path: string;
  content: string;
}

export interface RepoData {
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
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

  // Priority files - order matters
  const priorityFiles = [
    // Package/config files (understand dependencies & project type)
    'package.json',
    'pyproject.toml',
    'Cargo.toml',
    'go.mod',
    'composer.json',
    'Gemfile',
    
    // Entry points (understand what it does)
    'src/index.ts',
    'src/index.js',
    'src/main.ts',
    'src/main.py',
    'src/lib.rs',
    'main.go',
    'index.ts',
    'index.js',
    'app/page.tsx',
    'lib/index.ts',
    
    // Examples (understand usage)
    'examples/basic.ts',
    'examples/basic.js',
    'examples/example.py',
    'example.js',
    'example.ts',
    
    // Existing docs (understand intent)
    'README.md',
    'CONTRIBUTING.md',
  ];

  const files: RepoFile[] = [];
  
  for (const path of priorityFiles) {
    if (tree.includes(path)) {
      const content = await fetchFile(owner, repo, path);
      if (content) {
        files.push({ path, content: content.slice(0, 4000) });
      }
    }
    if (files.length >= 6) break;
  }

  // If we didn't find standard files, grab first few code files
  if (files.length < 3) {
    const codeExtensions = ['.ts', '.js', '.py', '.go', '.rs', '.rb'];
    for (const filePath of tree) {
      if (codeExtensions.some(ext => filePath.endsWith(ext)) && !filePath.includes('test')) {
        const content = await fetchFile(owner, repo, filePath);
        if (content) {
          files.push({ path: filePath, content: content.slice(0, 3000) });
        }
        if (files.length >= 6) break;
      }
    }
  }

  return {
    name: meta.name || repo,
    description: meta.description || null,
    language: meta.language || null,
    stars: meta.stargazers_count || 0,
    files,
    tree: tree.slice(0, 50),
  };
}

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

export async function fetchCommits(owner: string, repo: string, limit = 50): Promise<CommitData[]> {
  try {
    const res = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/commits?per_page=${limit}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    
    return data.map((commit: any) => ({
      sha: commit.sha.slice(0, 7),
      message: commit.commit.message.split('\n')[0], // First line only
      date: commit.commit.author.date,
      author: commit.commit.author.name,
    }));
  } catch {
    return [];
  }
}

export async function fetchReleases(owner: string, repo: string): Promise<ReleaseData[]> {
  try {
    const res = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/releases?per_page=20`
    );
    if (!res.ok) return [];
    const data = await res.json();
    
    return data.map((release: any) => ({
      tag: release.tag_name,
      name: release.name || release.tag_name,
      body: release.body || '',
      date: release.published_at,
    }));
  } catch {
    return [];
  }
}

export async function fetchTags(owner: string, repo: string): Promise<string[]> {
  try {
    const res = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/tags?per_page=20`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((tag: any) => tag.name);
  } catch {
    return [];
  }
}
B
B
B
B
B

