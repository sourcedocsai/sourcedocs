'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface ApiKey {
  id: string;
  name: string;
  key_preview: string;
  created_at: string;
  last_used_at: string | null;
}

interface UserStatus {
  plan: string;
  api: {
    usage: number;
    limit: number;
    resetAt: string;
  };
  apiKeys: ApiKey[];
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }

    if (status === 'authenticated') {
      fetchStatus();
    }
  }, [status, router]);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/user/status');
      if (res.ok) {
        const data = await res.json();
        setUserStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch status:', err);
    } finally {
      setLoading(false);
    }
  };

  const createKey = async () => {
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName || 'Default' }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      setNewKey(data.key);
      setNewKeyName('');
      fetchStatus();
    } catch (err) {
      setError('Failed to create API key');
    } finally {
      setCreating(false);
    }
  };

  const deleteKey = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return;

    try {
      await fetch(`/api/keys/${id}`, { method: 'DELETE' });
      fetchStatus();
    } catch (err) {
      console.error('Failed to delete key:', err);
    }
  };

  const copyKey = async (key: string) => {
    await navigator.clipboard.writeText(key);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  const hasApiAccess = userStatus && userStatus.api.limit > 0;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <a href="/" className="text-xl font-semibold hover:text-zinc-300">
            SourceDocs.ai
          </a>
          <span className="text-sm text-zinc-500">Settings</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Plan Info */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-4">Your Plan</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-semibold capitalize">
                  {userStatus?.plan.replace('_', ' ') || 'Free'}
                </p>
                {hasApiAccess && (
                  <p className="text-zinc-400 text-sm mt-1">
                    API calls: {userStatus?.api.usage} / {userStatus?.api.limit} used
                  </p>
                )}
              </div>
              
                href="/"
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors"
              >
                Change Plan
              </a>
            </div>
          </div>
        </section>

        {/* API Keys */}
        <section>
          <h2 className="text-lg font-semibold mb-4">API Keys</h2>

          {!hasApiAccess ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
              <p className="text-zinc-400 mb-4">
                API access requires an API Pro or Bundle plan.
              </p>
              
                href="/"
                className="inline-block px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium transition-colors"
              >
                Upgrade to Get API Access
              </a>
            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              {/* New Key Created */}
              {newKey && (
                <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-sm text-green-400 mb-2">
                    ✓ API key created. Copy it now — it won't be shown again.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-zinc-800 rounded text-sm font-mono">
                      {newKey}
                    </code>
                    <button
                      onClick={() => copyKey(newKey)}
                      className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 rounded text-sm transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                  <button
                    onClick={() => setNewKey(null)}
                    className="mt-2 text-xs text-zinc-500 hover:text-zinc-300"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Create Key Form */}
              <div className="flex gap-2 mb-6">
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="Key name (optional)"
                  className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-zinc-500"
                />
                <button
                  onClick={createKey}
                  disabled={creating}
                  className="px-4 py-2 bg-white text-zinc-900 font-medium rounded-lg hover:bg-zinc-200 disabled:opacity-50 transition-colors text-sm"
                >
                  {creating ? 'Creating...' : 'Create Key'}
                </button>
              </div>

              {error && (
                <p className="text-red-400 text-sm mb-4">{error}</p>
              )}

              {/* Keys List */}
              {userStatus?.apiKeys && userStatus.apiKeys.length > 0 ? (
                <div className="space-y-3">
                  {userStatus.apiKeys.map((key) => (
                    <div
                      key={key.id}
                      className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-sm">{key.name}</p>
                        <p className="text-zinc-500 text-xs font-mono">
                          {key.key_preview}
                        </p>
                        <p className="text-zinc-600 text-xs mt-1">
                          Created {new Date(key.created_at).toLocaleDateString()}
                          {key.last_used_at && (
                            <> • Last used {new Date(key.last_used_at).toLocaleDateString()}</>
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteKey(key.id)}
                        className="px-3 py-1 text-red-400 hover:text-red-300 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-500 text-sm">
                  No API keys yet. Create one to get started.
                </p>
              )}

              {/* API Docs Link */}
              <div className="mt-6 pt-6 border-t border-zinc-800">
                <p className="text-zinc-400 text-sm">
                  View the{' '}
                  
                    href="/api/v1"
                    target="_blank"
                    className="text-white underline hover:no-underline"
                  >
                    API documentation
                  </a>{' '}
                  to get started.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
