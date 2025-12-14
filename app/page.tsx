'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { track } from '@vercel/analytics';
import mermaid from 'mermaid';
import { SurveyModal } from '@/components/survey-modal';

/**
 * Document types supported by SourceDocs
 * Each type has its own endpoint, output key, and UI configuration
 */
type DocType = 'readme' | 'changelog' | 'contributing' | 'license' | 'codeofconduct' | 'comments' | 'classdiagram';

/**
 * Configuration for each document type
 * Controls the API endpoint, response parsing, and UI display
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
  classdiagram: {
    endpoint: '/api/class-diagram',
    label: 'CLASS DIAGRAM',
    key: 'diagram',
    placeholder: 'https://github.com/owner/repo',
    description: 'Generate a Mermaid class diagram showing classes, interfaces, and relationships',
  },
};

/**
 * Parse a GitHub repository URL to extract owner and repo name
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
 * Parse a GitHub file URL to extract the file path and branch
 * Used for code comments which target specific files
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
 * Success banner shown when a PR is created successfully
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
 * Error banner shown when PR creation fails
 */
function PrErrorBanner({ message }: { message: string }) {
  return (
    <div className="px-4 py-3 border-b border-zinc-800 bg-red-900/20">
      <span className="text-red-400 text-sm">{message}</span>
    </div>
  );
}

/**
 * Metadata banner for class diagrams showing analysis results
 */
function DiagramMetaBanner({ classes, relationships, language }: { classes: number; relationships: number; language: string | null }) {
  return (
    <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-800/50">
      <div className="flex items-center gap-4 text-xs text-zinc-400">
        <span>{classes} classes</span>
        <span>{relationships} relationships</span>
        {language && <span>Primary: {language}</span>}
      </div>
    </div>
  );
}

/**
 * Main content component containing the SourceDocs UI
 */
function HomeContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const upgraded = searchParams.get('upgraded');
  const canceled = searchParams.get('canceled');

  // Form and output state
  const [url, setUrl] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [docType, setDocType] = useState<DocType>('readme');
  
  // User state
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveyCompleted, setSurveyCompleted] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // File info for code comments
  const [fileInfo, setFileInfo] = useState<{ name: string; path: string } | null>(null);
  
  // Diagram metadata for class diagrams
  const [diagramMeta, setDiagramMeta] = useState<{ classes: number; relationships: number; language: string | null } | null>(null);
  
  // PR creation state
  const [prLoading, setPrLoading] = useState(false);
  const [prResult, setPrResult] = useState<{ url: string; number: number; file: string } | null>(null);
  const [prError, setPrError] = useState('');
  
  // Mermaid rendering ref
  const diagramRef = useRef<HTMLDivElement>(null);

  // Initialize Mermaid with dark theme
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      themeVariables: {
        primaryColor: '#3b82f6',
        primaryTextColor: '#e4e4e7',
        primaryBorderColor: '#60a5fa',
        lineColor: '#71717a',
        secondaryColor: '#27272a',
        tertiaryColor: '#18181b',
        background: '#18181b',
        mainBkg: '#27272a',
        secondBkg: '#3f3f46',
        border1: '#52525b',
        border2: '#71717a',
        classText: '#e4e4e7',
      },
      flowchart: {
        htmlLabels: true,
        curve: 'basis',
      },
    });
  }, []);

  // Render Mermaid diagram when output changes
  useEffect(() => {
    if (docType === 'classdiagram' && output && diagramRef.current) {
      // Clear previous content
      diagramRef.current.innerHTML = '';
      
      // Generate unique ID for this render
      const diagramId = 'class-diagram-' + Date.now();
      
      mermaid.render(diagramId, output)
        .then(({ svg }) => {
          if (diagramRef.current) {
            diagramRef.current.innerHTML = svg;
            // Make SVG responsive
            const svgElement = diagramRef.current.querySelector('svg');
            if (svgElement) {
              svgElement.style.maxWidth = '100%';
              svgElement.style.height = 'auto';
            }
          }
        })
        .catch(err => {
          console.error('Mermaid rendering error:', err);
          if (diagramRef.current) {
            // Show raw code if rendering fails
            diagramRef.current.innerHTML = '<pre class="text-sm text-red-400 p-4">Diagram rendering failed. Raw Mermaid code:\n\n' + output + '</pre>';
          }
        });
    }
  }, [output, docType]);

  // Fetch user status on session change
  useEffect(() => {
    if (session) {
      fetchUserStatus();
    }
  }, [session, upgraded]);

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
   * Handle document generation
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
    setDiagramMeta(null);
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

      // Extract content based on document type
      const content = data[config.key] || data.content || data.documentedCode || data.diagram;
      setOutput(content);

      // Update usage display
      if (data.usage !== undefined && data.limit !== undefined) {
        setUsage({ used: data.usage, limit: data.limit });
      }

      // Store file info for code comments
      if (docType === 'comments' && data.filename) {
        setFileInfo({ name: data.filename, path: data.path });
      }

      // Store diagram metadata for class diagrams
      if (docType === 'classdiagram') {
        setDiagramMeta({
          classes: data.classes || 0,
          relationships: data.relationships || 0,
          language: data.language || null,
        });
      }

      // Track the generation event
      track('generate', { docType });

      // Show survey for free users after generation
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
   * Copy output to clipboard
   * For class diagrams, wraps in markdown code fence
   */
  const handleCopy = async () => {
    let content = output;
    
    // Wrap class diagrams in markdown code fence for easy pasting
    if (docType === 'classdiagram') {
      content = '```mermaid\n' + output + '\n```';
    }
    
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /**
   * Download output as a file
   */
  const handleDownload = () => {
    let filename: string;
    let content: string;
    
    if (docType === 'classdiagram') {
      filename = 'CLASS_DIAGRAM.md';
      content = '# Class Diagram\n\nThis diagram shows the class structure and relationships in the codebase.\n\n```mermaid\n' + output + '\n```\n\n---\n\n*Generated by [SourceDocs.ai](https://www.sourcedocs.ai)*\n';
    } else if (docType === 'comments' && fileInfo) {
      filename = fileInfo.name;
      content = output;
    } else {
      filename = docConfig[docType].label.replace(/ /g, '_') + '.md';
      content = output;
    }

    const blob = new Blob([content], { type: 'text/plain' });
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
   * Create a Pull Request with the generated content
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

      // For code comments, include the file path and branch from the URL
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

  const handleSurveyComplete = () => {
    setSurveyCompleted(true);
    setShowSurvey(false);
  };

  /**
   * Reset state when switching document types
   */
  const handleDocTypeChange = (type: DocType) => {
    setDocType(type);
    setUrl('');
    setOutput('');
    setError('');
    setFileInfo(null);
    setDiagramMeta(null);
    setPrResult(null);
    setPrError('');
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
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

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h2 className="text-4xl font-bold mb-4">Documentation in seconds, not hours</h2>
        <p className="text-zinc-400 text-lg mb-10">Paste a GitHub URL. Get professional docs. That is it.</p>

        {/* Document Type Selector */}
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

        {/* URL Input */}
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

        {/* Error Display */}
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

      {/* Output Section */}
      {output && (
        <section className="max-w-4xl mx-auto px-6 pb-16">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            {/* Output Header with Actions */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <span className="text-sm text-zinc-400">{fileInfo ? (fileInfo.name + ' (' + fileInfo.path + ')') : docConfig[docType].label}</span>
              <div className="flex gap-2">
                <button onClick={handleCopy} className="px-3 py-1 text-sm bg-zinc-800 hover:bg-zinc-700 rounded transition-colors">{copied ? 'Copied!' : 'Copy'}</button>
                <button onClick={handleDownload} className="px-3 py-1 text-sm bg-zinc-800 hover:bg-zinc-700 rounded transition-colors">Download</button>
                <button onClick={handleCreatePR} disabled={prLoading} className="px-3 py-1 text-sm bg-green-600 hover:bg-green-500 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{prLoading ? 'Creating...' : 'Create PR'}</button>
              </div>
            </div>

            {/* Diagram Metadata Banner (for class diagrams) */}
            {docType === 'classdiagram' && diagramMeta && (
              <DiagramMetaBanner 
                classes={diagramMeta.classes} 
                relationships={diagramMeta.relationships} 
                language={diagramMeta.language} 
              />
            )}

            {/* PR Result/Error Banners */}
            {prResult && <PrSuccessBanner prResult={prResult} />}
            {prError && <PrErrorBanner message={prError} />}

            {/* Output Content */}
            <div className="p-6 max-h-[600px] overflow-auto">
              {docType === 'classdiagram' ? (
                <div ref={diagramRef} className="flex justify-center items-center min-h-[300px]" />
              ) : docType === 'comments' ? (
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

      {/* Survey Modal */}
      {showSurvey && <SurveyModal onComplete={handleSurveyComplete} onClose={() => setShowSurvey(false)} />}
    </main>
  );
}

/**
 * Main page component with Suspense boundary
 */
export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center"><p className="text-zinc-400">Loading...</p></div>}>
      <HomeContent />
    </Suspense>
  );
}
