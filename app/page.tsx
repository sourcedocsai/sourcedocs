'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { track } from '@vercel/analytics';

type DocType = 'readme' | 'changelog' | 'contributing';

const docConfig = {
  readme: { endpoint: '/api/generate', label: 'README', key: 'readme' },
  changelog: { endpoint: '/api/changelog', label: 'CHANGELOG', key: 'changelog' },
  contributing: { endpoint: '/api/contributing', label: 'CONTRIBUTING', key: 'contributing' },
};

export default function Home() {
  const [url, setUrl] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [docType, setDocType] = useState<DocType>('readme');

  const handleGenerate = async () => {
    if (!url.trim()) return;

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
        setError(data.error || 'Something went wrong');
        return;
      }

      setOutput(data[config.key]);
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

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold">SourceDocs.ai</h1>
          <span className="text-sm text-zinc-500">AI Tech Writer</span>
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
        <div className="flex justify-center gap-2 mb-6">
          {(['readme', 'changelog', 'contributing'] as DocType[]).map((type) => (
            <button
              key={type}
              onClick={() => setDocType(type)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
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
            {loading ? 'Generating...' : 'Generate'}
          </button>
        </div>

        {error && <p className="mt-4 text-red-400 text-sm">{error}</p>}
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
    </main>
  );
}
