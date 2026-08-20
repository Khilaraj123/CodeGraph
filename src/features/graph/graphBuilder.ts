import type { RepoFile } from '../repository/repositoryTypes';
import type { GraphData, GraphNode, GraphEdge } from './graphTypes';

/**
 * Extracts parent directory path
 * E.g. "src/components/Button.tsx" -> "src/components"
 */
export function getParentDir(path: string): string {
  const parts = path.split('/');
  if (parts.length > 1) {
    parts.pop();
    return parts.join('/');
  }
  return '';
}

/**
 * Adds directory node and its parent folders to the graph recursively
 */
function addDirectoryHierarchy(
  dir: string,
  directories: Set<string>,
  nodes: GraphNode[],
  linkKeys: Set<string>,
  links: GraphEdge[]
) {
  if (directories.has(dir) || !dir) return;

  directories.add(dir);
  const parts = dir.split('/');
  const name = parts[parts.length - 1];

  nodes.push({
    id: `dir:${dir}`,
    label: name,
    type: 'directory',
    path: dir,
    size: 20,
    cluster: parts.slice(0, -1).join('/'),
  });

  const parent = parts.slice(0, -1).join('/');
  if (parent) {
    addDirectoryHierarchy(parent, directories, nodes, linkKeys, links);

    const parentId = `dir:${parent}`;
    const childId = `dir:${dir}`;
    const key = `${parentId}->${childId}`;
    if (!linkKeys.has(key)) {
      linkKeys.add(key);
      links.push({
        id: key,
        source: parentId,
        target: childId,
        type: 'contains',
      });
    }
  }
}

/**
 * Builds the visual graph model from parsed repository files
 */
export function buildDependencyGraph(
  files: RepoFile[],
  options: {
    excludeTestFiles: boolean;
    showDirectories: boolean;
    showPackages: boolean;
  }
): GraphData {
  const nodes: GraphNode[] = [];
  const links: GraphEdge[] = [];
  const linkKeys = new Set<string>();

  // Check file exclusion matches
  const isExcluded = (path: string) => {
    if (options.excludeTestFiles) {
      const lower = path.toLowerCase();
      if (
        lower.includes('.test.') ||
        lower.includes('.spec.') ||
        lower.includes('__tests__') ||
        lower.includes('/test/')
      ) {
        return true;
      }
    }
    return false;
  };

  const activeFiles = files.filter((f) => !isExcluded(f.path));

  // 1. Add file nodes
  for (const file of activeFiles) {
    nodes.push({
      id: `file:${file.path}`,
      label: file.name,
      type: 'file',
      path: file.path,
      size: Math.max(10, Math.min(100, file.lineCount || 10)), // Scale lines of code visually
      cluster: getParentDir(file.path),
    });
  }

  // 2. Add packages and file-to-file / file-to-package dependency links
  const packageNodes = new Set<string>();

  for (const file of activeFiles) {
    if (!file.imports) continue;

    for (const imp of file.imports) {
      const sourceId = `file:${file.path}`;
      let targetId = '';

      if (imp.resolvedPath) {
        if (isExcluded(imp.resolvedPath)) continue;
        targetId = `file:${imp.resolvedPath}`;
      } else {
        if (!options.showPackages) continue;

        // Clean module identifier (e.g. "react/jsx-runtime" -> "react")
        let pkgName = imp.source;
        if (!pkgName.startsWith('.') && !pkgName.startsWith('/') && !pkgName.startsWith('@/')) {
          const parts = pkgName.split('/');
          pkgName = pkgName.startsWith('@') && parts.length > 1
            ? `${parts[0]}/${parts[1]}`
            : parts[0];
        } else {
          // Unresolved internal imports are skipped
          continue;
        }

        targetId = `pkg:${pkgName}`;
        if (!packageNodes.has(pkgName)) {
          packageNodes.add(pkgName);
          nodes.push({
            id: targetId,
            label: pkgName,
            type: 'package',
            size: 15,
            cluster: 'npm_modules',
          });
        }
      }

      if (sourceId && targetId && sourceId !== targetId) {
        const key = `${sourceId}->${targetId}`;
        if (!linkKeys.has(key)) {
          linkKeys.add(key);
          links.push({
            id: key,
            source: sourceId,
            target: targetId,
            type: 'import',
          });
        }
      }
    }
  }

  // 3. Add directory containment structure (if enabled)
  if (options.showDirectories) {
    const directories = new Set<string>();

    for (const file of activeFiles) {
      const dir = getParentDir(file.path);
      if (dir) {
        addDirectoryHierarchy(dir, directories, nodes, linkKeys, links);

        const fileId = `file:${file.path}`;
        const dirId = `dir:${dir}`;
        const key = `${dirId}->${fileId}`;
        
        if (!linkKeys.has(key)) {
          linkKeys.add(key);
          links.push({
            id: key,
            source: dirId,
            target: fileId,
            type: 'contains',
          });
        }
      }
    }
  }

  return { nodes, links };
}
