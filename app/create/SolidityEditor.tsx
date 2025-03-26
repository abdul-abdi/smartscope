'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';

// Dynamically import the Monaco Editor with no SSR
const MonacoEditor = dynamic(
  () => import('@monaco-editor/react'),
  { ssr: false }
);

// Theme observer utility
function useDarkModeObserver(callback) {
  useEffect(() => {
    // Function to check if document has dark mode class
    const isDarkMode = () => document.documentElement.classList.contains('dark');
    
    // Initial call
    callback(isDarkMode());
    
    // Set up observer for class changes on html element
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.attributeName === 'class') {
          callback(isDarkMode());
        }
      });
    });
    
    // Start observing
    observer.observe(document.documentElement, { attributes: true });
    
    // Cleanup
    return () => observer.disconnect();
  }, [callback]);
}

// Configure Monaco editor
function configureMonaco(monaco) {
  // Register Solidity language
  monaco.languages.register({ id: 'solidity' });
  
  // Define dark theme with more specific colors
  monaco.editor.defineTheme('solidity-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6A9955' },
      { token: 'keyword', foreground: '569CD6' },
      { token: 'operator', foreground: 'D4D4D4' },
      { token: 'string', foreground: 'CE9178' },
      { token: 'number', foreground: 'B5CEA8' },
      { token: 'type', foreground: '4EC9B0' }
    ],
    colors: {
      'editor.background': '#1E1E1E',
      'editor.foreground': '#D4D4D4',
      'editorLineNumber.foreground': '#858585',
      'editor.selectionBackground': '#264F78',
      'editor.lineHighlightBackground': '#2C2C2C',
      'editorCursor.foreground': '#AEAFAD',
      'editorWhitespace.foreground': '#3B3B3B',
      'editorIndentGuide.background': '#404040',
      'editor.inactiveSelectionBackground': '#3A3D41',
      'editorBracketMatch.border': '#888888',
      'editorGutter.background': '#1E1E1E'
    }
  });

  // Define light theme with more specific colors
  monaco.editor.defineTheme('solidity-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '008000' },
      { token: 'keyword', foreground: '0000FF' },
      { token: 'operator', foreground: '000000' },
      { token: 'string', foreground: 'A31515' },
      { token: 'number', foreground: '098658' },
      { token: 'type', foreground: '267F99' }
    ],
    colors: {
      'editor.background': '#FFFFFF',
      'editor.foreground': '#000000',
      'editorLineNumber.foreground': '#6E6E6E',
      'editor.selectionBackground': '#ADD6FF',
      'editor.lineHighlightBackground': '#F3F3F3',
      'editorCursor.foreground': '#000000',
      'editorWhitespace.foreground': '#E0E0E0',
      'editorIndentGuide.background': '#D3D3D3',
      'editor.inactiveSelectionBackground': '#E5EBF1',
      'editorBracketMatch.border': '#C9C9C9',
      'editorGutter.background': '#F7F7F7'
    }
  });
  
  // Define Solidity language syntax
  monaco.languages.setMonarchTokensProvider('solidity', {
    defaultToken: 'invalid',
    tokenPostfix: '.sol',

    keywords: [
      'abstract', 'address', 'after', 'alias', 'apply', 'auto', 'case', 'catch', 'constant', 'copyof', 'default', 
      'define', 'final', 'immutable', 'implements', 'in', 'inline', 'let', 'macro', 'match', 'mutable', 'null', 
      'of', 'override', 'partial', 'promise', 'reference', 'relocatable', 'sealed', 'sizeof', 'static', 'supports', 
      'switch', 'try', 'type', 'typedef', 'typeof', 'unchecked',
      'bool', 'string', 'uint', 'int', 'bytes', 'byte', 'fixed', 'ufixed',
      'contract', 'interface', 'enum', 'struct', 'mapping',
      'break', 'continue', 'delete', 'else', 'for', 'if', 'new', 'return', 'returns', 'while',
      'private', 'public', 'external', 'internal', 'payable', 'view', 'pure', 'constant', 'anonymous', 'indexed', 'storage', 'memory',
      'function', 'modifier', 'event', 'constructor', 'fallback', 'receive', 'using', 'emit', 'pragma', 'import',
      'assembly', 'assert', 'require', 'revert', 'throw'
    ],

    typeKeywords: [
      'bool', 'int', 'uint', 'uint8', 'uint16', 'uint24', 'uint32', 'uint40', 'uint48', 'uint56', 'uint64', 'uint72', 'uint80', 'uint88', 'uint96', 'uint104', 'uint112', 'uint120', 'uint128', 'uint136', 'uint144', 'uint152', 'uint160', 'uint168', 'uint176', 'uint184', 'uint192', 'uint200', 'uint208', 'uint216', 'uint224', 'uint232', 'uint240', 'uint248', 'uint256',
      'int8', 'int16', 'int24', 'int32', 'int40', 'int48', 'int56', 'int64', 'int72', 'int80', 'int88', 'int96', 'int104', 'int112', 'int120', 'int128', 'int136', 'int144', 'int152', 'int160', 'int168', 'int176', 'int184', 'int192', 'int200', 'int208', 'int216', 'int224', 'int232', 'int240', 'int248', 'int256',
      'bytes1', 'bytes2', 'bytes3', 'bytes4', 'bytes5', 'bytes6', 'bytes7', 'bytes8', 'bytes9', 'bytes10', 'bytes11', 'bytes12', 'bytes13', 'bytes14', 'bytes15', 'bytes16', 'bytes17', 'bytes18', 'bytes19', 'bytes20', 'bytes21', 'bytes22', 'bytes23', 'bytes24', 'bytes25', 'bytes26', 'bytes27', 'bytes28', 'bytes29', 'bytes30', 'bytes31', 'bytes32',
      'bytes', 'string', 'address', 'byte', 'fixed', 'ufixed', 'fixed0x8', 'fixed0x16', 'fixed0x24', 'fixed0x32', 'fixed0x40', 'fixed0x48', 'fixed0x56', 'fixed0x64', 'fixed0x72', 'fixed0x80',
    ],
    
    operators: [
      '=', '>', '<', '!', '~', '?', ':',
      '==', '<=', '>=', '!=', '&&', '||', '++', '--',
      '+', '-', '*', '/', '&', '|', '^', '%', '<<',
      '>>', '+=', '-=', '*=', '/=', '&=', '|=',
      '^=', '%=', '<<=', '>>=', '=>'
    ],

    symbols: /[=><!~?:&|+\-*\/%]+/,
    escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
    integersuffix: /(ll|LL|u|U|l|L)?(ll|LL|u|U|l|L)?/,
    floatsuffix: /[fFlL]?/,

    tokenizer: {
      root: [
        [/[a-zA-Z_]\w*/, {
          cases: {
            '@keywords': { token: 'keyword.$0' },
            '@typeKeywords': { token: 'type.$0' },
            '@default': 'identifier'
          }
        }],
        
        // Whitespace
        { include: '@whitespace' },
        
        // Delimiters and operators
        [/[{}()\[\]]/, '@brackets'],
        [/[<>](?!@symbols)/, '@brackets'],
        [/@symbols/, {
          cases: {
            '@operators': 'operator',
            '@default': ''
          }
        }],
        
        // Numbers
        [/\d*\d+[eE]([\-+]?\d+)?(@floatsuffix)/, 'number.float'],
        [/\d*\.\d+([eE][\-+]?\d+)?(@floatsuffix)/, 'number.float'],
        [/0[xX][0-9a-fA-F']*[0-9a-fA-F](@integersuffix)/, 'number.hex'],
        [/0[bB][0-1']*[0-1](@integersuffix)/, 'number.binary'],
        [/\d[\d']*\d(@integersuffix)/, 'number'],
        [/\d(@integersuffix)/, 'number'],
        
        // Delimiter: after number because of .\d floats
        [/[;,.]/, 'delimiter'],
        
        // Strings
        [/"([^"\\]|\\.)*$/, 'string.invalid'], // non-terminated string
        [/"/, 'string', '@string'],
        
        // Characters
        [/'[^\\']'/, 'string'],
        [/(')(@escapes)(')/, ['string', 'string.escape', 'string']],
        [/'/, 'string.invalid']
      ],
      
      comment: [
        [/[^\/*]+/, 'comment'],
        [/\/\*/, 'comment', '@push'],    // nested comment
        ["\\*/", 'comment', '@pop'],
        [/[\/*]/, 'comment']
      ],
      
      string: [
        [/[^\\"]+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/"/, 'string', '@pop']
      ],
      
      whitespace: [
        [/[ \t\r\n]+/, 'white'],
        [/\/\*/, 'comment', '@comment'],
        [/\/\/.*$/, 'comment'],
      ],
    }
  });

  // Define Solidity language configuration
  monaco.languages.setLanguageConfiguration('solidity', {
    comments: {
      lineComment: '//',
      blockComment: ['/*', '*/']
    },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')'],
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    folding: {
      markers: {
        start: new RegExp('^\\s*//\\s*#?region\\b'),
        end: new RegExp('^\\s*//\\s*#?endregion\\b')
      }
    }
  });
}

// Helper function to find lines with a specific pattern in code
const findLinesWithPattern = (code, pattern) => {
  if (!code) return [];
  
  const lines = code.split('\n');
  const matchingLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) {
      matchingLines.push(i + 1); // 1-indexed line numbers
    }
  }
  
  // Reset the lastIndex property if pattern is a global regex
  if (pattern instanceof RegExp && pattern.global) {
    pattern.lastIndex = 0;
  }
  
  return matchingLines;
};

// SolidityEditor component interface
interface SolidityEditorProps {
  value: string;
  onChange: (value: string) => void;
  validationResults?: {
    errors: string[];
    warnings: string[];
    securityScore?: number;
  } | null;
  lintSolidityCode?: (code: string) => any[];
}

const SolidityEditor: React.FC<SolidityEditorProps> = ({
  value,
  onChange,
  validationResults = null,
  lintSolidityCode = () => [],
}) => {
  const { theme, resolvedTheme } = useTheme();
  const [editorTheme, setEditorTheme] = useState('solidity-light');
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const hasManuallySetTheme = useRef(false);

  // Apply theme directly to editor DOM
  const applyEditorThemingSafely = (isDark) => {
    if (!editorRef.current) return;
    
    try {
      const editorDom = editorRef.current.getDomNode();
      if (!editorDom) return;
      
      // Clean up existing theme classes
      editorDom.classList.remove('monaco-light-theme', 'monaco-dark-theme');
      
      // Apply new theme class
      editorDom.classList.add(isDark ? 'monaco-dark-theme' : 'monaco-light-theme');
      
      // Find and update the background elements directly
      const editorElement = editorDom.querySelector('.monaco-editor');
      const backgroundElement = editorDom.querySelector('.monaco-editor-background');
      const marginElement = editorDom.querySelector('.margin');
      
      if (editorElement) {
        editorElement.style.backgroundColor = isDark ? '#1E1E1E' : '#FFFFFF';
      }
      
      if (backgroundElement) {
        backgroundElement.style.backgroundColor = isDark ? '#1E1E1E' : '#FFFFFF';
      }
      
      if (marginElement) {
        marginElement.style.backgroundColor = isDark ? '#1E1E1E' : '#FFFFFF';
      }
      
      // Force a layout recalculation
      editorRef.current.layout();
    } catch (error) {
      console.error('Error applying editor theme:', error);
    }
  };

  // Update editor decorations based on validation results
  const updateEditorDecorations = useCallback((editor, monaco, results) => {
    if (!editor || !monaco) return;
    
    const errorDecorations = [];
    const warningDecorations = [];
    const infoDecorations = [];
    
    // Process validation errors
    if (results.errors && results.errors.length > 0) {
      const lineRegex = /line\s+(\d+)/i;
      
      results.errors.forEach(error => {
        // Try to extract line number from error message
        const lineMatch = error.match(lineRegex);
        const lineNumber = lineMatch ? parseInt(lineMatch[1]) : null;
        
        if (lineNumber) {
          errorDecorations.push({
            range: new monaco.Range(lineNumber, 1, lineNumber, 1),
            options: {
              isWholeLine: true,
              className: 'error-line-highlight',
              glyphMarginClassName: 'error-glyph-margin',
              hoverMessage: { value: error },
              glyphMarginHoverMessage: { value: error },
              overviewRuler: {
                color: 'red',
                position: monaco.editor.OverviewRulerLane.Right
              }
            }
          });
        } else {
          // If no line number is found, attempt to infer it from the content
          const errorPatterns = [
            { pattern: /pragma\s+solidity/, message: /pragma/i },
            { pattern: /constructor/, message: /constructor/i },
            { pattern: /function\s+\w+/, message: /function/i },
            { pattern: /contract\s+\w+/, message: /contract/i }
          ];
          
          for (const pattern of errorPatterns) {
            if (error.match(pattern.message)) {
              const lines = findLinesWithPattern(value, pattern.pattern);
              lines.forEach(line => {
                errorDecorations.push({
                  range: new monaco.Range(line, 1, line, 1),
                  options: {
                    isWholeLine: true,
                    className: 'error-line-highlight',
                    glyphMarginClassName: 'error-glyph-margin',
                    hoverMessage: { value: error },
                    glyphMarginHoverMessage: { value: error },
                    overviewRuler: {
                      color: 'red',
                      position: monaco.editor.OverviewRulerLane.Right
                    }
                  }
                });
              });
              break;
            }
          }
        }
      });
    }
    
    // Process validation warnings
    if (results.warnings && results.warnings.length > 0) {
      // For warnings, we'll do more specific pattern matching since they may be more structured
      results.warnings.forEach(warning => {
        // Look for patterns like "in line X" or similar
        const lineMatch = warning.match(/(?:in|at|on)\s+line\s+(\d+)/i) || 
                          warning.match(/line\s+(\d+)/i);
        
        const lineNumber = lineMatch ? parseInt(lineMatch[1]) : null;
        
        if (lineNumber) {
          warningDecorations.push({
            range: new monaco.Range(lineNumber, 1, lineNumber, 1),
            options: {
              isWholeLine: true,
              className: 'warning-line-highlight',
              glyphMarginClassName: 'warning-glyph-margin',
              hoverMessage: { value: warning },
              glyphMarginHoverMessage: { value: warning },
              overviewRuler: {
                color: 'yellow',
                position: monaco.editor.OverviewRulerLane.Right
              }
            }
          });
        } else {
          // Some specific warning patterns to detect
          const patterns = [
            { regex: /reentrancy/i, lines: findLinesWithPattern(value, /\.call\{value:/g) },
            { regex: /tx\.origin/i, lines: findLinesWithPattern(value, /tx\.origin/g) },
            { regex: /unbounded loop/i, lines: findLinesWithPattern(value, /for\s*\(/g) },
            { regex: /floating pragma/i, lines: findLinesWithPattern(value, /pragma\s+solidity/g) },
            { regex: /selfdestruct/i, lines: findLinesWithPattern(value, /selfdestruct/g) },
            { regex: /delegatecall/i, lines: findLinesWithPattern(value, /delegatecall/g) },
            { regex: /block\.timestamp/i, lines: findLinesWithPattern(value, /block\.timestamp/g) }
          ];
          
          for (const pattern of patterns) {
            if (pattern.regex.test(warning) && pattern.lines.length > 0) {
              pattern.lines.forEach(lineNumber => {
                warningDecorations.push({
                  range: new monaco.Range(lineNumber, 1, lineNumber, 1),
                  options: {
                    isWholeLine: true,
                    className: 'warning-line-highlight',
                    glyphMarginClassName: 'warning-glyph-margin',
                    hoverMessage: { value: warning },
                    glyphMarginHoverMessage: { value: warning },
                    overviewRuler: {
                      color: 'yellow',
                      position: monaco.editor.OverviewRulerLane.Right
                    }
                  }
                });
              });
            }
          }
        }
      });
    }
    
    // Run linter and add linting decorations
    const lintResults = lintSolidityCode(value);
    
    lintResults.forEach(result => {
      const decoration = {
        range: new monaco.Range(result.lineNumber, 1, result.lineNumber, 1),
        options: {
          isWholeLine: true,
          className: result.severity === 3 ? 'error-line-highlight' : 
                   result.severity === 2 ? 'warning-line-highlight' : 'info-line-highlight',
          hoverMessage: { value: `[Linter] ${result.message}` },
          glyphMarginHoverMessage: { value: `[Linter] ${result.message}` },
          overviewRuler: {
            color: result.severity === 3 ? 'red' : 
                  result.severity === 2 ? 'yellow' : 'blue',
            position: monaco.editor.OverviewRulerLane.Right
          }
        }
      };
      
      if (result.severity === 3) {
        errorDecorations.push(decoration);
      } else if (result.severity === 2) {
        warningDecorations.push(decoration);
      } else {
        infoDecorations.push(decoration);
      }
    });
    
    // Add squiggly lines for errors and warnings
    const errorMarkers = [];
    const warningMarkers = [];
    
    [...errorDecorations, ...warningDecorations, ...infoDecorations].forEach(decoration => {
      const lineNumber = decoration.range.startLineNumber;
      const message = typeof decoration.options.hoverMessage === 'object' ? 
                      decoration.options.hoverMessage.value : 
                      decoration.options.hoverMessage;
      
      const severity = decoration.options.className.includes('error') ? monaco.MarkerSeverity.Error :
                      decoration.options.className.includes('warning') ? monaco.MarkerSeverity.Warning :
                      monaco.MarkerSeverity.Info;
      
      const marker = {
        severity,
        message,
        startLineNumber: lineNumber,
        startColumn: 1,
        endLineNumber: lineNumber,
        endColumn: editor.getModel().getLineMaxColumn(lineNumber)
      };
      
      if (severity === monaco.MarkerSeverity.Error) {
        errorMarkers.push(marker);
      } else if (severity === monaco.MarkerSeverity.Warning) {
        warningMarkers.push(marker);
      }
    });
    
    // Set markers for the editor model
    if (errorMarkers.length > 0 || warningMarkers.length > 0) {
      monaco.editor.setModelMarkers(
        editor.getModel(),
        'validation',
        [...errorMarkers, ...warningMarkers]
      );
    } else {
      monaco.editor.setModelMarkers(editor.getModel(), 'validation', []);
    }
    
    // Apply decorations to the editor
    editor.deltaDecorations([], [...errorDecorations, ...warningDecorations, ...infoDecorations]);
  }, [value, lintSolidityCode]);

  // Observer for dark mode changes
  useDarkModeObserver((isDark) => {
    if (editorRef.current && monacoRef.current && !hasManuallySetTheme.current) {
      const newTheme = isDark ? 'solidity-dark' : 'solidity-light';
      setEditorTheme(newTheme);
      monacoRef.current.editor.setTheme(newTheme);
      
      // Apply direct DOM styling
      applyEditorThemingSafely(isDark);
    }
  });

  // Apply theme changes from theme context
  useEffect(() => {
    if (monacoRef.current && editorRef.current) {
      const newTheme = resolvedTheme === 'dark' ? 'solidity-dark' : 'solidity-light';
      
      // Set our internal state
      setEditorTheme(newTheme);
      
      // Apply the theme through Monaco API
      monacoRef.current.editor.setTheme(newTheme);
      
      // Directly apply DOM styling
      applyEditorThemingSafely(resolvedTheme === 'dark');
      
      // Let the observer know we manually set the theme
      hasManuallySetTheme.current = true;
      
      // Reset the manual flag after some time to allow the observer to take over again
      const timer = setTimeout(() => {
        hasManuallySetTheme.current = false;
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [resolvedTheme, theme]);

  // Apply theme changes when editorTheme changes
  useEffect(() => {
    if (monacoRef.current && editorRef.current) {
      // Apply the theme directly through Monaco
      monacoRef.current.editor.setTheme(editorTheme);
      
      // Apply DOM styling
      applyEditorThemingSafely(editorTheme === 'solidity-dark');
    }
  }, [editorTheme]);

  // Update decorations when validation results change
  useEffect(() => {
    if (validationResults && editorRef.current && monacoRef.current) {
      updateEditorDecorations(editorRef.current, monacoRef.current, validationResults);
    }
  }, [validationResults, updateEditorDecorations]);

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '400px' }}>
      {MonacoEditor && (
        <MonacoEditor
          value={value}
          language="solidity"
          theme={editorTheme}
          options={{
            selectOnLineNumbers: true,
            roundedSelection: false,
            readOnly: false,
            cursorStyle: "line",
            automaticLayout: true,
            minimap: { enabled: true },
            folding: true,
            lineNumbers: "on",
            renderLineHighlight: "all",
            scrollBeyondLastLine: true,
            glyphMargin: true,
            fontSize: 14,
            fontFamily: "Menlo, Monaco, 'Courier New', monospace",
            scrollbar: {
              useShadows: false,
              verticalHasArrows: true,
              horizontalHasArrows: true,
              vertical: "visible",
              horizontal: "visible",
              verticalScrollbarSize: 12,
              horizontalScrollbarSize: 12,
              alwaysConsumeMouseWheel: false
            }
          }}
          onChange={(value) => onChange(value || "")}
          beforeMount={(monaco) => {
            configureMonaco(monaco);
          }}
          onMount={(editor, monaco) => {
            editorRef.current = editor;
            monacoRef.current = monaco;
            
            // Initial theme application
            const isDark = resolvedTheme === 'dark' || document.documentElement.classList.contains('dark');
            const initialTheme = isDark ? 'solidity-dark' : 'solidity-light';
            
            // Set our state
            setEditorTheme(initialTheme);
            
            // Apply through Monaco API
            monaco.editor.setTheme(initialTheme);
            
            // Apply direct DOM styling
            applyEditorThemingSafely(isDark);
            
            // Force a layout refresh with a small delay
            setTimeout(() => {
              editor.layout();
            }, 50);
            
            // Get the editor's DOM node to add wheel event handling
            const editorDomNode = editor.getDomNode();
            if (editorDomNode) {
              // Add wheel event listener to detect boundaries and allow page scrolling
              editorDomNode.addEventListener('wheel', (e) => {
                const editorScrollable = editorDomNode.querySelector('.monaco-scrollable-element');
                if (!editorScrollable) return;
                
                const { scrollTop, scrollHeight, clientHeight } = editorScrollable;
                const isAtTop = scrollTop === 0;
                const isAtBottom = scrollTop + clientHeight >= scrollHeight - 5; // Small buffer for rounding errors
                
                // If at top and scrolling up or at bottom and scrolling down, don't stop propagation
                if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
                  // Allow the event to propagate to the page
                  return;
                }
                
                // Otherwise, prevent the event from propagating to avoid double scrolling
                e.stopPropagation();
              }, { passive: true });
            }
            
            // If there are validation results, update decorations
            if (validationResults) {
              updateEditorDecorations(
                editor, 
                monaco, 
                validationResults
              );
            }
          }}
        />
      )}
    </div>
  );
};

export default SolidityEditor; 