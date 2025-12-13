import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserByGithubId, getUserGithubToken } from '@/lib/db';

// Document type to filename mapping
const DOC_TYPE_FILES: Record<string, string> = {
  readme: 'README.md',
  changelog: 'CHANGELOG.md',
  contributing: 'CONTRIBUTING.md',
  license: 'LICENSE',
  codeofconduct: 'CODE_OF_CONDUCT.md',
};

interface GitHubApiError {
  message: string;
  documentation_url?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const githubId = (session.user as any).githubId;
    const user = await getUserByGithubId(githubId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get the stored GitHub access token
    const accessToken = await getUserGithubToken(user.id);
    if (!accessToken) {
      return NextResponse.json(
        { 
          error: 'GitHub authorization required',
          requiresReauth: true,
          message: 'Please sign out and sign back in to grant repository access permissions.'
        },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { owner, repo, content, docType, filePath } = body;

    if (!owner || !repo || !content || !docType) {
      return NextResponse.json(
        { error: 'Missing required fields: owner, repo, content, docType' },
        { status: 400 }
      );
    }

    // Determine the filename
    const filename = filePath || DOC_TYPE_FILES[docType];
    if (!filename) {
      return NextResponse.json({ error: 'Invalid document type' }, { status: 400 });
    }

    // GitHub API headers
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'SourceDocs',
    };

    // Step 1: Get the default branch
    const repoResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      { headers }
    );

    if (!repoResponse.ok) {
      const error = await repoResponse.json() as GitHubApiError;
      if (repoResponse.status === 404) {
        return NextResponse.json(
          { error: 'Repository not found or you do not have access' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: `GitHub API error: ${error.message}` },
        { status: repoResponse.status }
      );
    }

    const repoData = await repoResponse.json() as { default_branch: string };
    const defaultBranch = repoData.default_branch;

    // Step 2: Get the latest commit SHA from the default branch
    const refResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${defaultBranch}`,
      { headers }
    );

    if (!refResponse.ok) {
      const error = await refResponse.json() as GitHubApiError;
      return NextResponse.json(
        { error: `Failed to get branch reference: ${error.message}` },
        { status: refResponse.status }
      );
    }

    const refData = await refResponse.json() as { object: { sha: string } };
    const baseSha = refData.object.sha;

    // Step 3: Create a new branch
    const branchName = `sourcedocs/update-${docType}-${Date.now()}`;
    
    const createBranchResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/refs`,
      {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ref: `refs/heads/${branchName}`,
          sha: baseSha,
        }),
      }
    );

    if (!createBranchResponse.ok) {
      const error = await createBranchResponse.json() as GitHubApiError;
      return NextResponse.json(
        { error: `Failed to create branch: ${error.message}` },
        { status: createBranchResponse.status }
      );
    }

    // Step 4: Check if the file already exists (to get its SHA for updates)
    let existingFileSha: string | undefined;
    const fileCheckResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filename}?ref=${branchName}`,
      { headers }
    );

    if (fileCheckResponse.ok) {
      const fileData = await fileCheckResponse.json() as { sha: string };
      existingFileSha = fileData.sha;
    }

    // Step 5: Create or update the file in the new branch
    const commitMessage = existingFileSha
      ? `docs: update ${filename} via SourceDocs.ai`
      : `docs: add ${filename} via SourceDocs.ai`;

    const createFileResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filename}`,
      {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: commitMessage,
          content: Buffer.from(content).toString('base64'),
          branch: branchName,
          ...(existingFileSha && { sha: existingFileSha }),
        }),
      }
    );

    if (!createFileResponse.ok) {
      const error = await createFileResponse.json() as GitHubApiError;
      return NextResponse.json(
        { error: `Failed to create file: ${error.message}` },
        { status: createFileResponse.status }
      );
    }

    // Step 6: Create the Pull Request
    const prTitle = existingFileSha
      ? `docs: Update ${filename}`
      : `docs: Add ${filename}`;

    const prBody = generatePRDescription(docType, filename, existingFileSha !== undefined);

    const createPRResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls`,
      {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: prTitle,
          body: prBody,
          head: branchName,
          base: defaultBranch,
        }),
      }
    );

    if (!createPRResponse.ok) {
      const error = await createPRResponse.json() as GitHubApiError;
      return NextResponse.json(
        { error: `Failed to create pull request: ${error.message}` },
        { status: createPRResponse.status }
      );
    }

    const prData = await createPRResponse.json() as { 
      html_url: string; 
      number: number;
      title: string;
    };

    return NextResponse.json({
      success: true,
      pr: {
        url: prData.html_url,
        number: prData.number,
        title: prData.title,
        branch: branchName,
        baseBranch: defaultBranch,
      },
    });

  } catch (error) {
    console.error('PR creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create pull request' },
      { status: 500 }
    );
  }
}

// Generate a detailed PR description
function generatePRDescription(docType: string, filename: string, isUpdate: boolean): string {
  const action = isUpdate ? 'Updated' : 'Added';
  const docTypeLabels: Record<string, string> = {
    readme: 'README',
    changelog: 'CHANGELOG',
    contributing: 'Contributing Guidelines',
    license: 'License',
    codeofconduct: 'Code of Conduct',
    comments: 'Code Comments',
  };

  const label = docTypeLabels[docType] || docType.toUpperCase();

  return `## ${action} ${label}

This pull request was automatically generated by [SourceDocs.ai](https://www.sourcedocs.ai).

### What's Changed

${isUpdate ? `- Updated \`${filename}\` with improved documentation` : `- Added \`${filename}\` to the repository`}

### About SourceDocs.ai

[SourceDocs.ai](https://www.sourcedocs.ai) uses AI to analyze your codebase and generate professional documentation. It supports:

- 📄 **README** - Project overviews with badges, installation guides, and usage examples
- 📋 **CHANGELOG** - Version history from commits and releases
- 🤝 **CONTRIBUTING** - Contribution guidelines for open source projects
- ⚖️ **LICENSE** - Properly formatted license files
- 📜 **CODE OF CONDUCT** - Community standards and guidelines
- 💬 **Code Comments** - JSDoc, docstrings, and more for 20+ languages

---

<sub>Generated by [SourceDocs.ai](https://www.sourcedocs.ai) • AI-powered documentation for developers</sub>
`;
}
