import { NextResponse } from 'next/server';

/**
 * GET /api/v1
 * 
 * Returns API documentation and available endpoints.
 * This serves as a self-documenting entry point for the SourceDocs API.
 */
export async function GET() {
  return NextResponse.json({
    name: 'SourceDocs API',
    version: 'v1',
    documentation: 'https://www.sourcedocs.ai/docs',
    description: 'AI-powered documentation generation for GitHub repositories',
    
    endpoints: {
      'POST /api/v1/generate': {
        description: 'Generate documentation for a GitHub repository or file',
        authentication: 'Bearer token (API key from settings page)',
        
        parameters: {
          doc_type: {
            type: 'string',
            required: true,
            enum: ['readme', 'changelog', 'contributing', 'license', 'codeofconduct', 'comments', 'classdiagram'],
            description: 'Type of documentation to generate',
          },
          repo_url: {
            type: 'string',
            required: 'For all types except comments',
            format: 'https://github.com/owner/repo',
            description: 'GitHub repository URL',
          },
          file_url: {
            type: 'string',
            required: 'Only for comments type',
            format: 'https://github.com/owner/repo/blob/branch/path/to/file.ext',
            description: 'GitHub file URL for code comment generation',
          },
          options: {
            type: 'object',
            required: false,
            description: 'Additional options (varies by doc_type)',
            properties: {
              focus_directory: 'For classdiagram: only analyze files in this directory',
              max_classes: 'For classdiagram: maximum classes to include (default: 20)',
              max_files: 'For classdiagram: maximum files to analyze (default: 50)',
            },
          },
        },
        
        responses: {
          success: {
            success: true,
            doc_type: 'readme',
            repo: 'repo-name',
            content: '# Generated documentation...',
            generation_time_ms: 1234,
          },
          classdiagram_success: {
            success: true,
            doc_type: 'classdiagram',
            repo: 'repo-name',
            content: 'classDiagram...',
            diagram_type: 'classDiagram',
            classes: 12,
            relationships: 8,
            language: 'TypeScript',
            files_analyzed: 25,
            generation_time_ms: 2500,
          },
          error: {
            error: 'Error message',
          },
        },
      },
      
      'GET /api/v1/status': {
        description: 'Check your API usage and limits',
        authentication: 'Bearer token (API key)',
        response: {
          plan: 'api_pro | bundle',
          api_calls: {
            used: 10,
            limit: 100,
            remaining: 90,
            resets_at: '2025-01-01T00:00:00Z',
          },
        },
      },
    },
    
    examples: {
      generate_readme: {
        description: 'Generate a README file',
        curl: `curl -X POST https://www.sourcedocs.ai/api/v1/generate \\
  -H "Authorization: Bearer sk_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"repo_url": "https://github.com/owner/repo", "doc_type": "readme"}'`,
      },
      
      generate_changelog: {
        description: 'Generate a CHANGELOG from commits and releases',
        curl: `curl -X POST https://www.sourcedocs.ai/api/v1/generate \\
  -H "Authorization: Bearer sk_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"repo_url": "https://github.com/owner/repo", "doc_type": "changelog"}'`,
      },
      
      generate_comments: {
        description: 'Add documentation comments to a source file',
        curl: `curl -X POST https://www.sourcedocs.ai/api/v1/generate \\
  -H "Authorization: Bearer sk_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"file_url": "https://github.com/owner/repo/blob/main/src/index.ts", "doc_type": "comments"}'`,
      },
      
      generate_class_diagram: {
        description: 'Generate a Mermaid class diagram',
        curl: `curl -X POST https://www.sourcedocs.ai/api/v1/generate \\
  -H "Authorization: Bearer sk_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"repo_url": "https://github.com/owner/repo", "doc_type": "classdiagram"}'`,
      },
      
      generate_class_diagram_focused: {
        description: 'Generate a class diagram for a specific directory',
        curl: `curl -X POST https://www.sourcedocs.ai/api/v1/generate \\
  -H "Authorization: Bearer sk_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"repo_url": "https://github.com/owner/repo", "doc_type": "classdiagram", "options": {"focus_directory": "src/models", "max_classes": 15}}'`,
      },
      
      check_usage: {
        description: 'Check API usage and remaining quota',
        curl: `curl https://www.sourcedocs.ai/api/v1/status \\
  -H "Authorization: Bearer sk_live_your_api_key"`,
      },
    },
    
    rate_limits: {
      description: 'Rate limits vary by plan',
      plans: {
        api_pro: '100 API calls per month',
        bundle: '100 API calls per month (includes web access)',
      },
      note: 'Limits reset on the first of each month',
    },
    
    support: {
      email: 'support@sourcedocs.ai',
      documentation: 'https://www.sourcedocs.ai/docs',
      status: 'https://www.sourcedocs.ai/status',
    },
  });
}
