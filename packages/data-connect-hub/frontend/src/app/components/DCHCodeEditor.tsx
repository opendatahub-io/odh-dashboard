import React from 'react';
import { CodeEditor, Language } from '@patternfly/react-code-editor';
import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

loader.config({ monaco });
// Match DashboardCodeEditor so a host-provided PatternFly editor also finds local Monaco.
Object.assign(window, { monaco });

type DCHCodeEditorProps = {
  code: string;
  example: 'python' | 'rest';
  isDarkTheme: boolean;
};

const DCHCodeEditor: React.FC<DCHCodeEditorProps> = ({ code, example, isDarkTheme }) => (
  <CodeEditor
    code={code}
    language={example === 'python' ? Language.python : Language.shell}
    isReadOnly
    isCopyEnabled
    isLanguageLabelVisible
    isDarkTheme={isDarkTheme}
    height="400px"
  />
);

export default DCHCodeEditor;
