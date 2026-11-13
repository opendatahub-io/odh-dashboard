import React from 'react';
import { CodeEditor, type CodeEditorProps } from '@patternfly/react-code-editor';
import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

loader.config({ monaco });
// Match DashboardCodeEditor so a host-provided PatternFly editor also finds local Monaco.
Object.assign(window, { monaco });

type EvalHubCodeEditorProps = Omit<
  CodeEditorProps,
  'ref' | 'code' | 'onChange' | 'onEditorDidMount'
> & {
  code: string;
  onChange: (value: string) => void;
  /** 1-based line to highlight as the source of a parse error. */
  errorLine?: number;
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
 *
 * errorLine marks the offending line with a gutter bar and a tinted line
 * background, matching the line number in the parse error message.
 */
const EvalHubCodeEditor: React.FC<EvalHubCodeEditorProps> = ({
  code,
  onChange,
  errorLine,
  options,
  ...props
}) => {
  const decorationsRef = React.useRef<monaco.editor.IEditorDecorationsCollection | null>(null);

  const applyErrorDecoration = React.useCallback((line: number | undefined) => {
    const decorations = decorationsRef.current;
    if (!decorations) {
      return;
    }
    if (line == null || line < 1) {
      decorations.clear();
      return;
    }
    decorations.set([
      {
        range: new monaco.Range(line, 1, line, 1),
        options: {
          isWholeLine: true,
          className: 'evalhub-code-editor__error-line',
          linesDecorationsClassName: 'evalhub-code-editor__error-line-gutter',
        },
      },
    ]);
  }, []);

  React.useEffect(() => {
    applyErrorDecoration(errorLine);
  }, [applyErrorDecoration, errorLine, code]);

  return (
    <CodeEditor
      code={code}
      isLineNumbersVisible
      isCopyEnabled
      options={{ automaticLayout: true, scrollBeyondLastLine: false, ...options }}
      onChange={(value) => onChange(value)}
      onEditorDidMount={(editor) => {
        decorationsRef.current = editor.createDecorationsCollection([]);
        // The effect above may have run before the collection existed.
        applyErrorDecoration(errorLine);
      }}
      {...props}
    />
  );
};

export default EvalHubCodeEditor;
