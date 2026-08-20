import JSZip from 'jszip';
import type { RepoFile, RepositoryMetadata } from './repositoryTypes';
import { isSupportedCodeFile } from './githubLoader';

/**
 * Strips the top-level folder name from a webkitRelativePath to make it root-relative
 * E.g. "my-project/src/App.tsx" -> "src/App.tsx"
 */
function stripTopLevelFolder(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/');
  if (parts.length > 1) {
    return parts.slice(1).join('/');
  }
  return path;
}

/**
 * Loads files from a FileList (selected via <input type="file" webkitdirectory>)
 */
export async function loadLocalFileList(
  fileList: FileList,
  onProgress?: (progress: number, message: string) => void
): Promise<{ files: RepoFile[]; metadata: RepositoryMetadata }> {
  const progress = (p: number, msg: string) => onProgress?.(p, msg);
  
  progress(10, 'Scanning selected files...');
  const files: RepoFile[] = [];
  const fileArray = Array.from(fileList);
  
  const supportedFiles = fileArray.filter((file) => {
    const relativePath = stripTopLevelFolder(file.webkitRelativePath || file.name);
    return isSupportedCodeFile(relativePath);
  });

  if (supportedFiles.length === 0) {
    throw new Error('No supported code files (JS, TS, HTML, CSS, JSON) found in the selected folder.');
  }

  progress(20, `Reading ${supportedFiles.length} files...`);

  let loadedCount = 0;
  let totalSize = 0;
  
  // Extract project name from the top-level folder of the first file
  const firstPath = fileArray[0]?.webkitRelativePath || '';
  const projectName = firstPath.split('/')[0] || 'local-repo';

  for (const file of supportedFiles) {
    const path = stripTopLevelFolder(file.webkitRelativePath || file.name);
    const content = await file.text();
    const size = file.size;

    files.push({
      path,
      name: file.name,
      content,
      size,
      type: 'file',
    });

    totalSize += size;
    loadedCount++;

    if (loadedCount % 10 === 0 || loadedCount === supportedFiles.length) {
      const percent = 20 + Math.round((loadedCount / supportedFiles.length) * 80);
      progress(percent, `Read ${loadedCount}/${supportedFiles.length} files...`);
    }
  }

  const metadata: RepositoryMetadata = {
    name: projectName,
    source: 'local',
    fileCount: files.length,
    totalSize,
  };

  return { files, metadata };
}

/**
 * Recursively traverses a FileSystemDirectoryHandle (File System Access API)
 */
async function traverseDirectoryHandle(
  dirHandle: FileSystemDirectoryHandle,
  currentPath = ''
): Promise<RepoFile[]> {
  const files: RepoFile[] = [];

  for await (const entry of dirHandle.values()) {
    const relativePath = currentPath ? `${currentPath}/${entry.name}` : entry.name;

    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') {
      continue;
    }

    if (entry.kind === 'file') {
      if (isSupportedCodeFile(relativePath)) {
        try {
          const file = await entry.getFile();
          const content = await file.text();
          files.push({
            path: relativePath,
            name: entry.name,
            content,
            size: file.size,
            type: 'file',
          });
        } catch (e) {
          console.warn(`Could not read local file ${relativePath}:`, e);
        }
      }
    } else if (entry.kind === 'directory') {
      const subFiles = await traverseDirectoryHandle(entry, relativePath);
      files.push(...subFiles);
    }
  }

  return files;
}

/**
 * Loads files using File System Access API showDirectoryPicker()
 */
export async function loadLocalDirectory(
  dirHandle: FileSystemDirectoryHandle,
  onProgress?: (progress: number, message: string) => void
): Promise<{ files: RepoFile[]; metadata: RepositoryMetadata }> {
  const progress = (p: number, msg: string) => onProgress?.(p, msg);

  progress(10, 'Requesting directory traversal permissions...');
  progress(30, 'Scanning directory contents...');
  
  const files = await traverseDirectoryHandle(dirHandle);

  if (files.length === 0) {
    throw new Error('No supported code files (JS, TS, HTML, CSS, JSON) found in this directory.');
  }

  const totalSize = files.reduce((acc, file) => acc + file.size, 0);

  progress(100, 'Finished loading directory.');

  const metadata: RepositoryMetadata = {
    name: dirHandle.name,
    source: 'local',
    fileCount: files.length,
    totalSize,
  };

  return { files, metadata };
}

/**
 * Loads a zip file uploaded by the user and extracts files
 */
export async function loadZipFile(
  file: File,
  onProgress?: (progress: number, message: string) => void
): Promise<{ files: RepoFile[]; metadata: RepositoryMetadata }> {
  const progress = (p: number, msg: string) => onProgress?.(p, msg);

  progress(10, 'Loading zip archive...');
  const zip = await JSZip.loadAsync(file);
  
  progress(30, 'Scanning zip contents...');
  const zipEntries: { path: string; entry: JSZip.JSZipObject }[] = [];
  
  zip.forEach((relativePath, entry) => {
    // Strip top-level directory if GitHub-style zipball (which usually nests all files in a folder)
    const normalizedPath = stripTopLevelFolder(relativePath);
    if (!entry.dir && isSupportedCodeFile(normalizedPath)) {
      zipEntries.push({ path: normalizedPath, entry });
    }
  });

  if (zipEntries.length === 0) {
    throw new Error('No supported code files (JS, TS, HTML, CSS, JSON) found inside this zip file.');
  }

  progress(50, `Extracting ${zipEntries.length} files from zip...`);

  const files: RepoFile[] = [];
  let loadedCount = 0;
  let totalSize = 0;

  for (const item of zipEntries) {
    try {
      const content = await item.entry.async('string');
      const size = content.length; // JSZip file metadata size is also available but content.length is exact for text files

      files.push({
        path: item.path,
        name: item.path.split('/').pop() || '',
        content,
        size,
        type: 'file',
      });

      totalSize += size;
    } catch (e) {
      console.warn(`Failed to extract zipped file ${item.path}:`, e);
    } finally {
      loadedCount++;
      const percent = 50 + Math.round((loadedCount / zipEntries.length) * 50);
      progress(percent, `Extracted ${loadedCount}/${zipEntries.length} files...`);
    }
  }

  const metadata: RepositoryMetadata = {
    name: file.name.replace(/\.zip$/i, ''),
    source: 'zip',
    fileCount: files.length,
    totalSize,
  };

  return { files, metadata };
}
