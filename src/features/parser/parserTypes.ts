export interface ParsedImportSpecifier {
  local: string;       // Local variable name used in code
  imported?: string;   // Original imported name (undefined for default import)
  type: 'default' | 'named' | 'namespace' | 'side-effect';
}

export interface ParsedImport {
  source: string;        // E.g., "./components/Button" or "react"
  resolvedPath?: string; // Resolved path in workspace, or undefined for third-party packages
  specifiers: ParsedImportSpecifier[];
  isDynamic: boolean;
  line?: number;
}

export interface ParsedExport {
  name: string;          // Name of the exported binding
  type: 'default' | 'named';
  line?: number;
}

export interface ParsedClass {
  name: string;
  superClass?: string;   // Name of inherited class if any
  methods: string[];     // Names of methods defined
  lineStart: number;
  lineEnd: number;
}

export interface ParsedFunction {
  name: string;
  isAsync: boolean;
  lineStart: number;
  lineEnd: number;
}

export interface FileParseResult {
  path: string;
  imports: ParsedImport[];
  exports: ParsedExport[];
  classes: ParsedClass[];
  functions: ParsedFunction[];
  lineCount: number;
}
