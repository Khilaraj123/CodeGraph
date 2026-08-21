import type { RepoFile, RepositoryMetadata } from '../repositoryTypes';

interface GithubTreeEntry {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

/**
 * Parses GitHub URL or string "owner/repo" to extract owner, repo name, and optional branch/path
 */
export function parseGithubUrl(urlOrString: string): { owner: string; repo: string; branch?: string } {
  const clean = urlOrString.trim().replace(/^https?:\/\/github\.com\//, '');
  const parts = clean.split('/');

  if (parts.length < 2) {
    throw new Error('Invalid GitHub repository format. Use "owner/repo" or a full GitHub URL.');
  }

  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/, '');

  let branch: string | undefined;

  // URL format: owner/repo/tree/branchName
  if (parts[2] === 'tree' && parts[3]) {
    branch = parts.slice(3).join('/');
  }

  return { owner, repo, branch };
}

/**
 * Fetches default branch of a GitHub repository
 */
async function fetchDefaultBranch(owner: string, repo: string, token?: string): Promise<string> {
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  if (!res.ok) {
    throw new Error(`Failed to fetch repository metadata. Status: ${res.status}`);
  }
  const data = await res.json();
  return data.default_branch || 'main';
}

/**
 * Fetches the recursive file tree of a GitHub repository
 */
async function fetchRepoTree(
  owner: string,
  repo: string,
  branch: string,
  token?: string
): Promise<GithubTreeEntry[]> {
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  // First fetch the SHA of the branch to get its absolute tree
  const refRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branch}`, { headers });
  let sha = branch;
  if (refRes.ok) {
    const refData = await refRes.json();
    sha = refData.object.sha;
  }

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`,
    { headers }
  );

  if (!res.ok) {
    if (res.status === 403 && !token) {
      throw new Error('GitHub API rate limit exceeded. Please configure a GitHub Token in Settings.');
    }
    throw new Error(`Failed to fetch repository tree. Status: ${res.status}`);
  }

  const data = await res.json();
  return data.tree as GithubTreeEntry[];
}

/**
 * Fetches file content from raw.githubusercontent.com or the blobs API
 */
async function fetchFileContent(
  owner: string,
  repo: string,
  branch: string,
  path: string,
  sha: string,
  token?: string
): Promise<string> {
  const headers: HeadersInit = {};

  if (token) {
    // Fetch from GitHub Blobs API to authenticate and bypass raw content rate limits
    headers['Authorization'] = `token ${token}`;
    headers['Accept'] = 'application/vnd.github.v3.raw';
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/blobs/${sha}`, { headers });
    if (!res.ok) throw new Error(`Blob fetch failed: ${res.statusText}`);
    return await res.text();
  } else {
    // Fetch public raw content (allows CORS)
    const res = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`);
    if (!res.ok) throw new Error(`Raw fetch failed: ${res.statusText}`);
    return await res.text();
  }
}

/**
 * Checks if a file path represents code/text content we care about
 */
export function isSupportedCodeFile(path: string): boolean {
  const ext = path.split('.').pop()?.toLowerCase();
  const supported = ['ts', 'tsx', 'js', 'jsx', 'json', 'css', 'md', 'html'];
  const ignoredPattern = /(^|\/)(node_modules|dist|build|\.git|\.next)\//;
  return !!ext && supported.includes(ext) && !ignoredPattern.test(path);
}

/**
 * Loads a GitHub repository recursively
 */
export async function loadGithubRepository(
  urlOrString: string,
  token?: string,
  onProgress?: (progress: number, message: string) => void
): Promise<{ files: RepoFile[]; metadata: RepositoryMetadata }> {
  const progress = (p: number, msg: string) => onProgress?.(p, msg);

  progress(5, 'Parsing GitHub repository details...');
  const { owner, repo, branch: urlBranch } = parseGithubUrl(urlOrString);

  progress(10, 'Fetching repository metadata...');
  const branch = urlBranch || (await fetchDefaultBranch(owner, repo, token));

  progress(20, `Fetching repository tree for branch [${branch}]...`);
  const tree = await fetchRepoTree(owner, repo, branch, token);

  const supportedFiles = tree.filter(
    (entry) => entry.type === 'blob' && isSupportedCodeFile(entry.path)
  );

  if (supportedFiles.length === 0) {
    throw new Error('No supported JavaScript, TypeScript, HTML, CSS, or JSON files found in this repository.');
  }

  progress(30, `Found ${supportedFiles.length} source files. Downloading contents...`);

  const files: RepoFile[] = [];
  let loadedCount = 0;
  let totalSize = 0;

  // We fetch files in parallel batches of 5 to avoid overloading connections
  const batchSize = 5;
  for (let i = 0; i < supportedFiles.length; i += batchSize) {
    const batch = supportedFiles.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (entry) => {
        try {
          const content = await fetchFileContent(owner, repo, branch, entry.path, entry.sha, token);
          const size = entry.size || content.length;

          files.push({
            path: entry.path,
            name: entry.path.split('/').pop() || '',
            content,
            size,
            type: 'file',
          });

          totalSize += size;
        } catch (e) {
          console.error(`Failed to fetch file content for ${entry.path}:`, e);
          // Gracefully omit file if fetch fails
        } finally {
          loadedCount++;
          const percent = 30 + Math.round((loadedCount / supportedFiles.length) * 70);
          progress(percent, `Downloaded ${loadedCount}/${supportedFiles.length} files...`);
        }
      })
    );
  }

  const metadata: RepositoryMetadata = {
    name: repo,
    owner,
    branch,
    source: 'github',
    fileCount: files.length,
    totalSize,
  };

  return { files, metadata };
}
