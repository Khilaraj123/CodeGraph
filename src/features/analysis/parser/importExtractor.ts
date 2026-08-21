import type { ParsedImport } from './parserTypes';

/**
 * Normalizes a path, resolving relative segments like '.' and '..'.
 */
export function normalizePath(path: string): string {
  const cleanPath = path.replace(/\\/g, '/').replace(/\/+/g, '/');
  const segments = cleanPath.split('/');
  const stack: string[] = [];

  for (const seg of segments) {
    if (seg === '.' || seg === '') continue;
    if (seg === '..') {
      stack.pop();
    } else {
      stack.push(seg);
    }
  }

  return stack.join('/');
}

/**
 * Resolves an import source path to an actual file in the repository.
 * Returns undefined if it's a third-party package or cannot be resolved.
 */
export function resolveImportPath(
  importSource: string,
  currentFilePath: string,
  allFilePaths: string[]
): string | undefined {
  // Normalize paths to look for
  const fileList = allFilePaths.map(p => p.toLowerCase());
  
  // If it's a third-party module (doesn't start with '.', '/', or '@')
  if (!importSource.startsWith('.') && !importSource.startsWith('/') && !importSource.startsWith('@/')) {
    return undefined;
  }

  let targetPath = '';

  if (importSource.startsWith('@/')) {
    // Alias resolution (commonly @/ maps to src/)
    targetPath = 'src/' + importSource.slice(2);
  } else if (importSource.startsWith('.')) {
    // Relative path resolution
    const parts = currentFilePath.split('/');
    parts.pop(); // Remove filename to get parent dir
    const currentDir = parts.join('/');
    
    const combined = currentDir ? `${currentDir}/${importSource}` : importSource;
    targetPath = normalizePath(combined);
  } else {
    // Absolute path from root
    targetPath = importSource.startsWith('/') ? importSource.slice(1) : importSource;
  }

  // Create list of possible paths to search for
  const candidates = [
    targetPath,
    `${targetPath}.ts`,
    `${targetPath}.tsx`,
    `${targetPath}.js`,
    `${targetPath}.jsx`,
    `${targetPath}/index.ts`,
    `${targetPath}/index.tsx`,
    `${targetPath}/index.js`,
    `${targetPath}/index.jsx`,
  ];

  for (const cand of candidates) {
    const normalizedCand = normalizePath(cand).toLowerCase();
    const index = fileList.indexOf(normalizedCand);
    if (index !== -1) {
      return allFilePaths[index]; // Return original cased path
    }
  }

  return undefined;
}

/**
 * Iterates over all parsed imports in a file and resolves their target paths.
 */
export function resolveFileImports(
  imports: ParsedImport[],
  filePath: string,
  allFilePaths: string[]
): ParsedImport[] {
  return imports.map((imp) => {
    const resolvedPath = resolveImportPath(imp.source, filePath, allFilePaths);
    return {
      ...imp,
      resolvedPath,
    };
  });
}
