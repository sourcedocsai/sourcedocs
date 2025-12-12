'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Metrics {
  overview: {
    totalUsers: number;
    proUsers: number;
    conversionRate: string;
    mrr: string;
    totalGenerations: number;
    avgGenTimeMs: number;
    avgGenTimeSec: string;
    surveyResponses: number;
  };
  docTypes: Record<string, number>;
  sources: Record<string, number>;
  plans: Record<string, number>;
  wouldPay: Record<string, number>;
  roles: Record<string, number>;
  teamSizes: Record<string, number>;
  dailyGenerations: Record<string, number>;
  recentUsers: Array<{
    username: string;
    email: string;
    is_pro: boolean;
    plan: string;
    created_at: string;
  }>;
  recentGenerations: Array<{
    doc_type: string;
    repo_url: string;
    source: string;
    generation_time_ms: number;
    created_at: string;
  }>;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }

    if (status === 'authenticated') {
      fetchMetrics();
    }
  }, [status, router]);

  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/admin/metrics');
      if (res.status === 403) {
        router.push('/');
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setMetrics(data);
    } catch (err) {
      setError('Failed to load metrics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <p className="text-red-400">{error || 'Access denied'}</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/" className="text-xl font-semibold hover:text-zinc-300">
              SourceDocs.ai
            </a>
            <span className="text-sm text-red-400 font-medium px-2 py-1 bg-red-400/10 rounded">
              Admin
            </span>
          </div>
	  <span className="text-sm text-zinc-500">
            {new Date().toLocaleTimeString()}
          </span>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Overview Cards */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-4">Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Total Users" value={metrics.overview.totalUsers} />
            <MetricCard label="Pro Users" value={metrics.overview.proUsers} highlight />
            <MetricCard label="Conversion Rate" value={metrics.overview.conversionRate} />
            <MetricCard label="MRR" value={metrics.overview.mrr} highlight />
            <MetricCard label="Total Generations" value={metrics.overview.totalGenerations} />
            <MetricCard label="Avg Gen Time" value={`${metrics.overview.avgGenTimeSec}s`} />
            <MetricCard label="Survey Responses" value={metrics.overview.surveyResponses} />
          </div>
        </section>

        {/* Charts Row */}
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {/* Doc Types */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-md font-semibold mb-4">Generations by Doc Type</h3>
            <div className="space-y-3">
              {Object.entries(metrics.docTypes)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => (
                  <BarRow
                    key={type}
                    label={type.toUpperCase()}
                    value={count}
                    max={Math.max(...Object.values(metrics.docTypes))}
                  />
                ))}
            </div>
          </section>

          {/* Generation Sources */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-md font-semibold mb-4">Generations by Source</h3>
              <div className="space-y-3">
                  {Object.entries(metrics.sources || {})
                    .sort(([, a], [, b]) => b - a)
                    .map(([source, count]) => (
                      <BarRow
                        key={source}
                        label={source.toUpperCase()}
                        value={count}
                        max={Math.max(...Object.values(metrics.sources || { web: 1 }))}
                      />
                    ))}
                  {Object.keys(metrics.sources || {}).length === 0 && (
                      <p className="text-zinc-500 text-sm">No data yet</p>
                  )}
                </div>
          </section>

          {/* Plans Distribution */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-md font-semibold mb-4">Users by Plan</h3>
            <div className="space-y-3">
               {Object.entries(metrics.plans || {})
                  .sort(([, a], [, b]) => b - a)
                  .map(([plan, count]) => (
                     <BarRow
                        key={plan}
                        label={plan.replace('_', ' ').toUpperCase()}
                        value={count}
                        max={Math.max(...Object.values(metrics.plans || { free: 1 }))}
                     />
                  ))}
               {Object.keys(metrics.plans || {}).length === 0 && (
                 <p className="text-zinc-500 text-sm">No data yet</p>
               )}
             </div>
           </section>

          {/* Would Pay */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-md font-semibold mb-4">Would Pay $8/month?</h3>
            <div className="space-y-3">
              {Object.entries(metrics.wouldPay)
                .sort(([, a], [, b]) => b - a)
                .map(([response, count]) => (
                  <BarRow
                    key={response}
                    label={response}
                    value={count}
                    max={Math.max(...Object.values(metrics.wouldPay))}
                  />
                ))}
            </div>
          </section>

          {/* Roles */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-md font-semibold mb-4">User Roles</h3>
            <div className="space-y-3">
              {Object.entries(metrics.roles)
                .sort(([, a], [, b]) => b - a)
                .map(([role, count]) => (
                  <BarRow
                    key={role}
                    label={role}
                    value={count}
                    max={Math.max(...Object.values(metrics.roles))}
                  />
                ))}
            </div>
          </section>

          {/* Team Sizes */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-md font-semibold mb-4">Team Sizes</h3>
            <div className="space-y-3">
              {Object.entries(metrics.teamSizes)
                .sort(([, a], [, b]) => b - a)
                .map(([size, count]) => (
                  <BarRow
                    key={size}
                    label={size}
                    value={count}
                    max={Math.max(...Object.values(metrics.teamSizes))}
                  />
                ))}
            </div>
          </section>
        </div>

        {/* Daily Generations */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-10">
          <h3 className="text-md font-semibold mb-4">Daily Generations (Last 14 Days)</h3>
          <div className="flex items-end gap-2 h-32">
            {Object.entries(metrics.dailyGenerations)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, count]) => {
                const max = Math.max(...Object.values(metrics.dailyGenerations));
                const height = max > 0 ? (count / max) * 100 : 0;
                return (
                  <div key={date} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs text-zinc-400">{count}</span>
                    <div
                      className="w-full bg-green-500 rounded-t"
                      style={{ height: `${height}%`, minHeight: count > 0 ? '4px' : '0' }}
                    />
                    <span className="text-xs text-zinc-600">{date.slice(5)}</span>
                  </div>
                );
              })}
          </div>
        </section>

        {/* Tables Row */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent Users */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-md font-semibold mb-4">Recent Users</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-zinc-500 text-left">
                    <th className="pb-2">User</th>
                    <th className="pb-2">Pro</th>
                    <th className="pb-2">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.recentUsers.map((user, i) => (
                    <tr key={i} className="border-t border-zinc-800">
                      <td className="py-2">
                        <div>{user.username || 'Unknown'}</div>
                        <div className="text-xs text-zinc-500">{user.email}</div>
                      </td>
                      <td className="py-2">
                        {user.is_pro ? (
                          <span className="text-green-400">Yes</span>
                        ) : (
                          <span className="text-zinc-500">No</span>
                        )}
                      </td>
                      <td className="py-2 text-zinc-400">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Recent Generations */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-md font-semibold mb-4">Recent Generations</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-zinc-500 text-left">
                    <th className="pb-2">Type</th>
                    <th className="pb-2">Repo</th>
                    <th className="pb-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.recentGenerations.map((gen, i) => (
                    <tr key={i} className="border-t border-zinc-800">
                      <td className="py-2">
                        <span className="px-2 py-1 bg-zinc-800 rounded text-xs">
                          {gen.doc_type.toUpperCase()}
                        </span>
                      </td>
		      <td className="py-2 max-w-xs">
                        <a href={gen.repo_url} target="_blank" rel="noopener noreferrer" className="text-zinc-300 hover:text-white truncate block">
                          {gen.repo_url.replace('https://github.com/', '')}
                        </a>
                      </td>
                      <td className="py-2 text-zinc-400">
                        {gen.generation_time_ms
                          ? `${(gen.generation_time_ms / 1000).toFixed(1)}s`
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <p className="text-sm text-zinc-500 mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${highlight ? 'text-green-400' : ''}`}>
        {value}
      </p>
    </div>
  );
}

function BarRow({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const width = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-zinc-400 w-40 truncate">{label}</span>
      <div className="flex-1 bg-zinc-800 rounded-full h-2">
        <div
          className="bg-green-500 h-2 rounded-full"
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="text-sm text-zinc-300 w-8 text-right">{value}</span>
    </div>
  );
}
