/**
 * GitHub API utilities for SourceDocs
 * 
 * This module handles all interactions with the GitHub API, including
 * fetching repository metadata, file contents, commits, releases, and tags.
 * It supports both basic fetching for README generation and expanded
 * fetching for class diagram analysis.
 */

const GITHUB_API_BASE = 'https://api.github.com';

/**
 * Get headers for GitHub API requests
 * Includes authentication token if available
 */
function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'SourceDocs',
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  return headers;
}

/**
 * Parse a GitHub repository URL to extract owner and repo name
 * Supports various URL formats including .git suffix
 */
/**
 * Strict validation for GitHub owner/repo names:
 * - Alphanumeric, '-', '_', and '.' only
 * - No slashes, path traversal, spaces, or control characters
 */
function isValidGitHubOwnerRepo(str: string): boolean {
  // 1-100 chars, only GitHub-legal characters
  return /^[A-Za-z0-9\-_.]{1,100}$/.test(str);
}

export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  // Handle various GitHub URL formats
  const patterns = [
    /github\.com\/([^\/]+)\/([^\/]+?)(\.git)?$/,
    /github\.com\/([^\/]+)\/([^\/]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      const owner = match[1];
      const repo = match[2].replace(/\.git$/, '');
      if (!isValidGitHubOwnerRepo(owner) || !isValidGitHubOwnerRepo(repo)) {
        return null;
      }
      return {
        owner,
        repo,
      };
    }
  }

  return null;
}

/**
 * Repository data structure returned by fetch functions
 */
export interface RepoData {
  name: string;
  description: string | null;
  language: string | null;
  files: { path: string; content: string }[];
  tree: string[];
  defaultBranch: string;
  stars: number;
  topics: string[];
}

/**
 * Options for fetching repository data
 */
export interface FetchRepoOptions {
  focusDirectory?: string;
  excludePatterns?: string[];
  maxFiles?: number;
  includeAllSourceFiles?: boolean;
}

/**
 * Source file extensions organized by language family
 */
const SOURCE_EXTENSIONS: Record<string, string[]> = {
  javascript: ['.js', '.jsx', '.mjs', '.cjs'],
  typescript: ['.ts', '.tsx', '.mts', '.cts'],
  python: ['.py', '.pyi'],
  java: ['.java'],
  csharp: ['.cs'],
  go: ['.go'],
  rust: ['.rs'],
  kotlin: ['.kt', '.kts'],
  ruby: ['.rb'],
  php: ['.php'],
  swift: ['.swift'],
  scala: ['.scala'],
  cpp: ['.cpp', '.cc', '.cxx', '.hpp', '.h', '.c'],
};

/**
 * Get all source file extensions as a flat array
 */
function getAllSourceExtensions(): string[] {
  return Object.values(SOURCE_EXTENSIONS).flat();
}

/**
 * Fetch basic repository data suitable for README generation
 * This fetches key files like package.json, README, etc.
 */
export async function fetchRepoData(owner: string, repo: string): Promise<RepoData> {
  const headers = getHeaders();

  // Fetch repository metadata
  const repoRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, { headers });
  
  if (!repoRes.ok) {
    if (repoRes.status === 404) {
      throw new Error(`Repository not found: ${owner}/${repo}`);
    }
    throw new Error(`GitHub API error: ${repoRes.status}`);
  }
  
  const repoMeta = await repoRes.json();

  // Fetch repository tree
  const treeRes = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${repoMeta.default_branch}?recursive=1`,
    { headers }
  );
  
  if (!treeRes.ok) {
    throw new Error('Failed to fetch repository tree');
  }
  
  const treeData = await treeRes.json();
  const allFiles: string[] = treeData.tree
    .filter((item: any) => item.type === 'blob')
    .map((item: any) => item.path);

  // Key files to fetch for README generation
  const keyFiles = [
    'package.json',
    'pyproject.toml',
    'setup.py',
    'Cargo.toml',
    'go.mod',
    'pom.xml',
    'build.gradle',
    'Gemfile',
    'composer.json',
    'README.md',
    'readme.md',
    'LICENSE',
    'license',
    '.github/workflows/ci.yml',
    '.github/workflows/main.yml',
  ];

  // Fetch contents of key files
  const files: { path: string; content: string }[] = [];
  
  for (const filePath of keyFiles) {
    if (allFiles.includes(filePath)) {
      try {
        const content = await fetchFileContent(owner, repo, filePath);
        files.push({ path: filePath, content });
      } catch {
        // Skip files that can't be fetched
      }
    }
  }

  return {
    name: repoMeta.name,
    description: repoMeta.description,
    language: repoMeta.language,
    files,
    tree: allFiles,
    defaultBranch: repoMeta.default_branch,
    stars: repoMeta.stargazers_count,
    topics: repoMeta.topics || [],
  };
}

/**
 * Fetch expanded repository data suitable for class diagram analysis
 * This fetches more source files and applies intelligent filtering
 */
export async function fetchRepoDataForAnalysis(
  owner: string,
  repo: string,
  options: FetchRepoOptions = {}
): Promise<RepoData> {
  const {
    focusDirectory,
    excludePatterns = ['test', 'spec', '__tests__', 'node_modules', 'dist', 'build'],
    maxFiles = 50,
  } = options;

  const headers = getHeaders();

  // Fetch repository metadata
  const repoRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, { headers });
  
  if (!repoRes.ok) {
    if (repoRes.status === 404) {
      throw new Error(`Repository not found: ${owner}/${repo}`);
    }
    throw new Error(`GitHub API error: ${repoRes.status}`);
  }
  
  const repoMeta = await repoRes.json();

  // Fetch repository tree
  const treeRes = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${repoMeta.default_branch}?recursive=1`,
    { headers }
  );
  
  if (!treeRes.ok) {
    throw new Error('Failed to fetch repository tree');
  }
  
  const treeData = await treeRes.json();
  const allFiles: string[] = treeData.tree
    .filter((item: any) => item.type === 'blob')
    .map((item: any) => item.path);

  // Get source file extensions
  const sourceExtensions = getAllSourceExtensions();

  // Filter to source files only
  let filesToFetch = allFiles.filter(f => 
    sourceExtensions.some(ext => f.toLowerCase().endsWith(ext))
  );

  // Apply focus directory filter
  if (focusDirectory) {
    filesToFetch = filesToFetch.filter(f => f.startsWith(focusDirectory));
  }

  // Exclude patterns (test files, build artifacts, etc.)
  filesToFetch = filesToFetch.filter(f => {
    const lowerPath = f.toLowerCase();
    return !excludePatterns.some(pattern => lowerPath.includes(pattern.toLowerCase()));
  });

  // Prioritize files based on likely importance
  filesToFetch = prioritizeSourceFiles(filesToFetch, repoMeta.language);

  // Limit to maxFiles
  filesToFetch = filesToFetch.slice(0, maxFiles);

  // Fetch file contents in parallel with error handling
  const filePromises = filesToFetch.map(async (path): Promise<{ path: string; content: string } | null> => {
    try {
      const content = await fetchFileContent(owner, repo, path);
      return { path, content };
    } catch (error) {
      console.warn(`Failed to fetch ${path}:`, error);
      return null;
    }
  });

  const fileResults = await Promise.all(filePromises);
  const files = fileResults.filter((f): f is { path: string; content: string } => f !== null);

  return {
    name: repoMeta.name,
    description: repoMeta.description,
    language: repoMeta.language,
    files,
    tree: allFiles,
    defaultBranch: repoMeta.default_branch,
    stars: repoMeta.stargazers_count,
    topics: repoMeta.topics || [],
  };
}

/**
 * Prioritize source files based on directory structure and naming
 * Files in model/service/controller directories are ranked higher
 */
function prioritizeSourceFiles(files: string[], language: string | null): string[] {
  // Patterns that indicate high-priority files (domain models, services, etc.)
  const highPriorityPatterns = [
    /models?\//i,
    /entities?\//i,
    /domain\//i,
    /schemas?\//i,
    /services?\//i,
    /usecases?\//i,
    /controllers?\//i,
    /handlers?\//i,
    /repositories?\//i,
    /core\//i,
  ];

  // Patterns that indicate medium-priority files
  const mediumPriorityPatterns = [
    /src\//i,
    /lib\//i,
    /app\//i,
    /pkg\//i,
    /internal\//i,
  ];

  // Patterns that indicate lower priority
  const lowPriorityPatterns = [
    /utils?\//i,
    /helpers?\//i,
    /common\//i,
    /shared\//i,
    /config\//i,
    /constants?\//i,
    /types?\//i,
  ];

  // Score each file
  const scored = files.map(file => {
    let score = 0;
    
    // High priority patterns
    for (const pattern of highPriorityPatterns) {
      if (pattern.test(file)) {
        score += 30;
        break;
      }
    }
    
    // Medium priority patterns
    for (const pattern of mediumPriorityPatterns) {
      if (pattern.test(file)) {
        score += 15;
        break;
      }
    }
    
    // Low priority patterns (negative score)
    for (const pattern of lowPriorityPatterns) {
      if (pattern.test(file)) {
        score -= 10;
        break;
      }
    }
    
    // Penalize deeply nested files
    const depth = file.split('/').length;
    score -= depth * 2;
    
    // Boost index/main files
    const filename = file.split('/').pop() || '';
    if (/^(index|main|app)\.[jt]sx?$/.test(filename)) {
      score += 10;
    }
    
    // Boost files matching the primary language
    if (language) {
      const langExtensions = SOURCE_EXTENSIONS[language.toLowerCase()];
      if (langExtensions && langExtensions.some(ext => file.endsWith(ext))) {
        score += 5;
      }
    }
    
    return { file, score };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  
  return scored.map(s => s.file);
}

/**
 * Fetch the raw content of a single file from GitHub
 */
export async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  branch?: string
): Promise<string> {
  const headers = {
    ...getHeaders(),
    Accept: 'application/vnd.github.v3.raw',
  };

  const url = branch
    ? `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`
    : `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`;

  const response = await fetch(url, { headers });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`File not found: ${path}`);
    }
    throw new Error(`GitHub API error: ${response.status}`);
  }

  return response.text();
}

/**
 * Fetch recent commits for changelog generation
 */
export async function fetchCommits(
  owner: string,
  repo: string,
  count: number = 100
): Promise<any[]> {
  const headers = getHeaders();
  
  const response = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/commits?per_page=${count}`,
    { headers }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch commits: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch releases for changelog generation
 */
export async function fetchReleases(
  owner: string,
  repo: string,
  count: number = 50
): Promise<any[]> {
  const headers = getHeaders();
  
  const response = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/releases?per_page=${count}`,
    { headers }
  );

  if (!response.ok) {
    // Releases might not exist, return empty array
    if (response.status === 404) {
      return [];
    }
    throw new Error(`Failed to fetch releases: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch tags for changelog generation
 */
export async function fetchTags(
  owner: string,
  repo: string,
  count: number = 50
): Promise<any[]> {
  const headers = getHeaders();
  
  const response = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/tags?per_page=${count}`,
    { headers }
  );

  if (!response.ok) {
    if (response.status === 404) {
      return [];
    }
    throw new Error(`Failed to fetch tags: ${response.status}`);
  }

  return response.json();
}
