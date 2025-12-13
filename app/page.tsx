/**
 * @fileoverview Main page component for SourceDocs.ai - A tool for generating various types
 * of documentation from GitHub repositories including README files, changelogs, contributing
 * guidelines, and code comments.
 * 
 * @module page
 * @author SourceDocs.ai Team
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { track } from '@vercel/analytics';
import { SurveyModal } from '@/components/survey-modal';

/**
 * Supported documentation types that can be generated
 */
type DocType = 'readme' | 'changelog' | 'contributing' | 'license' | 'codeofconduct' | 'comments';

/**
 * Configuration object defining properties for each documentation type
 * including API endpoints, labels, keys, placeholders, and descriptions
 */
const docConfig: Record<DocType, {
  endpoint: string;
  label: string;
  key: string;
  placeholder: string;
  description: string;
}> = {
  readme: {
    endpoint: '/api/readme',
    label: 'README',
    key: 'readme',
    placeholder: 'https://github.com/owner/repo',
    description: 'Generate a professional README with badges, installation, and usage docs',
  },
  changelog: {
    endpoint: '/api/changelog',
    label: 'CHANGELOG',
    key: 'changelog',
    placeholder: 'https://github.com/owner/repo',
    description: 'Generate a changelog from commits, releases, and tags',
  },
  contributing: {
    endpoint: '/api/contributing',
    label: 'CONTRIBUTING',
    key: 'contributing',
    placeholder: 'https://github.com/owner/repo',
    description: 'Generate contribution guidelines for your project',
  },
  license: {
    endpoint: '/api/license',
    label: 'LICENSE',
    key: 'license',
    placeholder: 'https://github.com/owner/repo',
    description: 'Generate a properly formatted license file',
  },
  codeofconduct: {
    endpoint: '/api/codeofconduct',
    label: 'CODE OF CONDUCT',
    key: 'codeofconduct',
    placeholder: 'https://github.com/owner/repo',
    description: 'Generate community standards and guidelines',
  },
  comments: {
    endpoint: '/api/comments',
    label: 'CODE COMMENTS',
    key: 'documentedCode',
    placeholder: 'https://github.com/owner/repo/blob/main/src/file.ts',
    description: 'Add documentation comments to any source file (JSDoc, docstrings, etc.)',
  },
};

/**
 * Extracts owner and repository name from a GitHub repository URL
 * 
 * @param url - GitHub repository URL
 * @returns Object containing owner and repo name, or null if parsing fails
 * 
 * @example
 * ```typescript
 * const result = parseRepoUrl('https://github.com/microsoft/typescript');
 * // Returns: { owner: 'microsoft', repo: 'typescript' }
 * ```
 */
function parseRepoUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) return null;
  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/, '').split('/')[0],
  };
}

/**
 * Extracts file path and branch information from a GitHub file URL
 * 
 * @param url - GitHub file URL (blob format)
 * @returns Object containing file path and branch, or null if parsing fails
 * 
 * @example
 * ```typescript
 * const result = parseFileUrl('https://github.com/owner/repo/blob/main/src/index.ts');
 * // Returns: { branch: 'main', filePath: 'src/index.ts' }
 * ```
 */
function parseFileUrl(url: string): { filePath: string; branch: string } | null {
  const match = url.match(/github\.com\/[^\/]+\/[^\/]+\/blob\/([^\/]+)\/(.+)$/);
  if (!match) return null;
  return {
    branch: match[1],
    filePath: match[2],
  };
}

/**
 * Banner component displayed when a pull request is successfully created
 * 
 * @param props - Component props
 * @param props.prResult - Pull request information including URL, number, and file
 */
function PrSuccessBanner({ prResult }: { prResult: { url: string; number: number; file: string } }) {
  return (
    <div className="px-4 py-3 border-b border-zinc-800 bg-green-900/20">
      <div className="flex items-center justify-between">
        <span className="text-green-400 text-sm">PR #{prResult.number} created for {prResult.file}</span>
        <a href={prResult.url} target="_blank" rel="noopener noreferrer" className="text-sm text-green-400 hover:text-green-300 underline">View PR</a>
      </div>
    </div>
  );
}

/**
 * Banner component displayed when there's an error creating a pull request
 * 
 * @param props - Component props
 * @param props.message - Error message to display
 */
function PrErrorBanner({ message }: { message: string }) {
  return (
    <div className="px-4 py-3 border-b border-zinc-800 bg-red-900/20">
      <span className="text-red-400 text-sm">{message}</span>
    </div>
  );
}

/**
 * Main content component for the SourceDocs.ai home page
 * Handles documentation generation, user authentication, and pull request creation
 */
function HomeContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const upgraded = searchParams.get('upgraded');
  const canceled = searchParams.get('canceled');

  /** GitHub repository or file URL input by user */
  const [url, setUrl] = useState('');
  
  /** Generated documentation content */
  const [output, setOutput] = useState('');
  
  /** Loading state for documentation generation */
  const [loading, setLoading] = useState(false);
  
  /** Error message from documentation generation */
  const [error, setError] = useState('');
  
  /** Whether the copy button shows "Copied!" feedback */
  const [copied, setCopied] = useState(false);
  
  /** Currently selected documentation type */
  const [docType, setDocType] = useState<DocType>('readme');
  
  /** User's API usage statistics */
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);
  
  /** Whether to show the user survey modal */
  const [showSurvey, setShowSurvey] = useState(false);
  
  /** Whether user has completed the survey */
  const [surveyCompleted, setSurveyCompleted] = useState(false);
  
  /** Whether user has Pro subscription */
  const [isPro, setIsPro] = useState(false);
  
  /** Whether user has admin privileges */
  const [isAdmin, setIsAdmin] = useState(false);
  
  /** File information for code comments documentation type */
  const [fileInfo, setFileInfo] = useState<{ name: string; path: string } | null>(null);
  
  /** Loading state for pull request creation */
  const [prLoading, setPrLoading] = useState(false);
  
  /** Successful pull request creation result */
  const [prResult, setPrResult] = useState<{ url: string; number: number; file: string } | null>(null);
  
  /** Error message from pull request creation */
  const [prError, setPrError] = useState('');

  /**
   * Fetch user status on session change or upgrade completion
   */
  useEffect(() => {
    if (session) {
      fetchUserStatus();
    }
  }, [session, upgraded]);

  /**
   * Fetches current user's status including usage limits, Pro status, and survey completion
   */
  const fetchUserStatus = async () => {
    try {
      const res = await fetch('/api/user/status');
      if (res.ok) {
        const data = await res.json();
        setUsage({ used: data.web?.usage || 0, limit: data.web?.limit || 1 });
        setIsPro(data.isPro);
        setIsAdmin(data.isAdmin);
        setSurveyCompleted(data.surveyCompleted);
      }
    } catch (err) {
      console.error('Failed to fetch user status:', err);
    }
  };

  /**
   * Handles documentation generation by calling the appropriate API endpoint
   * Manages authentication, loading states, error handling, and analytics tracking
   */
  const handleGenerate = async () => {
    if (!url.trim()) return;
    if (!session) {
      signIn('github');
      return;
    }

    setLoading(true);
    setError('');
    setOutput('');
    setFileInfo(null);
    setPrResult(null);
    setPrError('');

    try {
      const config = docConfig[docType];
      const res = await fetch(config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.upgrade) {
          setError('Monthly limit reached (' + data.usage + '/' + data.limit + '). Upgrade for unlimited.');
          if (!surveyCompleted) {
            setShowSurvey(true);
          }
        } else {
          setError(data.error || 'Something went wrong');
        }
        return;
      }

      const content = data[config.key] || data.content || data.documentedCode;
      setOutput(content);

      if (data.usage !== undefined && data.limit !== undefined) {
        setUsage({ used: data.usage, limit: data.limit });
      }

      if (docType === 'comments' && data.filename) {
        setFileInfo({ name: data.filename, path: data.path });
      }

      track('generate', { docType });

      if (!surveyCompleted && !isPro) {
        setShowSurvey(true);
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Copies the generated documentation to clipboard and shows feedback
   */
  const handleCopy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /**
   * Downloads the generated documentation as a file
   * Uses appropriate filename based on documentation type and file info
   */
  const handleDownload = () => {
    const filename = docType === 'comments' && fileInfo
      ? fileInfo.name
      : docConfig[docType].label.replace(/ /g, '_') + '.md';

    const blob = new Blob([output], { type: 'text/plain' });
    const downloadUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(downloadUrl);
  };

  /**
   * Creates a pull request with the generated documentation
   * Handles different request bodies for repository-level docs vs file-level comments
   */
  const handleCreatePR = async () => {
    const parsed = parseRepoUrl(url);
    if (!parsed) {
      setPrError('Could not parse repository URL');
      return;
    }

    setPrLoading(true);
    setPrError('');
    setPrResult(null);

    try {
      const requestBody: {
        owner: string;
        repo: string;
        content: string;
        docType: string;
        filePath?: string;
        baseBranch?: string;
      } = {
        owner: parsed.owner,
        repo: parsed.repo,
        content: output,
        docType,
      };

      if (docType === 'comments') {
        const fileData = parseFileUrl(url);
        if (!fileData) {
          setPrError('Could not parse file path from URL');
          setPrLoading(false);
          return;
        }
        requestBody.filePath = fileData.filePath;
        requestBody.baseBranch = fileData.branch;
      }

      const res = await fetch('/api/pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.requiresReauth) {
          setPrError('Please sign out and sign back in to grant repository access permissions.');
        } else {
          setPrError(data.error || 'Failed to create PR');
        }
        return;
      }

      setPrResult({
        url: data.pr.url,
        number: data.pr.number,
        file: data.pr.file,
      });
      track('create_pr', { docType });
    } catch (err) {
      setPrError('Failed to create pull request');
    } finally {
      setPrLoading(false);
    }
  };

  /**
   * Handles survey completion by updating state
   */
  const handleSurveyComplete = () => {
    setSurveyCompleted(true);
    setShowSurvey(false);
  };

  /**
   * Handles documentation type change and resets relevant state
   * 
   * @param type - The new documentation type to select
   */
  const handleDocTypeChange = (type: DocType) => {
    setDocType(type);
    setUrl('');
    setOutput('');
    setError('');
    setFileInfo(null);
    setPrResult(null);
    setPrError('');
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header with branding, user status, and navigation */}
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold">SourceDocs.ai</h1>
          <div className="flex items-center gap-4">
            {upgraded && <span className="text-green-400 text-sm">Upgraded to Pro!</span>}
            {canceled && <span className="text-zinc-400 text-sm">Payment canceled</span>}
            {session ? (
              <div className="flex items-center gap-3">
                {isAdmin && <a href="/admin" className="text-xs text-red-400 font-medium px-2 py-0.5 bg-red-400/10 rounded hover:bg-red-400/20 transition-colors">Admin</a>}
                <a href="/settings" className={'text-xs font-medium px-2 py-0.5 rounded transition-colors ' + (isPro ? 'text-green-400 bg-green-400/10 hover:bg-green-400/20' : 'text-zinc-400 bg-zinc-800 hover:bg-zinc-700')}>{isPro ? 'Pro' : 'Free'}</a>
                {usage && <span className="text-sm text-zinc-500">{isPro ? 'Unlimited' : (usage.used + '/' + usage.limit)} used</span>}
                <span className="text-sm text-zinc-400">{session.user?.name || (session.user as any)?.username}</span>
                <button onClick={() => signOut()} className="text-sm text-zinc-500 hover:text-zinc-300">Sign out</button>
              </div>
            ) : (
              <button onClick={() => signIn('github')} className="px-4 py-2 bg-white text-zinc-900 text-sm font-medium rounded-lg hover:bg-zinc-200 transition-colors">Sign in with GitHub</button>
            )}
          </div>
        </div>
      </header>

      {/* Hero section with title, description, and documentation generation form */}
      <section className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h2 className="text-4xl font-bold mb-4">Documentation in seconds, not hours</h2>
        <p className="text-zinc-400 text-lg mb-10">Paste a GitHub URL. Get professional docs. That is it.</p>

        {/* Documentation type selector buttons */}
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {(Object.keys(docConfig) as DocType[]).map((type) => (
            <button
              key={type}
              onClick={() => handleDocTypeChange(type)}
              className={'px-4 py-2 rounded-lg font-medium text-sm transition-colors ' + (docType === type ? 'bg-white text-zinc-900' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700')}
            >
              {docConfig[type].label}
            </button>
          ))}
        </div>

        <p className="text-zinc-500 text-sm mb-6">{docConfig[docType].description}</p>

        {/* URL input and generate button */}
        <div className="flex gap-3 max-w-2xl mx-auto">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            placeholder={docConfig[docType].placeholder}
            className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
          />
          <button
            onClick={handleGenerate}
            disabled={loading || !url.trim()}
            className="px-6 py-3 bg-white text-zinc-900 font-medium rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Generating...' : 'Generate'}
          </button>
        </div>

        {/* Error message with upgrade option for usage limits */}
        {error && (
          <div className="mt-4 text-red-400 text-sm">
            {error}
            {error.includes('limit') && !isPro && (
              <button
                onClick={() => {
                  fetch('/api/checkout', { method: 'POST' })
                    .then((res) => res.json())
                    .then((data) => {
                      if (data.url) window.location.href = data.url;
                    });
                }}
                className="ml-2 underline hover:text-red-300"
              >
                Upgrade to Pro
              </button>
            )}
          </div>
        )}
      </section>

      {/* Generated documentation output section */}
      {output && (
        <section className="max-w-4xl mx-auto px-6 pb-16">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            {/* Output header with file info and action buttons */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <span className="text-sm text-zinc-400">{fileInfo ? (fileInfo.name + ' (' + fileInfo.path + ')') : docConfig[docType].label}</span>
              <div className="flex gap-2">
                <button onClick={handleCopy} className="px-3 py-1 text-sm bg-zinc-800 hover:bg-zinc-700 rounded transition-colors">{copied ? 'Copied!' : 'Copy'}</button>
                <button onClick={handleDownload} className="px-3 py-1 text-sm bg-zinc-800 hover:bg-zinc-700 rounded transition-colors">Download</button>
                <button onClick={handleCreatePR} disabled={prLoading} className="px-3 py-1 text-sm bg-green-600 hover:bg-green-500 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{prLoading ? 'Creating...' : 'Create PR'}</button>
              </div>
            </div>

            {/* Pull request status banners */}
            {prResult && <PrSuccessBanner prResult={prResult} />}
            {prError && <PrErrorBanner message={prError} />}

            {/* Documentation content display */}
            <div className="p-6 max-h-[600px] overflow-y-auto">
              {docType === 'comments' ? (
                <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-mono">{output}</pre>
              ) : (
                <div className="readme-preview prose prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{output}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Survey modal for user feedback */}
      {showSurvey && <SurveyModal onComplete={handleSurveyComplete} onClose={() => setShowSurvey(false)} />}
    </main>
  );
}

/**
 * Home page component with Suspense boundary for loading state
 * 
 * @returns JSX element with suspense wrapper around HomeContent
 */
export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center"><p className="text-zinc-400">Loading...</p></div>}>
      <HomeContent />
    </Suspense>
  );
}