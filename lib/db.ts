import { supabaseAdmin, User, Generation, Plan } from './supabase';

// Plan limits
const PLAN_LIMITS = {
  free: { web: 1, api: 0 },
  web_pro: { web: -1, api: 0 },  // -1 = unlimited
  api_pro: { web: 1, api: 100 },
  bundle: { web: -1, api: 100 },
};

// Get or create user from GitHub profile
export async function getOrCreateUser(profile: {
  id: string;
  login: string;
  name?: string;
  email?: string;
  avatar_url?: string;
}): Promise<User> {
  // Try to find existing user
  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('github_id', profile.id)
    .single();

  if (existing) {
    return existing as User;
  }

  // Create new user
  const { data: newUser, error } = await supabaseAdmin
    .from('users')
    .insert({
      github_id: profile.id,
      username: profile.login,
      name: profile.name || null,
      email: profile.email || null,
      avatar_url: profile.avatar_url || null,
      plan: 'free',
      api_calls_limit: 0,
      api_calls_used: 0,
      api_calls_reset_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return newUser as User;
}

// Get user by GitHub ID
export async function getUserByGithubId(githubId: string): Promise<User | null> {
  const { data } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('github_id', githubId)
    .single();

  return data as User | null;
}

// Get user by API key
export async function getUserByApiKey(apiKey: string): Promise<User | null> {
  const { data: keyData } = await supabaseAdmin
    .from('api_keys')
    .select('user_id')
    .eq('key', apiKey)
    .single();

  if (!keyData) return null;

  // Update last_used_at
  await supabaseAdmin
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('key', apiKey);

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', keyData.user_id)
    .single();

  return user as User | null;
}

// Check and reset API calls if needed
async function checkAndResetApiCalls(user: User): Promise<User> {
  const resetAt = new Date(user.api_calls_reset_at);
  const now = new Date();

  // Reset if it's been more than 30 days
  if (now.getTime() - resetAt.getTime() > 30 * 24 * 60 * 60 * 1000) {
    const { data } = await supabaseAdmin
      .from('users')
      .update({
        api_calls_used: 0,
        api_calls_reset_at: now.toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single();

    return data as User;
  }

  return user;
}

// Record a generation
export async function recordGeneration(
  userId: string,
  docType: string,
  repoUrl: string,
  source: string = 'web',
  generationTimeMs?: number
): Promise<Generation> {
  const { data, error } = await supabaseAdmin
    .from('generations')
    .insert({
      user_id: userId,
      doc_type: docType,
      repo_url: repoUrl,
      source,
      generation_time_ms: generationTimeMs || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Generation;
}

// Get monthly web usage
export async function getMonthlyWebUsage(userId: string): Promise<number> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count } = await supabaseAdmin
    .from('generations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('source', 'web')
    .gte('created_at', startOfMonth.toISOString());

  return count || 0;
}

// Check if user can generate via web
export async function canGenerateWeb(userId: string): Promise<{
  allowed: boolean;
  usage: number;
  limit: number;
  plan: Plan;
}> {
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (!user) {
    return { allowed: false, usage: 0, limit: 0, plan: 'free' };
  }

  const plan = (user.plan || 'free') as Plan;
  const limits = PLAN_LIMITS[plan];
  const usage = await getMonthlyWebUsage(userId);

  // Unlimited web access
  if (limits.web === -1) {
    return { allowed: true, usage, limit: -1, plan };
  }

  return {
    allowed: usage < limits.web,
    usage,
    limit: limits.web,
    plan,
  };
}

// Check if user can generate via API
export async function canGenerateApi(userId: string): Promise<{
  allowed: boolean;
  usage: number;
  limit: number;
  plan: Plan;
}> {
  let user = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
    .then(res => res.data as User);

  if (!user) {
    return { allowed: false, usage: 0, limit: 0, plan: 'free' };
  }

  // Check and reset if needed
  user = await checkAndResetApiCalls(user);

  const plan = (user.plan || 'free') as Plan;
  const limits = PLAN_LIMITS[plan];

  // No API access
  if (limits.api === 0) {
    return { allowed: false, usage: user.api_calls_used, limit: 0, plan };
  }

  return {
    allowed: user.api_calls_used < limits.api,
    usage: user.api_calls_used,
    limit: limits.api,
    plan,
  };
}

// Increment API usage
export async function incrementApiUsage(userId: string): Promise<void> {
  await supabaseAdmin.rpc('increment_api_calls', { user_id: userId });
}

// Survey response type
export interface SurveyResponse {
  role: string;
  team_size: string;
  doc_frequency: string;
  important_docs: string[];
  would_pay: string;
  feedback?: string;
  email?: string;
}

// Save survey response
export async function saveSurveyResponse(
  userId: string,
  response: SurveyResponse
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('survey_responses')
    .insert({
      user_id: userId,
      role: response.role,
      team_size: response.team_size,
      doc_frequency: response.doc_frequency,
      important_docs: response.important_docs,
      would_pay: response.would_pay,
      feedback: response.feedback || null,
      email: response.email || null,
    });

  if (error) throw error;

  await supabaseAdmin
    .from('users')
    .update({ survey_completed: true })
    .eq('id', userId);
}

// Generate API key
export async function createApiKey(userId: string, name: string = 'Default'): Promise<string> {
  const key = `sk_live_${generateRandomString(32)}`;

  const { error } = await supabaseAdmin
    .from('api_keys')
    .insert({
      user_id: userId,
      key,
      name,
    });

  if (error) throw error;
  return key;
}

// Get user's API keys
export async function getApiKeys(userId: string): Promise<Array<{
  id: string;
  name: string;
  key_preview: string;
  created_at: string;
  last_used_at: string | null;
}>> {
  const { data } = await supabaseAdmin
    .from('api_keys')
    .select('id, name, key, created_at, last_used_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return (data || []).map(k => ({
    id: k.id,
    name: k.name,
    key_preview: `${k.key.slice(0, 12)}...${k.key.slice(-4)}`,
    created_at: k.created_at,
    last_used_at: k.last_used_at,
  }));
}

// Delete API key
export async function deleteApiKey(userId: string, keyId: string): Promise<void> {
  await supabaseAdmin
    .from('api_keys')
    .delete()
    .eq('id', keyId)
    .eq('user_id', userId);
}

// Helper function
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function trackApiUsage(userId: string): Promise<void> {
  await incrementApiUsage(userId);
}
