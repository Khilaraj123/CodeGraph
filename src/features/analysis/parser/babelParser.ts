import { parse } from '@babel/parser';
import type { FileParseResult, ParsedImport, ParsedExport, ParsedClass, ParsedFunction } from './parserTypes';

/**
 * Traverses an AST tree recursively and calls the callback for each node.
 */
function traverseAst(node: any, callback: (node: any) => void) {
  if (!node || typeof node !== 'object') return;

  callback(node);

  for (const key in node) {
    if (Object.prototype.hasOwnProperty.call(node, key)) {
      const child = node[key];
      if (Array.isArray(child)) {
        for (const item of child) {
          traverseAst(item, callback);
        }
      } else if (child && typeof child === 'object') {
        traverseAst(child, callback);
      }
    }
  }
}

/**
 * Parses Javascript/TypeScript code in the browser and extracts structural metadata.
 */
export function parseCode(code: string, filepath: string): FileParseResult {
  const imports: ParsedImport[] = [];
  const exports: ParsedExport[] = [];
  const classes: ParsedClass[] = [];
  const functions: ParsedFunction[] = [];
  const lineCount = code.split(/\r?\n/).length;

  try {
    const isTS = filepath.endsWith('.ts') || filepath.endsWith('.tsx');
    const isJSX = filepath.endsWith('.jsx') || filepath.endsWith('.tsx');

    const plugins: any[] = [
      'classProperties',
      'decorators-legacy',
      'dynamicImport',
      'exportDefaultFrom',
      'optionalChaining',
      'nullishCoalescingOperator',
    ];

    if (isTS) plugins.push('typescript');
    if (isJSX) plugins.push('jsx');

    const ast = parse(code, {
      sourceType: 'module',
      plugins,
      allowImportExportEverywhere: true,
    });

    traverseAst(ast, (node) => {
      // 1. Static Imports
      if (node.type === 'ImportDeclaration') {
        const source = node.source.value;
        const specifiers = node.specifiers.map((spec: any) => {
          let type: 'default' | 'named' | 'namespace' | 'side-effect' = 'named';
          let imported: string | undefined;

          if (spec.type === 'ImportDefaultSpecifier') {
            type = 'default';
          } else if (spec.type === 'ImportNamespaceSpecifier') {
            type = 'namespace';
          } else if (spec.type === 'ImportSpecifier') {
            type = 'named';
            imported = spec.imported.type === 'Identifier' 
              ? spec.imported.name 
              : spec.imported.value;
          }

          return {
            local: spec.local.name,
            imported,
            type,
          };
        });

        // If no specifiers, it's a side-effect import (e.g. import 'styles.css')
        if (specifiers.length === 0) {
          specifiers.push({
            local: '',
            type: 'side-effect',
          });
        }

        imports.push({
          source,
          specifiers,
          isDynamic: false,
          line: node.loc?.start.line,
        });
      }

      // 2. Dynamic Imports / require() calls
      if (
        node.type === 'CallExpression' &&
        node.callee.type === 'Import' &&
        node.arguments.length > 0 &&
        node.arguments[0].type === 'StringLiteral'
      ) {
        imports.push({
          source: node.arguments[0].value,
          specifiers: [{ local: '', type: 'side-effect' }],
          isDynamic: true,
          line: node.loc?.start.line,
        });
      }

      if (
        node.type === 'CallExpression' &&
        node.callee.type === 'Identifier' &&
        node.callee.name === 'require' &&
        node.arguments.length > 0 &&
        node.arguments[0].type === 'StringLiteral'
      ) {
        imports.push({
          source: node.arguments[0].value,
          specifiers: [{ local: '', type: 'side-effect' }],
          isDynamic: true,
          line: node.loc?.start.line,
        });
      }

      // 3. Exports
      if (node.type === 'ExportDefaultDeclaration') {
        exports.push({
          name: 'default',
          type: 'default',
          line: node.loc?.start.line,
        });
      }

      if (node.type === 'ExportNamedDeclaration') {
        if (node.declaration) {
          const decl = node.declaration;
          if (decl.type === 'VariableDeclaration') {
            for (const d of decl.declarations) {
              if (d.id.type === 'Identifier') {
                exports.push({
                  name: d.id.name,
                  type: 'named',
                  line: node.loc?.start.line,
                });
              }
            }
          } else if (decl.type === 'FunctionDeclaration' && decl.id) {
            exports.push({
              name: decl.id.name,
              type: 'named',
              line: node.loc?.start.line,
            });
          } else if (decl.type === 'ClassDeclaration' && decl.id) {
            exports.push({
              name: decl.id.name,
              type: 'named',
              line: node.loc?.start.line,
            });
          }
        }

        if (node.specifiers) {
          for (const spec of node.specifiers) {
            exports.push({
              name: spec.exported.type === 'Identifier' ? spec.exported.name : spec.exported.value,
              type: 'named',
              line: node.loc?.start.line,
            });
          }
        }
      }

      // 4. Classes
      if (node.type === 'ClassDeclaration' && node.id) {
        const className = node.id.name;
        let superClass: string | undefined;

        if (node.superClass) {
          if (node.superClass.type === 'Identifier') {
            superClass = node.superClass.name;
          } else if (node.superClass.type === 'MemberExpression') {
            const obj = node.superClass.object.name || '';
            const prop = node.superClass.property.name || '';
            superClass = `${obj}.${prop}`;
          }
        }

        const methods: string[] = [];
        if (node.body && node.body.body) {
          for (const member of node.body.body) {
            if (member.type === 'ClassMethod' && member.key.type === 'Identifier') {
              methods.push(member.key.name);
            }
          }
        }

        classes.push({
          name: className,
          superClass,
          methods,
          lineStart: node.loc?.start.line || 0,
          lineEnd: node.loc?.end.line || 0,
        });
      }

      // 5. Functions
      if (node.type === 'FunctionDeclaration' && node.id) {
        functions.push({
          name: node.id.name,
          isAsync: !!node.async,
          lineStart: node.loc?.start.line || 0,
          lineEnd: node.loc?.end.line || 0,
        });
      }

      if (node.type === 'VariableDeclarator' && node.init) {
        const init = node.init;
        const name = node.id.type === 'Identifier' ? node.id.name : '';
        if (name && (init.type === 'FunctionExpression' || init.type === 'ArrowFunctionExpression')) {
          functions.push({
            name,
            isAsync: !!init.async,
            lineStart: node.loc?.start.line || 0,
            lineEnd: node.loc?.end.line || 0,
          });
        }
      }
    });
  } catch (error) {
    console.warn(`Error parsing file ${filepath}:`, error);
    // Return empty results on parse failure, allowing the app to proceed gracefully
  }

  return {
    path: filepath,
    imports,
    exports,
    classes,
    functions,
    lineCount,
  };
}
