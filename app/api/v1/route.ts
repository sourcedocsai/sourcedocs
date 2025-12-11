import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    name: 'SourceDocs API',
    version: 'v1',
    documentation: 'https://www.sourcedocs.ai/docs',
    endpoints: {
      'POST /api/v1/generate': {
        description: 'Generate documentation for a GitHub repository',
        authentication: 'Bearer token (API key)',
        body: {
          repo_url: 'https://github.com/owner/repo',
          doc_type: 'readme | changelog | contributing | license | codeofconduct',
        },
        response: {
          success: true,
          doc_type: 'readme',
          repo: 'repo-name',
          content: '# Generated markdown...',
          generation_time_ms: 1234,
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
    example: {
      curl: `curl -X POST https://www.sourcedocs.ai/api/v1/generate \\
  -H "Authorization: Bearer sk_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"repo_url": "https://github.com/owner/repo", "doc_type": "readme"}'`,
    },
  });
}
