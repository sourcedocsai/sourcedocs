'use client';

import { PricingModal } from '@/components/pricing-modal';
import { useState, useEffect, Suspense } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { track } from '@vercel/analytics';
import { SurveyModal } from '@/components/survey-modal';

type DocType = 'readme' | 'changelog' | 'contributing' | 'license' | 'codeofconduct';

const docConfig = {
  readme: { endpoint: '/api/readme', label: 'README', key: 'readme' },
  changelog: { endpoint: '/api/changelog', label: 'CHANGELOG', key: 'changelog' },
  contributing: { endpoint: '/api/contributing', label: 'CONTRIBUTING', key: 'contributing' },
  license: { endpoint: '/api/license', label: 'LICENSE', key: 'license' },
  codeofconduct: { endpoint: '/api/codeofconduct', label: 'CODE OF CONDUCT', key: 'codeofconduct' },
};

function HomeContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const checkoutReturn = searchParams.get('checkout');

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
  const [justUpgraded, setJustUpgraded] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [plan, setPlan] = useState<string>('free');

  // Fetch user status on load
  useEffect(() => {
    if (session) {
      fetchUserStatus();
    }
  }, [session]);

  // Handle checkout return - verify with database, not URL param
  useEffect(() => {
    if (checkoutReturn && session) {
      // Clean up URL
      router.replace('/', { scroll: false });
      
      // Re-fetch status to verify upgrade
      fetchUserStatus().then((data) => {
        if (data?.isPro) {
          setJustUpgraded(true);
          // Auto-hide after 5 seconds
          setTimeout(() => setJustUpgraded(false), 5000);
        }
      });
    }
  }, [checkoutReturn, session]);

  const fetchUserStatus = async () => {
    try {
      const res = await fetch('/api/user/status');
      if (res.ok) {
        const data = await res.json();
        setIsPro(data.isPro);
        setIsAdmin(data.isAdmin || false);
	setPlan(data.plan || 'free');
        setUsage({ used: data.usage, limit: data.limit });
        setSurveyCompleted(data.surveyCompleted || false);
      
        if (data.isPro) {
          setError('');
        }
        return data;
      }
    } catch (err) {
      console.error('Failed to fetch user status:', err);
    }
    return null;
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
          setError(`Monthly limit reached (${data.usage}/${data.limit}). Upgrade to Pro for unlimited.`);
          setUsage({ used: data.usage, limit: data.limit });

          if (!surveyCompleted) {
            setShowSurvey(true);
          }
        } else {
          setError(data.error || 'Something went wrong');
        }
        return;
      }

      setOutput(data[config.key]);
      setUsage({ used: data.usage, limit: data.limit });
      track(`${docType}_generated`, { repo: url });
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

  const handleUpgrade = () => {
    setShowPricing(true);
  };

  const handleSelectPlan = async (selectedPlan: string) => {
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan }),
      });
      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold">SourceDocs.ai</h1>

          {status === 'loading' ? (
            <span className="text-sm text-zinc-500">Loading...</span>
          ) : session ? (
            <div className="flex items-center gap-4">
	      {isAdmin && (
		 <a href="/admin" className="text-sm text-red-400 font-medium px-2 py-1 bg-red-400/10 rounded hover:bg-red-400/20 transition-colors">
		   Admin
		 </a>
	      )}
              {plan !== 'free' && (
                 <span className="text-sm text-green-500 font-medium capitalize">
                    {plan.replace('_', ' ')}
                 </span>
              )}
              {plan === 'free' && usage && (
                 <span className="text-sm text-zinc-500">
                    {usage.used}/{usage.limit} used
                 </span>
              )}
              <img
                src={session.user?.image || ''}
                alt={session.user?.name || 'User'}
                className="w-8 h-8 rounded-full"
              />
              <span className="text-sm text-zinc-400">{session.user?.name}</span>
              <button
                onClick={() => signOut()}
                className="text-sm text-zinc-500 hover:text-zinc-300"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={() => signIn('github')}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              Sign in with GitHub
            </button>
          )}
        </div>
      </header>

      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 className="text-4xl font-bold mb-4">
          Documentation in seconds, not hours
        </h2>
        <p className="text-zinc-400 text-lg mb-10">
          Paste a GitHub repo. Get professional docs. That is it.
        </p>

        {/* Document Type Selector */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {(['readme', 'changelog', 'contributing', 'license', 'codeofconduct'] as DocType[]).map((type) => (
            <button
              key={type}
              onClick={() => setDocType(type)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                docType === type
                  ? 'bg-white text-zinc-900'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {docConfig[type].label}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="flex gap-3 max-w-xl mx-auto">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            placeholder="https://github.com/owner/repo"
            className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg focus:outline-none focus:border-zinc-500 placeholder-zinc-600"
          />
          <button
            onClick={handleGenerate}
            disabled={loading || !url.trim()}
            className="px-6 py-3 bg-white text-zinc-900 font-medium rounded-lg hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Generating...' : session ? 'Generate' : 'Sign in to Generate'}
          </button>
        </div>

        {/* Error with upgrade prompt - only show if NOT pro */}
        {error && !isPro && (
          <div className="mt-4">
            <p className="text-red-400 text-sm">{error}</p>
            {error.includes('limit') && (
              <div className="flex flex-col items-center gap-2 mt-2">
                <button
                  onClick={handleUpgrade}
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium transition-colors"
                >
                  Upgrade Your Plan
                </button>
                {!surveyCompleted && (
                  <button
                    onClick={() => setShowSurvey(true)}
                    className="text-sm text-zinc-400 hover:text-white underline transition-colors"
                  >
                    Help us improve → Take 30 second survey
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Error for non-limit errors when Pro */}
        {error && isPro && !error.includes('limit') && (
          <p className="mt-4 text-red-400 text-sm">{error}</p>
        )}

        {/* Just upgraded message - only shows if DB confirms Pro status */}
        {justUpgraded && isPro && (
          <p className="mt-4 text-green-400 text-sm">
            🎉 Welcome to Pro! You now have unlimited generations.
          </p>
        )}

        {!session && status !== 'loading' && (
          <p className="mt-4 text-zinc-500 text-sm">
            Sign in with GitHub to generate documentation
          </p>
        )}
      </section>

      {/* Output */}
      {output && (
        <section className="max-w-4xl mx-auto px-6 pb-20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">
              Generated {docConfig[docType].label}
            </h3>
            <button
              onClick={handleCopy}
              className="px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
            >
              {copied ? 'Copied!' : 'Copy to clipboard'}
            </button>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 shadow-xl">
            <div className="readme-preview">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                {output}
              </ReactMarkdown>
            </div>
          </div>
        </section>
      )}

      <footer className="border-t border-zinc-800 px-6 py-6 text-center text-sm text-zinc-500">
        Built by <a href="https://x.com/sourcedocsai" className="text-zinc-400 hover:text-white">@sourcedocsai</a>
      </footer>

      {/* Survey Modal */}
      {showSurvey && (
        <SurveyModal
          onClose={() => setShowSurvey(false)}
          onComplete={() => {
            setShowSurvey(false);
            setSurveyCompleted(true);
          }}
        />
      )}
      {/* Pricing Modal */}
      {showPricing && (
         <PricingModal 
            currentPlan={plan}
            onClose={() => setShowPricing(false)}
            onSelectPlan={handleSelectPlan} 
         />
      )}
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <HomeContent />
    </Suspense>
  );
}
