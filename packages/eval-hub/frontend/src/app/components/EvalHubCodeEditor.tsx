import React from 'react';
import { CodeEditor, type CodeEditorProps } from '@patternfly/react-code-editor';
import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

loader.config({ monaco });
// Match DashboardCodeEditor so a host-provided PatternFly editor also finds local Monaco.
Object.assign(window, { monaco });

export type CodeEditorDiagnostic = {
  message: string;
  severity: 'error' | 'warning';
  /** 1-based line the diagnostic anchors to. */
  line: number;
};

type EvalHubCodeEditorProps = Omit<
  CodeEditorProps,
  'ref' | 'code' | 'onChange' | 'onEditorDidMount'
> & {
  code: string;
  onChange: (value: string) => void;
  /**
   * Diagnostics rendered as Monaco markers — squiggles, margin icons, and
   * hover messages — for line-addressable errors and warnings.
   */
  diagnostics?: CodeEditorDiagnostic[];
};

/**
 * PatternFly code editor backed by a locally bundled Monaco, so no editor
 * assets are fetched from a CDN (disconnected-environment requirement).
 * automaticLayout keeps the editor measuring correctly while the modal it
 * lives in animates open and resizes.
 *
 * scrollBeyondLastLine is off so Monaco does not reserve a viewport of empty
 * scroll space below the last line, which would render a scrollbar for
 * definitions that already fit the editor.
 */
const EvalHubCodeEditor: React.FC<EvalHubCodeEditorProps> = ({
  code,
  onChange,
  diagnostics = [],
  options,
  ...props
}) => {
  const editorRef = React.useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  const applyDiagnostics = React.useCallback((list: CodeEditorDiagnostic[]) => {
    const model = editorRef.current?.getModel();
    if (!model) {
      return;
    }
    monaco.editor.setModelMarkers(
      model,
      'evalhub-import',
      list.map((diagnostic) => {
        const lineCount = model.getLineCount();
        const lineNumber = Math.min(Math.max(diagnostic.line, 1), lineCount);
        return {
          message: diagnostic.message,
          severity:
            diagnostic.severity === 'error'
              ? monaco.MarkerSeverity.Error
              : monaco.MarkerSeverity.Warning,
          startLineNumber: lineNumber,
          startColumn: 1,
          endLineNumber: lineNumber,
          endColumn: model.getLineContent(lineNumber).length + 1,
        };
      }),
    );
  }, []);

  React.useEffect(() => {
    applyDiagnostics(diagnostics);
  }, [applyDiagnostics, diagnostics, code]);

  return (
    <CodeEditor
      code={code}
      isLineNumbersVisible
      isCopyEnabled
      options={{ automaticLayout: true, scrollBeyondLastLine: false, ...options }}
      onChange={(value) => onChange(value)}
      onEditorDidMount={(editor) => {
        editorRef.current = editor;
        // The effect above may have run before the editor existed.
        applyDiagnostics(diagnostics);
      }}
      {...props}
    />
  );
};

export default EvalHubCodeEditor;
