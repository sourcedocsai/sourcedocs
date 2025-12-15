'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// CSS to hide scrollbars while maintaining scroll functionality
const hideScrollbarStyles = `
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
`;

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
    avgGenerationsPerUser: string;
    dau: number;
    wau: number;
  };
  funnel: {
    totalUsers: number;
    usersWhoGenerated: number;
    proUsers: number;
    generatedRate: string;
    convertedRate: string;
  };
  docTypes: Record<string, number>;
  sources: Record<string, number>;
  plans: Record<string, number>;
  wouldPay: Record<string, number>;
  roles: Record<string, number>;
  teamSizes: Record<string, number>;
  dailyGenerations: Record<string, number>;
  dailySignups: Record<string, number>;
  avgGenTimeByType: Record<string, { avgMs: number; avgSec: string; count: number }>;
  recentUsers: Array<{
    username: string;
    email: string;
    is_pro: boolean;
    plan: string;
    created_at: string;
  }>;
  recentGenerations: Array<{
    username: string;
    email: string;
    doc_type: string;
    repo_url: string;
    source: string;
    generation_time_ms: number;
    created_at: string;
    copied: boolean;
    downloaded: boolean;
    pr_created: boolean;
  }>;
  powerUsers: Array<{
    username: string;
    email: string;
    is_pro: boolean;
    generations: number;
  }>;
  limitHitters: Array<{
    username: string;
    email: string;
    generations: number;
    surveyCompleted: boolean;
    signedUp: string;
  }>;
  churnRiskUsers: Array<{
    username: string;
    email: string;
    lastGeneration: string | null;
    daysSinceLastUse: number | null;
  }>;
  actionStats: {
    totalGenerations: number;
    copied: number;
    copiedRate: string;
    downloaded: number;
    downloadedRate: string;
    prCreated: number;
    prCreatedRate: string;
  };
}

function MetricCard({ label, value, highlight = false, subtext }: { label: string; value: string | number; highlight?: boolean; subtext?: string }) {
  return (
    <div className={`p-4 rounded-xl border ${highlight ? 'bg-green-900/20 border-green-800' : 'bg-zinc-900 border-zinc-800'}`}>
      <p className="text-xs text-zinc-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${highlight ? 'text-green-400' : 'text-zinc-100'}`}>{value}</p>
      {subtext && <p className="text-xs text-zinc-500 mt-1">{subtext}</p>}
    </div>
  );
}

function BarRow({ label, count, max }: { label: string; count: number; max: number }) {
  const percentage = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-zinc-400 w-28 truncate">{label}</span>
      <div className="flex-1 h-6 bg-zinc-800 rounded overflow-hidden">
        <div
          className="h-full bg-blue-600 rounded"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm text-zinc-300 w-12 text-right">{count}</span>
    </div>
  );
}

function FunnelStep({ label, value, rate, isLast = false }: { label: string; value: number; rate?: string; isLast?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-6 py-4 text-center min-w-[140px]">
        <p className="text-2xl font-bold text-zinc-100">{value}</p>
        <p className="text-xs text-zinc-500 mt-1">{label}</p>
      </div>
      {!isLast && (
        <div className="flex flex-col items-center my-2">
          <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-zinc-600" />
          {rate && <span className="text-xs text-zinc-500 mt-1">{rate}</span>}
        </div>
      )}
    </div>
  );
}

function UserRow({ username, email, badge, badgeColor = 'zinc' }: { username: string; email: string; badge?: string; badgeColor?: string }) {
  const colorClasses: Record<string, string> = {
    green: 'bg-green-900/50 text-green-400 border-green-800',
    red: 'bg-red-900/50 text-red-400 border-red-800',
    yellow: 'bg-yellow-900/50 text-yellow-400 border-yellow-800',
    zinc: 'bg-zinc-800 text-zinc-400 border-zinc-700',
    blue: 'bg-blue-900/50 text-blue-400 border-blue-800',
  };
  return (
    <div className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
      <div>
        <p className="text-sm text-zinc-200">{username}</p>
        <p className="text-xs text-zinc-500">{email}</p>
      </div>
      {badge && (
        <span className={`text-xs px-2 py-1 rounded border ${colorClasses[badgeColor]}`}>
          {badge}
        </span>
      )}
    </div>
  );
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'engagement' | 'revenue'>('overview');

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

  const maxDocType = Math.max(...Object.values(metrics.docTypes), 1);
  const maxSource = Math.max(...Object.values(metrics.sources), 1);
  const maxPlan = Math.max(...Object.values(metrics.plans), 1);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <style>{hideScrollbarStyles}</style>
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
          <div className="flex items-center gap-4">
            <button
              onClick={fetchMetrics}
              className="text-sm text-zinc-400 hover:text-zinc-200 px-3 py-1 bg-zinc-800 rounded"
            >
              Refresh
            </button>
            <span className="text-sm text-zinc-500">
              {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex gap-6">
            {(['overview', 'users', 'engagement', 'revenue'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <>
            {/* Key Metrics Cards */}
            <section className="mb-10">
              <h2 className="text-lg font-semibold mb-4">Key Metrics</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                <MetricCard label="Total Users" value={metrics.overview.totalUsers} />
                <MetricCard label="Pro Users" value={metrics.overview.proUsers} highlight />
                <MetricCard label="Conversion Rate" value={metrics.overview.conversionRate} />
                <MetricCard label="MRR" value={metrics.overview.mrr} highlight />
                <MetricCard label="Total Generations" value={metrics.overview.totalGenerations} />
                <MetricCard label="Avg Gen Time" value={`${metrics.overview.avgGenTimeSec}s`} />
                <MetricCard label="Avg Gens/User" value={metrics.overview.avgGenerationsPerUser} />
                <MetricCard label="DAU" value={metrics.overview.dau} subtext="Last 24 hours" />
                <MetricCard label="WAU" value={metrics.overview.wau} subtext="Last 7 days" />
                <MetricCard label="Survey Responses" value={metrics.overview.surveyResponses} />
              </div>
            </section>

            {/* Conversion Funnel */}
            <section className="mb-10">
              <h2 className="text-lg font-semibold mb-4">Conversion Funnel</h2>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="flex justify-center items-start gap-4">
                  <FunnelStep label="Total Users" value={metrics.funnel.totalUsers} rate={metrics.funnel.generatedRate} />
                  <FunnelStep label="Generated" value={metrics.funnel.usersWhoGenerated} rate={metrics.funnel.convertedRate} />
                  <FunnelStep label="Pro Users" value={metrics.funnel.proUsers} isLast />
                </div>
              </div>
            </section>

            {/* Post-Generation Actions */}
            <section className="mb-10">
              <h2 className="text-lg font-semibold mb-4">Post-Generation Actions</h2>
              <p className="text-sm text-zinc-500 mb-4">What users do after generating documentation</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
                  <p className="text-3xl font-bold text-blue-400">{metrics.actionStats.copied}</p>
                  <p className="text-sm text-zinc-500 mt-1">Copied</p>
                  <p className="text-xs text-zinc-600">{metrics.actionStats.copiedRate}% of generations</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
                  <p className="text-3xl font-bold text-purple-400">{metrics.actionStats.downloaded}</p>
                  <p className="text-sm text-zinc-500 mt-1">Downloaded</p>
                  <p className="text-xs text-zinc-600">{metrics.actionStats.downloadedRate}% of generations</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
                  <p className="text-3xl font-bold text-green-400">{metrics.actionStats.prCreated}</p>
                  <p className="text-sm text-zinc-500 mt-1">PRs Created</p>
                  <p className="text-xs text-zinc-600">{metrics.actionStats.prCreatedRate}% of generations</p>
                </div>
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
                      <BarRow key={type} label={type.toUpperCase()} count={count} max={maxDocType} />
                    ))}
                  {Object.keys(metrics.docTypes).length === 0 && (
                    <p className="text-sm text-zinc-500">No generations yet</p>
                  )}
                </div>
              </section>

              {/* Sources */}
              <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-md font-semibold mb-4">Generations by Source</h3>
                <div className="space-y-3">
                  {Object.entries(metrics.sources)
                    .sort(([, a], [, b]) => b - a)
                    .map(([source, count]) => (
                      <BarRow key={source} label={source.toUpperCase()} count={count} max={maxSource} />
                    ))}
                  {Object.keys(metrics.sources).length === 0 && (
                    <p className="text-sm text-zinc-500">No generations yet</p>
                  )}
                </div>
              </section>
            </div>

            {/* Generation Time by Doc Type */}
            <section className="mb-10">
              <h2 className="text-lg font-semibold mb-4">Avg Generation Time by Type</h2>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {Object.entries(metrics.avgGenTimeByType)
                    .sort(([, a], [, b]) => b.avgMs - a.avgMs)
                    .map(([type, data]) => (
                      <div key={type} className="text-center">
                        <p className="text-xs text-zinc-500 uppercase">{type}</p>
                        <p className="text-lg font-semibold text-zinc-200">{data.avgSec}s</p>
                        <p className="text-xs text-zinc-600">{data.count} gens</p>
                      </div>
                    ))}
                  {Object.keys(metrics.avgGenTimeByType).length === 0 && (
                    <p className="text-sm text-zinc-500 col-span-full">No data yet</p>
                  )}
                </div>
              </div>
            </section>

            {/* Recent Activity */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Recent Generations */}
              <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 overflow-hidden">
                <h3 className="text-md font-semibold mb-4">Recent Generations</h3>
                <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-hide">
                  {metrics.recentGenerations.map((gen, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0 gap-3">
                      <div className="flex-shrink-0 w-24">
                        <p className="text-sm text-zinc-200 truncate">{gen.username}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-400 truncate">{gen.repo_url.replace('https://github.com/', '')}</p>
                        <p className="text-xs text-zinc-600">
                          {gen.doc_type} • {gen.source} • {new Date(gen.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {gen.copied && <span className="text-xs px-1.5 py-0.5 bg-blue-900/50 text-blue-400 rounded" title="Copied">C</span>}
                        {gen.downloaded && <span className="text-xs px-1.5 py-0.5 bg-purple-900/50 text-purple-400 rounded" title="Downloaded">D</span>}
                        {gen.pr_created && <span className="text-xs px-1.5 py-0.5 bg-green-900/50 text-green-400 rounded" title="PR Created">PR</span>}
                        <span className="text-xs text-zinc-500 ml-1 w-10 text-right">
                          {(gen.generation_time_ms / 1000).toFixed(1)}s
                        </span>
                      </div>
                    </div>
                  ))}
                  {metrics.recentGenerations.length === 0 && (
                    <p className="text-sm text-zinc-500">No generations yet</p>
                  )}
                </div>
              </section>

              {/* Recent Users */}
              <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 overflow-hidden">
                <h3 className="text-md font-semibold mb-4">Recent Signups</h3>
                <div className="space-y-1 max-h-80 overflow-y-auto scrollbar-hide">
                  {metrics.recentUsers.map((user, i) => (
                    <UserRow
                      key={i}
                      username={user.username}
                      email={user.email}
                      badge={user.is_pro ? 'PRO' : user.plan || 'FREE'}
                      badgeColor={user.is_pro ? 'green' : 'zinc'}
                    />
                  ))}
                  {metrics.recentUsers.length === 0 && (
                    <p className="text-sm text-zinc-500">No users yet</p>
                  )}
                </div>
              </section>
            </div>
          </>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <>
            {/* Power Users */}
            <section className="mb-10">
              <h2 className="text-lg font-semibold mb-4">Power Users (Top 10)</h2>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="space-y-2">
                  {metrics.powerUsers.map((user, i) => (
                    <div key={i} className="flex items-center justify-between py-3 border-b border-zinc-800 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-zinc-600 w-6">#{i + 1}</span>
                        <div>
                          <p className="text-sm text-zinc-200">{user.username}</p>
                          <p className="text-xs text-zinc-500">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-semibold text-zinc-200">{user.generations} gens</span>
                        {user.is_pro && (
                          <span className="text-xs px-2 py-1 rounded bg-green-900/50 text-green-400 border border-green-800">
                            PRO
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {metrics.powerUsers.length === 0 && (
                    <p className="text-sm text-zinc-500">No users with generations yet</p>
                  )}
                </div>
              </div>
            </section>

            {/* Limit Hitters - Conversion Opportunities */}
            <section className="mb-10">
              <h2 className="text-lg font-semibold mb-2">Conversion Opportunities</h2>
              <p className="text-sm text-zinc-500 mb-4">Users who hit the free limit but haven&apos;t upgraded</p>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="space-y-2">
                  {metrics.limitHitters.map((user, i) => (
                    <div key={i} className="flex items-center justify-between py-3 border-b border-zinc-800 last:border-0">
                      <div>
                        <p className="text-sm text-zinc-200">{user.username}</p>
                        <p className="text-xs text-zinc-500">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-zinc-400">{user.generations} gens</span>
                        <span className={`text-xs px-2 py-1 rounded border ${
                          user.surveyCompleted 
                            ? 'bg-blue-900/50 text-blue-400 border-blue-800' 
                            : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                        }`}>
                          {user.surveyCompleted ? 'Survey Done' : 'No Survey'}
                        </span>
                      </div>
                    </div>
                  ))}
                  {metrics.limitHitters.length === 0 && (
                    <p className="text-sm text-zinc-500">No users at limit yet</p>
                  )}
                </div>
              </div>
            </section>

            {/* Plans Distribution */}
            <section className="mb-10">
              <h2 className="text-lg font-semibold mb-4">Users by Plan</h2>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="space-y-3">
                  {Object.entries(metrics.plans)
                    .sort(([, a], [, b]) => b - a)
                    .map(([plan, count]) => (
                      <BarRow key={plan} label={plan.toUpperCase()} count={count} max={maxPlan} />
                    ))}
                  {Object.keys(metrics.plans).length === 0 && (
                    <p className="text-sm text-zinc-500">No users yet</p>
                  )}
                </div>
              </div>
            </section>
          </>
        )}

        {/* ENGAGEMENT TAB */}
        {activeTab === 'engagement' && (
          <>
            {/* Active Users */}
            <section className="mb-10">
              <h2 className="text-lg font-semibold mb-4">Active Users</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard label="DAU" value={metrics.overview.dau} subtext="Last 24 hours" />
                <MetricCard label="WAU" value={metrics.overview.wau} subtext="Last 7 days" />
                <MetricCard label="Avg Gens/User" value={metrics.overview.avgGenerationsPerUser} />
                <MetricCard label="Total Generations" value={metrics.overview.totalGenerations} />
              </div>
            </section>

            {/* Churn Risk */}
            <section className="mb-10">
              <h2 className="text-lg font-semibold mb-2">Churn Risk</h2>
              <p className="text-sm text-zinc-500 mb-4">Pro users with no activity in 30+ days</p>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="space-y-2">
                  {metrics.churnRiskUsers.map((user, i) => (
                    <div key={i} className="flex items-center justify-between py-3 border-b border-zinc-800 last:border-0">
                      <div>
                        <p className="text-sm text-zinc-200">{user.username}</p>
                        <p className="text-xs text-zinc-500">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-1 rounded border ${
                          user.daysSinceLastUse === null
                            ? 'bg-red-900/50 text-red-400 border-red-800'
                            : user.daysSinceLastUse > 60
                              ? 'bg-red-900/50 text-red-400 border-red-800'
                              : 'bg-yellow-900/50 text-yellow-400 border-yellow-800'
                        }`}>
                          {user.daysSinceLastUse === null ? 'Never used' : `${user.daysSinceLastUse} days`}
                        </span>
                      </div>
                    </div>
                  ))}
                  {metrics.churnRiskUsers.length === 0 && (
                    <p className="text-sm text-green-400">No churn risk detected!</p>
                  )}
                </div>
              </div>
            </section>

            {/* Survey Insights */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Roles */}
              <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-md font-semibold mb-4">User Roles (Survey)</h3>
                <div className="space-y-3">
                  {Object.entries(metrics.roles)
                    .sort(([, a], [, b]) => b - a)
                    .map(([role, count]) => (
                      <BarRow key={role} label={role} count={count} max={Math.max(...Object.values(metrics.roles), 1)} />
                    ))}
                  {Object.keys(metrics.roles).length === 0 && (
                    <p className="text-sm text-zinc-500">No survey responses yet</p>
                  )}
                </div>
              </section>

              {/* Team Sizes */}
              <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-md font-semibold mb-4">Team Sizes (Survey)</h3>
                <div className="space-y-3">
                  {Object.entries(metrics.teamSizes)
                    .sort(([, a], [, b]) => b - a)
                    .map(([size, count]) => (
                      <BarRow key={size} label={size} count={count} max={Math.max(...Object.values(metrics.teamSizes), 1)} />
                    ))}
                  {Object.keys(metrics.teamSizes).length === 0 && (
                    <p className="text-sm text-zinc-500">No survey responses yet</p>
                  )}
                </div>
              </section>
            </div>
          </>
        )}

        {/* REVENUE TAB */}
        {activeTab === 'revenue' && (
          <>
            {/* Revenue Metrics */}
            <section className="mb-10">
              <h2 className="text-lg font-semibold mb-4">Revenue Metrics</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard label="MRR" value={metrics.overview.mrr} highlight />
                <MetricCard label="Pro Users" value={metrics.overview.proUsers} highlight />
                <MetricCard label="Conversion Rate" value={metrics.overview.conversionRate} />
                <MetricCard label="Survey Responses" value={metrics.overview.surveyResponses} />
              </div>
            </section>

            {/* Conversion Funnel */}
            <section className="mb-10">
              <h2 className="text-lg font-semibold mb-4">Conversion Funnel</h2>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="flex justify-center items-start gap-4">
                  <FunnelStep label="Total Users" value={metrics.funnel.totalUsers} rate={metrics.funnel.generatedRate} />
                  <FunnelStep label="Generated" value={metrics.funnel.usersWhoGenerated} rate={metrics.funnel.convertedRate} />
                  <FunnelStep label="Pro Users" value={metrics.funnel.proUsers} isLast />
                </div>
              </div>
            </section>

            {/* Would Pay Distribution */}
            <section className="mb-10">
              <h2 className="text-lg font-semibold mb-4">Willingness to Pay (Survey)</h2>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="space-y-3">
                  {Object.entries(metrics.wouldPay)
                    .sort(([, a], [, b]) => b - a)
                    .map(([response, count]) => (
                      <BarRow key={response} label={response} count={count} max={Math.max(...Object.values(metrics.wouldPay), 1)} />
                    ))}
                  {Object.keys(metrics.wouldPay).length === 0 && (
                    <p className="text-sm text-zinc-500">No survey responses yet</p>
                  )}
                </div>
              </div>
            </section>

            {/* Plans Distribution */}
            <section className="mb-10">
              <h2 className="text-lg font-semibold mb-4">Revenue by Plan</h2>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="grid grid-cols-3 gap-6 text-center">
                  <div>
                    <p className="text-3xl font-bold text-zinc-200">{metrics.plans['web_pro'] || 0}</p>
                    <p className="text-sm text-zinc-500">Web Pro ($8/mo)</p>
                    <p className="text-lg text-green-400">${(metrics.plans['web_pro'] || 0) * 8}</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-zinc-200">{metrics.plans['api_pro'] || 0}</p>
                    <p className="text-sm text-zinc-500">API Pro ($15/mo)</p>
                    <p className="text-lg text-green-400">${(metrics.plans['api_pro'] || 0) * 15}</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-zinc-200">{metrics.plans['bundle'] || 0}</p>
                    <p className="text-sm text-zinc-500">Bundle ($20/mo)</p>
                    <p className="text-lg text-green-400">${(metrics.plans['bundle'] || 0) * 20}</p>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
