import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserByGithubId } from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Authenticate and verify admin status
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const githubId = session.user.githubId;
    const user = await getUserByGithubId(githubId);

    if (!user || !user.is_admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Fetch all data in parallel for performance
    const [
      totalUsersResult,
      proUsersResult,
      generationsResult,
      docTypesResult,
      sourceTypesResult,
      recentUsersResult,
      recentGenerationsResult,
      surveyResponsesResult,
      wouldPayResult,
      rolesResult,
      teamSizesResult,
      dailyGenerationsResult,
      plansResult,
      usersWithGenerationsResult,
      generationTimesResult,
      userGenerationCountsResult,
      weeklyActiveResult,
      limitHittersResult,
      churnRiskResult,
      dailySignupsResult,
    ] = await Promise.all([
      // Existing queries
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('is_pro', true),
      supabaseAdmin.from('generations').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('generations').select('doc_type'),
      supabaseAdmin.from('generations').select('source'),
      supabaseAdmin.from('users').select('username, email, is_pro, plan, created_at').order('created_at', { ascending: false }).limit(10),
      // Simplified query - just get basic generation data without join
      supabaseAdmin.from('generations').select('id, doc_type, repo_url, source, generation_time_ms, created_at, user_id').order('created_at', { ascending: false }).limit(20),
      supabaseAdmin.from('survey_responses').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('survey_responses').select('would_pay'),
      supabaseAdmin.from('survey_responses').select('role'),
      supabaseAdmin.from('survey_responses').select('team_size'),
      supabaseAdmin.from('generations').select('created_at').order('created_at', { ascending: false }).limit(1000),
      supabaseAdmin.from('users').select('plan'),
      
      // Users who have generated (for conversion funnel)
      supabaseAdmin.from('generations').select('user_id'),
      
      // Generation times by doc type
      supabaseAdmin.from('generations').select('doc_type, generation_time_ms').not('generation_time_ms', 'is', null),
      
      // Generation counts per user (for power users and avg)
      supabaseAdmin.from('generations').select('user_id'),
      
      // Weekly active users (generations in last 7 days)
      supabaseAdmin.from('generations').select('user_id, created_at').gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      
      // Users who hit limit but didn't upgrade
      supabaseAdmin.from('users').select('username, email, web_generations_used, survey_completed, created_at').eq('is_pro', false).gte('web_generations_used', 1).order('web_generations_used', { ascending: false }).limit(20),
      
      // Churn risk - Pro users with no recent generations
      supabaseAdmin.from('users').select('id, username, email, upgraded_at').eq('is_pro', true),
      
      // Daily signups for time series
      supabaseAdmin.from('users').select('created_at').order('created_at', { ascending: false }).limit(500),
    ]);

    // Process doc types
    const docTypeCounts: Record<string, number> = {};
    docTypesResult.data?.forEach((g: any) => {
      docTypeCounts[g.doc_type] = (docTypeCounts[g.doc_type] || 0) + 1;
    });

    // Process source types
    const sourceCounts: Record<string, number> = {};
    sourceTypesResult.data?.forEach((g: any) => {
      const source = g.source || 'web';
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });

    // Process plans
    const planCounts: Record<string, number> = {};
    plansResult.data?.forEach((u: any) => {
      const plan = u.plan || 'free';
      planCounts[plan] = (planCounts[plan] || 0) + 1;
    });

    // Process would pay
    const wouldPayCounts: Record<string, number> = {};
    wouldPayResult.data?.forEach((sr: any) => {
      const response = sr.would_pay || 'unknown';
      wouldPayCounts[response] = (wouldPayCounts[response] || 0) + 1;
    });

    // Process roles
    const roleCounts: Record<string, number> = {};
    rolesResult.data?.forEach((sr: any) => {
      const role = sr.role || 'unknown';
      roleCounts[role] = (roleCounts[role] || 0) + 1;
    });

    // Process team sizes
    const teamSizeCounts: Record<string, number> = {};
    teamSizesResult.data?.forEach((sr: any) => {
      const size = sr.team_size || 'unknown';
      teamSizeCounts[size] = (teamSizeCounts[size] || 0) + 1;
    });

    // Process generation times for overall average
    const genTimes = generationTimesResult.data?.map((g: any) => g.generation_time_ms).filter(Boolean) || [];
    const avgGenTime = genTimes.length > 0
      ? Math.round(genTimes.reduce((a: number, b: number) => a + b, 0) / genTimes.length)
      : 0;

    // Process daily generations
    const dailyGens: Record<string, number> = {};
    dailyGenerationsResult.data?.forEach((g: any) => {
      const date = new Date(g.created_at).toISOString().split('T')[0];
      dailyGens[date] = (dailyGens[date] || 0) + 1;
    });

    // Calculate metrics
    const totalUsers = totalUsersResult.count || 0;
    const proUsers = proUsersResult.count || 0;
    const totalGenerations = generationsResult.count || 0;
    const conversionRate = totalUsers > 0 ? ((proUsers / totalUsers) * 100).toFixed(2) : '0';

    // Calculate MRR based on plans
    const mrr = (planCounts['web_pro'] || 0) * 8 + 
                (planCounts['api_pro'] || 0) * 15 + 
                (planCounts['bundle'] || 0) * 20;

    // Conversion funnel
    const uniqueUsersWhoGenerated = new Set(usersWithGenerationsResult.data?.map((g: any) => g.user_id) || []).size;
    const funnelGeneratedRate = totalUsers > 0 ? ((uniqueUsersWhoGenerated / totalUsers) * 100).toFixed(1) : '0';
    const funnelConvertedRate = uniqueUsersWhoGenerated > 0 ? ((proUsers / uniqueUsersWhoGenerated) * 100).toFixed(1) : '0';

    // Average generations per user
    const userGenCounts: Record<string, number> = {};
    userGenerationCountsResult.data?.forEach((g: any) => {
      userGenCounts[g.user_id] = (userGenCounts[g.user_id] || 0) + 1;
    });
    const userCountsArray = Object.values(userGenCounts);
    const avgGenerationsPerUser = userCountsArray.length > 0
      ? (userCountsArray.reduce((a, b) => a + b, 0) / userCountsArray.length).toFixed(2)
      : '0';

    // Power users (top 10 by generation count)
    const powerUsersList = Object.entries(userGenCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
    
    // Fetch user details for power users
    const powerUserIds = powerUsersList.map(([id]) => id);
    const powerUserDetails = powerUserIds.length > 0
      ? await supabaseAdmin.from('users').select('id, username, email, is_pro').in('id', powerUserIds)
      : { data: [] };
    
    const powerUsersMap = new Map(powerUserDetails.data?.map((u: any) => [u.id, u]) || []);
    const powerUsers = powerUsersList.map(([id, count]) => {
      const user = powerUsersMap.get(id) || { username: 'Unknown', email: '', is_pro: false };
      return {
        username: user.username,
        email: user.email,
        is_pro: user.is_pro,
        generations: count,
      };
    });

    // Generation time by doc type
    const genTimesByType: Record<string, number[]> = {};
    generationTimesResult.data?.forEach((g: any) => {
      if (g.generation_time_ms) {
        if (!genTimesByType[g.doc_type]) {
          genTimesByType[g.doc_type] = [];
        }
        genTimesByType[g.doc_type].push(g.generation_time_ms);
      }
    });
    const avgGenTimeByType: Record<string, { avgMs: number; avgSec: string; count: number }> = {};
    Object.entries(genTimesByType).forEach(([type, times]) => {
      const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
      avgGenTimeByType[type] = {
        avgMs: avg,
        avgSec: (avg / 1000).toFixed(2),
        count: times.length,
      };
    });

    // Daily and Weekly Active Users
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const dauUsers = new Set<string>();
    const wauUsers = new Set<string>();
    weeklyActiveResult.data?.forEach((g: any) => {
      const genDate = new Date(g.created_at);
      wauUsers.add(g.user_id);
      if (genDate >= oneDayAgo) {
        dauUsers.add(g.user_id);
      }
    });

    // Churn risk - Pro users with no generations in 30+ days
    const proUserIds = churnRiskResult.data?.map((u: any) => u.id) || [];
    
    let churnRiskUsers: Array<{ username: string; email: string; lastGeneration: string | null; daysSinceLastUse: number | null }> = [];
    
    if (proUserIds.length > 0) {
      const proUserGenerations = await supabaseAdmin
        .from('generations')
        .select('user_id, created_at')
        .in('user_id', proUserIds)
        .order('created_at', { ascending: false });
      
      const lastGenByUser: Record<string, Date> = {};
      proUserGenerations.data?.forEach((g: any) => {
        if (!lastGenByUser[g.user_id]) {
          lastGenByUser[g.user_id] = new Date(g.created_at);
        }
      });
      
      churnRiskUsers = (churnRiskResult.data || [])
        .map((u: any) => {
          const lastGen = lastGenByUser[u.id];
          const daysSince = lastGen ? Math.floor((now.getTime() - lastGen.getTime()) / (24 * 60 * 60 * 1000)) : null;
          return {
            username: u.username,
            email: u.email,
            lastGeneration: lastGen ? lastGen.toISOString() : null,
            daysSinceLastUse: daysSince,
          };
        })
        .filter((u: any) => u.daysSinceLastUse === null || u.daysSinceLastUse >= 30)
        .sort((a: any, b: any) => {
          if (a.daysSinceLastUse === null) return -1;
          if (b.daysSinceLastUse === null) return 1;
          return b.daysSinceLastUse - a.daysSinceLastUse;
        });
    }

    // Daily signups time series
    const dailySignups: Record<string, number> = {};
    dailySignupsResult.data?.forEach((u: any) => {
      const date = new Date(u.created_at).toISOString().split('T')[0];
      dailySignups[date] = (dailySignups[date] || 0) + 1;
    });

    // Limit hitters (users who hit free limit but didn't upgrade)
    const limitHitters = (limitHittersResult.data || []).map((u: any) => ({
      username: u.username,
      email: u.email,
      generations: u.web_generations_used,
      surveyCompleted: u.survey_completed,
      signedUp: u.created_at,
    }));

    // Fetch usernames for recent generations (separate query to avoid join issues)
    const recentGenUserIds = [...new Set(recentGenerationsResult.data?.map((g: any) => g.user_id) || [])];
    const userLookup: Record<string, { username: string; email: string }> = {};
    
    if (recentGenUserIds.length > 0) {
      const usersForGens = await supabaseAdmin
        .from('users')
        .select('id, username, email')
        .in('id', recentGenUserIds);
      
      usersForGens.data?.forEach((u: any) => {
        userLookup[u.id] = { username: u.username, email: u.email };
      });
    }

    // Process recent generations with user info
    const recentGenerations = (recentGenerationsResult.data || []).map((g: any) => {
      const userInfo = userLookup[g.user_id] || { username: 'Unknown', email: '' };
      return {
        username: userInfo.username,
        email: userInfo.email,
        doc_type: g.doc_type,
        repo_url: g.repo_url,
        source: g.source,
        generation_time_ms: g.generation_time_ms,
        created_at: g.created_at,
        // These will be false until the columns are added
        copied: false,
        downloaded: false,
        pr_created: false,
      };
    });

    // Action stats - placeholder until columns are added
    const actionStats = {
      totalGenerations,
      copied: 0,
      copiedRate: '0',
      downloaded: 0,
      downloadedRate: '0',
      prCreated: 0,
      prCreatedRate: '0',
    };

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
        avgGenerationsPerUser,
        dau: dauUsers.size,
        wau: wauUsers.size,
      },
      
      funnel: {
        totalUsers,
        usersWhoGenerated: uniqueUsersWhoGenerated,
        proUsers,
        generatedRate: `${funnelGeneratedRate}%`,
        convertedRate: `${funnelConvertedRate}%`,
      },
      
      docTypes: docTypeCounts,
      sources: sourceCounts,
      plans: planCounts,
      wouldPay: wouldPayCounts,
      roles: roleCounts,
      teamSizes: teamSizeCounts,
      
      dailyGenerations: dailyGens,
      dailySignups,
      
      avgGenTimeByType,
      
      recentUsers: recentUsersResult.data || [],
      recentGenerations,
      
      powerUsers,
      limitHitters,
      churnRiskUsers,
      
      actionStats,
    });
  } catch (error) {
    console.error('Admin metrics error:', error);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}
