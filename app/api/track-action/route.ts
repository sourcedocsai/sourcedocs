import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * POST /api/track-action
 * 
 * Track user actions after a generation is created.
 * This helps us understand what users do with generated content.
 * 
 * Request body:
 * - generationId: ID of the generation (optional, can use repoUrl + docType instead)
 * - repoUrl: Repository URL that was generated
 * - docType: Type of document that was generated
 * - action: 'copy' | 'download' | 'pr'
 */
export async function POST(request: NextRequest) {
  try {
    // Get the current user session
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { repoUrl, docType, action } = body;

    // Validate the action
    const validActions = ['copy', 'download', 'pr'];
    if (!action || !validActions.includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be one of: copy, download, pr' },
        { status: 400 }
      );
    }

    if (!repoUrl || !docType) {
      return NextResponse.json(
        { error: 'repoUrl and docType are required' },
        { status: 400 }
      );
    }

    // Map action to database column
    const columnMap: Record<string, string> = {
      copy: 'copied',
      download: 'downloaded',
      pr: 'pr_created',
    };
    const column = columnMap[action];

    // Find the most recent generation matching this repo and doc type for this user
    // We update the most recent one since that's likely what they're interacting with
    const { data: generations, error: findError } = await supabaseAdmin
      .from('generations')
      .select('id')
      .eq('repo_url', repoUrl)
      .eq('doc_type', docType)
      .order('created_at', { ascending: false })
      .limit(1);

    if (findError) {
      console.error('Error finding generation:', findError);
      return NextResponse.json({ error: 'Failed to find generation' }, { status: 500 });
    }

    if (!generations || generations.length === 0) {
      // No matching generation found - that's okay, maybe it was before we started tracking
      return NextResponse.json({ success: true, tracked: false, reason: 'no_matching_generation' });
    }

    // Update the generation with the action flag
    const { error: updateError } = await supabaseAdmin
      .from('generations')
      .update({ [column]: true })
      .eq('id', generations[0].id);

    if (updateError) {
      console.error('Error updating generation:', updateError);
      return NextResponse.json({ error: 'Failed to track action' }, { status: 500 });
    }

    return NextResponse.json({ success: true, tracked: true, action, generationId: generations[0].id });

  } catch (error) {
    console.error('Track action error:', error);
    return NextResponse.json({ error: 'Failed to track action' }, { status: 500 });
  }
}
