import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import { canGenerateApi, recordGeneration } from '@/lib/db';
import { parseGitHubUrl, fetchRepoData, fetchRepoDataForAnalysis, fetchCommits, fetchReleases, fetchTags } from '@/lib/github';
import { generateReadme } from '@/lib/claude';
import { generateChangelog } from '@/lib/changelog';
import { generateContributing } from '@/lib/contributing';
import { generateLicense } from '@/lib/license';
import { generateCodeOfConduct } from '@/lib/codeofconduct';
import { parseGitHubFileUrl, fetchGitHubFileContent, generateCodeComments } from '@/lib/comments';
import { generateClassDiagram } from '@/lib/class-diagram';

/**
 * Valid document types supported by the API
 * Each type has different input requirements and output formats
 */
const VALID_DOC_TYPES = ['readme', 'changelog', 'contributing', 'license', 'codeofconduct', 'comments', 'classdiagram'] as const;
type DocType = typeof VALID_DOC_TYPES[number];

/**
 * POST /api/v1/generate
 * 
 * Generate documentation for a GitHub repository via the public API.
 * Requires API key authentication via Bearer token.
 * 
 * Request body:
 * - doc_type: Type of documentation to generate (required)
 * - repo_url: GitHub repository URL (required for most types)
 * - file_url: GitHub file URL (required for comments type)
 * - options: Generation options (optional, varies by type)
 * 
 * Response:
 * - success: boolean
 * - doc_type: The type that was generated
 * - content: The generated documentation
 * - Additional metadata varies by type
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate the request using API key
    const auth = await authenticateApiRequest(request);
    if (!auth.success || !auth.user) {
      return NextResponse.json(
        { error: auth.error || 'Authentication failed' },
        { status: 401 }
      );
    }

    // Parse the request body
    const body = await request.json();
    const { doc_type, repo_url, file_url, options = {} } = body;

    // Validate doc_type is provided and valid
    if (!doc_type || !VALID_DOC_TYPES.includes(doc_type)) {
      return NextResponse.json(
        {
          error: 'Invalid or missing doc_type',
          valid_types: VALID_DOC_TYPES,
          example: {
            readme: { repo_url: 'https://github.com/owner/repo', doc_type: 'readme' },
            comments: { file_url: 'https://github.com/owner/repo/blob/main/src/file.ts', doc_type: 'comments' },
            classdiagram: { repo_url: 'https://github.com/owner/repo', doc_type: 'classdiagram' },
          },
        },
        { status: 400 }
      );
    }

    // Validate URL requirements based on document type
    let parsedRepo = null;
    if (repo_url) {
      parsedRepo = parseGitHubUrl(repo_url);
      if (!parsedRepo) {
        return NextResponse.json({ error: 'Invalid or unsupported GitHub repository URL/owner/repo' }, { status: 400 });
      }
    }
    if (doc_type === 'comments') {
      if (!file_url) {
        return NextResponse.json(
          {
            error: 'file_url is required for comments doc_type',
            example: 'https://github.com/owner/repo/blob/main/src/file.ts',
          },
          { status: 400 }
        );
      }
    } else {
      if (!repo_url) {
        return NextResponse.json(
          { error: 'repo_url is required for this doc_type' },
          { status: 400 }
        );
      }
    }

    // Check API usage limits
    const { allowed, usage, limit } = await canGenerateApi(auth.user.id);
    if (!allowed) {
      return NextResponse.json(
        {
          error: 'API limit reached',
          usage,
          limit,
          upgrade_url: 'https://www.sourcedocs.ai/settings',
        },
        { status: 429 }
      );
    }

    const startTime = Date.now();
    let content: string;
    let responseData: Record<string, any> = {};

    // Handle code comments (uses file_url instead of repo_url)
    if (doc_type === 'comments') {
      const parsed = parseGitHubFileUrl(file_url);
      if (!parsed) {
        return NextResponse.json(
          {
            error: 'Invalid GitHub file URL',
            expected_format: 'https://github.com/owner/repo/blob/branch/path/to/file.ext',
          },
          { status: 400 }
        );
      }

      // Fetch the file content from GitHub
      const fileContent = await fetchGitHubFileContent(
        parsed.owner,
        parsed.repo,
        parsed.path,
        parsed.branch
      );

      // Check file size limit
      if (fileContent.length > 500000) {
        return NextResponse.json(
          { error: 'File too large. Maximum size is 500KB.' },
          { status: 400 }
        );
      }

      // Generate documented code
      content = await generateCodeComments({
        filename: parsed.path.split('/').pop() || parsed.path,
        content: fileContent,
        repoName: parsed.repo,
        owner: parsed.owner,
      });

      responseData = {
        file: {
          name: parsed.path.split('/').pop(),
          path: parsed.path,
          repo: parsed.repo,
          owner: parsed.owner,
        },
      };

      const generationTimeMs = Date.now() - startTime;
      await recordGeneration(auth.user.id, 'comments', file_url, 'api', generationTimeMs);

      return NextResponse.json({
        success: true,
        doc_type,
        ...responseData,
        content,
        generation_time_ms: generationTimeMs,
      });
    }

    // Parse and validate repository URL for other document types
    const parsed = parseGitHubUrl(repo_url);
    if (!parsed) {
      return NextResponse.json(
        { error: 'Invalid GitHub repository URL' },
        { status: 400 }
      );
    }

    // Generate based on document type
    switch (doc_type as DocType) {
      case 'readme': {
        const repoData = await fetchRepoData(parsed.owner, parsed.repo);
        content = await generateReadme(repoData);
        responseData = { repo: parsed.repo };
        break;
      }

      case 'changelog': {
        const [commits, releases, tags] = await Promise.all([
          fetchCommits(parsed.owner, parsed.repo),
          fetchReleases(parsed.owner, parsed.repo),
          fetchTags(parsed.owner, parsed.repo),
        ]);
        content = await generateChangelog(parsed.repo, commits, releases, tags);
        responseData = { repo: parsed.repo };
        break;
      }

      case 'contributing': {
        const repoData = await fetchRepoData(parsed.owner, parsed.repo);
        content = await generateContributing({
          name: repoData.name,
          language: repoData.language,
          files: repoData.files,
          tree: repoData.tree,
        });
        responseData = { repo: parsed.repo };
        break;
      }

      case 'license': {
        content = await generateLicense({
          name: parsed.repo,
          owner: parsed.owner,
        });
        responseData = { repo: parsed.repo };
        break;
      }

      case 'codeofconduct': {
        content = await generateCodeOfConduct({
          name: parsed.repo,
          owner: parsed.owner,
        });
        responseData = { repo: parsed.repo };
        break;
      }

      case 'classdiagram': {
        // Fetch expanded repository data for class analysis
        const repoData = await fetchRepoDataForAnalysis(parsed.owner, parsed.repo, {
          focusDirectory: options.focus_directory,
          excludePatterns: options.exclude_patterns || [
            'test', 'tests', 'spec', '__tests__',
            'node_modules', 'dist', 'build', '.next',
          ],
          maxFiles: options.max_files || 50,
        });

        // Generate the class diagram
        const result = await generateClassDiagram({
          repoName: repoData.name,
          owner: parsed.owner,
          language: repoData.language,
          files: repoData.files,
          tree: repoData.tree,
          options: {
            maxClasses: options.max_classes || 20,
            focusDirectory: options.focus_directory,
          },
        });

        content = result.mermaid;
        responseData = {
          repo: parsed.repo,
          diagram_type: 'classDiagram',
          classes: result.classCount,
          relationships: result.relationshipCount,
          language: repoData.language,
          files_analyzed: repoData.files.length,
        };
        break;
      }

      default:
        return NextResponse.json(
          { error: 'Invalid doc_type' },
          { status: 400 }
        );
    }

    const generationTimeMs = Date.now() - startTime;

    // Record the generation for usage tracking
    await recordGeneration(auth.user.id, doc_type, repo_url, 'api', generationTimeMs);

    // Return the generated content with metadata
    return NextResponse.json({
      success: true,
      doc_type,
      ...responseData,
      content,
      generation_time_ms: generationTimeMs,
    });

  } catch (error) {
    console.error('API generation error:', error);
    
    // Provide helpful error messages
    let message = 'Failed to generate documentation';
    let status = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('404')) {
        message = 'Repository or file not found. Please check the URL and ensure you have access.';
        status = 404;
      } else if (error.message.includes('rate limit')) {
        message = 'GitHub API rate limit exceeded. Please try again later.';
        status = 429;
      } else {
        message = error.message;
      }
    }
    
    return NextResponse.json({ error: message }, { status });
  }
}
