'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

export default function Home() {
  const [url, setUrl] = useState('');
  const [readme, setReadme] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!url.trim()) return;
    
    setLoading(true);
    setError('');
    setReadme('');

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        return;
      }

      setReadme(data.readme);
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(readme);
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
          README in seconds, not hours
        </h2>
        <p className="text-zinc-400 text-lg mb-10">
          Paste a GitHub repo. Get a professional README. That is it.
        </p>

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

        {error && (
          <p className="mt-4 text-red-400 text-sm">{error}</p>
        )}
      </section>

      {readme && (
        <section className="max-w-4xl mx-auto px-6 pb-20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Generated README</h3>
            <button
              onClick={handleCopy}
              className="px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
            >
              {copied ? 'Copied!' : 'Copy to clipboard'}
            </button>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 prose prose-invert prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
              {readme}
            </ReactMarkdown>
          </div>
        </section>
      )}

      <footer className="border-t border-zinc-800 px-6 py-6 text-center text-sm text-zinc-500">
        Built by <a href="https://x.com/sourcedocsai" className="text-zinc-400 hover:text-white">@sourcedocsai</a>
      </footer>
    </main>
  );
}
