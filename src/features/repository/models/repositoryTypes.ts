export interface RepoFile {
  path: string;
  name: string;
  content: string;
  size: number;
  type: 'file';
  // Parsed metadata added during AST extraction
  imports?: ParsedImport[];
  exports?: ParsedExport[];
  classes?: ParsedClass[];
  functions?: ParsedFunction[];
  lineCount?: number;
}

export interface RepoDirectory {
  path: string;
  name: string;
  type: 'directory';
  children: (RepoFile | RepoDirectory)[];
}

import type { ParsedImport, ParsedExport, ParsedClass, ParsedFunction } from '../../analysis/parser/parserTypes';


export type RepositorySource = 'github' | 'local' | 'zip' | 'sample';

export interface RepositoryMetadata {
  name: string;
  owner?: string;
  branch?: string;
  source: RepositorySource;
  fileCount: number;
  totalSize: number;
}

export interface LoaderState {
  status: 'idle' | 'loading' | 'parsing' | 'success' | 'error';
  message: string;
  progress: number; // 0 to 100
}
