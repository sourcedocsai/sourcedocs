import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserByGithubId } from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check admin status
    const githubId = (session.user as any).githubId;
    const user = await getUserByGithubId(githubId);

    if (!user || !user.is_admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Fetch all metrics in parallel
    const [
      totalUsersResult,
      proUsersResult,
      generationsResult,
      docTypesResult,
      recentUsersResult,
      recentGenerationsResult,
      surveyResponsesResult,
      wouldPayResult,
      rolesResult,
      teamSizesResult,
      avgGenTimeResult,
      dailyGenerationsResult,
      powerUsersResult,
    ] = await Promise.all([
      // Total users
      supabaseAdmin.from('users').select('id', { count: 'exact', head: true }),

      // Pro users
      supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).eq('is_pro', true),

      // Total generations
      supabaseAdmin.from('generations').select('id', { count: 'exact', head: true }),

      // Generations by doc type
      supabaseAdmin.from('generations').select('doc_type'),

      // Recent users (last 10)
      supabaseAdmin
        .from('users')
        .select('username, email, is_pro, created_at')
        .order('created_at', { ascending: false })
        .limit(10),

      // Recent generations (last 10)
      supabaseAdmin
        .from('generations')
        .select('doc_type, repo_url, source, generation_time_ms, created_at')
        .order('created_at', { ascending: false })
        .limit(10),

      // Survey responses count
      supabaseAdmin.from('survey_responses').select('id', { count: 'exact', head: true }),

      // Would pay breakdown
      supabaseAdmin.from('survey_responses').select('would_pay'),

      // Roles breakdown
      supabaseAdmin.from('survey_responses').select('role'),

      // Team sizes
      supabaseAdmin.from('survey_responses').select('team_size'),

      // Average generation time
      supabaseAdmin.from('generations').select('generation_time_ms').not('generation_time_ms', 'is', null),

      // Daily generations (last 14 days)
      supabaseAdmin
        .from('generations')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()),

      // Power users
      supabaseAdmin.from('generations').select('user_id'),
    ]);

    // Process doc types
    const docTypeCounts: Record<string, number> = {};
    generationsResult.data?.forEach((g: any) => {
      docTypeCounts[g.doc_type] = (docTypeCounts[g.doc_type] || 0) + 1;
    });

    // Process would pay
    const wouldPayCounts: Record<string, number> = {};
    wouldPayResult.data?.forEach((s: any) => {
      wouldPayCounts[s.would_pay] = (wouldPayCounts[s.would_pay] || 0) + 1;
    });

    // Process roles
    const roleCounts: Record<string, number> = {};
    rolesResult.data?.forEach((s: any) => {
      roleCounts[s.role] = (roleCounts[s.role] || 0) + 1;
    });

    // Process team sizes
    const teamSizeCounts: Record<string, number> = {};
    teamSizesResult.data?.forEach((s: any) => {
      teamSizeCounts[s.team_size] = (teamSizeCounts[s.team_size] || 0) + 1;
    });

    // Calculate average generation time
    const genTimes = avgGenTimeResult.data?.map((g: any) => g.generation_time_ms) || [];
    const avgGenTime = genTimes.length > 0
      ? Math.round(genTimes.reduce((a: number, b: number) => a + b, 0) / genTimes.length)
      : 0;

    // Process daily generations
    const dailyGens: Record<string, number> = {};
    dailyGenerationsResult.data?.forEach((g: any) => {
      const date = new Date(g.created_at).toISOString().split('T')[0];
      dailyGens[date] = (dailyGens[date] || 0) + 1;
    });

    // Process power users
    const userGenCounts: Record<string, number> = {};
    powerUsersResult.data?.forEach((g: any) => {
      userGenCounts[g.user_id] = (userGenCounts[g.user_id] || 0) + 1;
    });

    // Calculate metrics
    const totalUsers = totalUsersResult.count || 0;
    const proUsers = proUsersResult.count || 0;
    const totalGenerations = generationsResult.count || 0;
    const conversionRate = totalUsers > 0 ? ((proUsers / totalUsers) * 100).toFixed(2) : '0';
    const mrr = proUsers * 8;

    return NextResponse.json({
      overview: {
        totalUsers,
        proUsers,
        conversionRate: `${conversionRate}%`,
        mrr: `$${mrr}`,
        totalGenerations,
        avgGenTimeMs: avgGenTime,
        avgGenTimeSec: (avgGenTime / 1000).toFixed(2),
        surveyResponses: surveyResponsesResult.count || 0,
      },
      docTypes: docTypeCounts,
      wouldPay: wouldPayCounts,
      roles: roleCounts,
      teamSizes: teamSizeCounts,
      dailyGenerations: dailyGens,
      recentUsers: recentUsersResult.data || [],
      recentGenerations: recentGenerationsResult.data || [],
    });
  } catch (error) {
    console.error('Admin metrics error:', error);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}
