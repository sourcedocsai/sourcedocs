import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserByGithubId, canGenerateWeb, recordGeneration } from '@/lib/db';
import { parseGitHubUrl, fetchRepoDataForAnalysis } from '@/lib/github';
import { generateClassDiagram } from '@/lib/class-diagram';

/**
 * POST /api/class-diagram
 * 
 * Generate a Mermaid class diagram for a GitHub repository.
 * Analyzes source files to identify classes, interfaces, and their relationships.
 * 
 * Request body:
 * - url: GitHub repository URL (required)
 * - options: Generation options (optional)
 *   - focusDirectory: Only analyze files in this directory
 *   - maxClasses: Maximum number of classes to include (default: 20)
 * 
 * Response:
 * - success: boolean
 * - diagram: Mermaid class diagram code
 * - diagramType: "classDiagram"
 * - classes: Number of classes found
 * - relationships: Number of relationships found
 * - language: Primary repository language
 * - usage/limit/plan: User's usage information
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate the user
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const { url, options = {} } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'Repository URL is required' },
        { status: 400 }
      );
    }

    // Parse the GitHub URL
    const parsed = parseGitHubUrl(url);
    if (!parsed) {
      return NextResponse.json(
        { error: 'Invalid GitHub repository URL. Expected format: https://github.com/owner/repo' },
        { status: 400 }
      );
    }

    // Get the user and check usage limits
    const githubId = (session.user as any).githubId;
    const user = await getUserByGithubId(githubId);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user can generate (usage limits)
    const { allowed, usage, limit, plan } = await canGenerateWeb(user.id);
    if (!allowed) {
      return NextResponse.json(
        { 
          error: 'Monthly limit reached', 
          usage, 
          limit, 
          plan, 
          upgrade: true 
        },
        { status: 429 }
      );
    }

    const startTime = Date.now();

    // Fetch repository data with expanded file fetching for class analysis
    // This fetches more source files than standard README generation
    const repoData = await fetchRepoDataForAnalysis(parsed.owner, parsed.repo, {
      focusDirectory: options.focusDirectory,
      excludePatterns: [
        'test', 'tests', 'spec', 'specs', '__tests__', '__mocks__',
        'node_modules', 'dist', 'build', 'out', '.next',
        'coverage', 'vendor', '.git', 'examples', 'docs'
      ],
      maxFiles: 50,
    });

    // Check if we found any source files
    if (repoData.files.length === 0) {
      return NextResponse.json(
        { 
          error: 'No source files found in repository. Make sure the repository contains code files.' 
        },
        { status: 400 }
      );
    }

    // Generate the class diagram
    const result = await generateClassDiagram({
      repoName: repoData.name,
      owner: parsed.owner,
      language: repoData.language,
      files: repoData.files,
      tree: repoData.tree,
      options: {
        focusDirectory: options.focusDirectory,
        maxClasses: options.maxClasses || 20,
        includePrivate: options.includePrivate || false,
      },
    });

    const generationTimeMs = Date.now() - startTime;

    // Record the generation in the database
    await recordGeneration(user.id, 'class-diagram', url, 'web', generationTimeMs);

    // Return the generated diagram with metadata
    return NextResponse.json({
      success: true,
      diagram: result.mermaid,
      diagramType: 'classDiagram',
      classes: result.classCount,
      relationships: result.relationshipCount,
      language: repoData.language,
      filesAnalyzed: repoData.files.length,
      usage: usage + 1,
      limit,
      plan,
      generationTimeMs,
    });

  } catch (error) {
    console.error('Class diagram generation error:', error);
    
    // Provide helpful error messages based on error type
    let message = 'Failed to generate class diagram';
    let status = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('404')) {
        message = 'Repository not found. Please check the URL and ensure the repository is public or you have access.';
        status = 404;
      } else if (error.message.includes('rate limit')) {
        message = 'GitHub API rate limit exceeded. Please try again later.';
        status = 429;
      } else if (error.message.includes('timeout')) {
        message = 'Request timed out. The repository may be too large. Try specifying a focusDirectory.';
        status = 408;
      } else {
        message = error.message;
      }
    }
    
    return NextResponse.json({ error: message }, { status });
  }
}
