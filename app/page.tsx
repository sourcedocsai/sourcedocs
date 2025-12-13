'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { track } from '@vercel/analytics';
import { SurveyModal } from '@/components/survey-modal';

type DocType = 'readme' | 'changelog' | 'contributing' | 'license' | 'codeofconduct' | 'comments';

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

function HomeContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const upgraded = searchParams.get('upgraded');
  const canceled = searchParams.get('canceled');

  const [url, setUrl] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [docType, setDocType] = useState<DocType>('readme');
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveyCompleted, setSurveyCompleted] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [fileInfo, setFileInfo] = useState<{ name: string; path: string } | null>(null);

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
          setError(`Monthly limit reached (${data.usage}/${data.limit}). Upgrade for unlimited.`);
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

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const filename = docType === 'comments' && fileInfo 
      ? fileInfo.name 
      : `${docConfig[docType].label.replace(/ /g, '_')}.md`;
    
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

  const handleSurveyComplete = () => {
    setSurveyCompleted(true);
    setShowSurvey(false);
  };

  const isFileType = docType === 'comments';

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold">SourceDocs.ai</h1>
          <div className="flex items-center gap-4">
            {upgraded && (
              <span className="text-green-400 text-sm">✓ Upgraded to Pro!</span>
            )}
            {canceled && (
              <span className="text-zinc-400 text-sm">Payment canceled</span>
            )}
            {session ? (
              <div className="flex items-center gap-3">
                {isAdmin && (
                  <a href="/admin" className="text-xs text-red-400 font-medium px-2 py-0.5 bg-red-400/10 rounded hover:bg-red-400/20 transition-colors">
                    Admin
                  </a>
                )}
                <a href="/settings" className={`text-xs font-medium px-2 py-0.5 rounded transition-colors ${isPro ? 'text-green-400 bg-green-400/10 hover:bg-green-400/20' : 'text-zinc-400 bg-zinc-800 hover:bg-zinc-700'}`}>
                  {isPro ? 'Pro' : 'Free'}
                </a>
                {usage && (
                  <span className="text-sm text-zinc-500">
                    {isPro ? '∞' : `${usage.used}/${usage.limit}`} used
                  </span>
                )}
                <span className="text-sm text-zinc-400">
                  {session.user?.name || (session.user as any)?.username}
                </span>
                <button onClick={() => signOut()} className="text-sm text-zinc-500 hover:text-zinc-300">
                  Sign out
                </button>
              </div>
            ) : (
              <button onClick={() => signIn('github')} className="px-4 py-2 bg-white text-zinc-900 text-sm font-medium rounded-lg hover:bg-zinc-200 transition-colors">
                Sign in with GitHub
              </button>
            )}
          </div>
        </div>
      </header>

      <section className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h2 className="text-4xl font-bold mb-4">
          Documentation in seconds, not hours
        </h2>
        <p className="text-zinc-400 text-lg mb-10">
          Paste a GitHub URL. Get professional docs. That's it.
        </p>

        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {(Object.keys(docConfig) as DocType[]).map((type) => (
            <button
              key={type}
              onClick={() => {
                setDocType(type);
                setUrl('');
                setOutput('');
                setError('');
                setFileInfo(null);
              }}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                docType === type
                  ? 'bg-white text-zinc-900'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {docConfig[type].label}
            </button>
          ))}
        </div>

        <p className="text-zinc-500 text-sm mb-6">
          {docConfig[docType].description}
        </p>

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

      {output && (
        <section className="max-w-4xl mx-auto px-6 pb-16">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <span className="text-sm text-zinc-400">
                {fileInfo ? `${fileInfo.name} (${fileInfo.path})` : docConfig[docType].label}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="px-3 py-1 text-sm bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={handleDownload}
                  className="px-3 py-1 text-sm bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
                >
                  Download
                </button>
              </div>
            </div>

            <div className="p-6 max-h-[600px] overflow-y-auto">
              {docType === 'comments' ? (
                <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-mono">
                  {output}
                </pre>
              ) : (
                <div className="readme-preview prose prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                    {output}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {showSurvey && (
        <SurveyModal
          onComplete={handleSurveyComplete}
          onClose={() => setShowSurvey(false)}
        />
      )}
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <p className="text-zinc-400">Loading...</p>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
