import { supabaseAdmin, User, Generation } from './supabase';

// Get or create user from GitHub profile
export async function getOrCreateUser(profile: {
  githubId: string;
  email?: string | null;
  name?: string | null;
  avatar_url?: string | null;
  username?: string | null;
}): Promise<User> {
  // Check if user exists
  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('github_id', profile.githubId)
    .single();

  if (existingUser) {
    return existingUser as User;
  }

  // Create new user
  const { data: newUser, error } = await supabaseAdmin
    .from('users')
    .insert({
      github_id: profile.githubId,
      email: profile.email,
      name: profile.name,
      avatar_url: profile.avatar_url,
      username: profile.username,
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

// Record a generation
export async function recordGeneration(
  userId: string,
  docType: string,
  repoUrl: string,
  source: string = 'web'
): Promise<Generation> {
  const { data, error } = await supabaseAdmin
    .from('generations')
    .insert({
      user_id: userId,
      doc_type: docType,
      repo_url: repoUrl,
      source,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Generation;
}

// Get usage count for current month
export async function getMonthlyUsage(userId: string): Promise<number> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count, error } = await supabaseAdmin
    .from('generations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startOfMonth.toISOString());

  if (error) throw error;
  return count || 0;
}

// Check if user can generate (within limits)
export async function canGenerate(userId: string): Promise<{ allowed: boolean; usage: number; limit: number }> {
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('is_pro')
    .eq('id', userId)
    .single();

  const limit = user?.is_pro ? Infinity : 1; // 1 free per month, unlimited for pro
  const usage = await getMonthlyUsage(userId);

  return {
    allowed: usage < limit,
    usage,
    limit: user?.is_pro ? -1 : limit, // -1 indicates unlimited
  };
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

  // Mark user as having completed survey
  await supabaseAdmin
    .from('users')
    .update({ survey_completed: true })
    .eq('id', userId);
}

// Check if user has completed survey
export async function hasCompletedSurvey(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('users')
    .select('survey_completed')
    .eq('id', userId)
    .single();

  return data?.survey_completed || false;
}
