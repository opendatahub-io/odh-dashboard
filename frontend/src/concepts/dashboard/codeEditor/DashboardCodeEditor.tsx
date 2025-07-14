import * as React from 'react';
import { CodeEditor, CodeEditorProps } from '@patternfly/react-code-editor';
import * as monaco from 'monaco-editor';
import { loader } from '@monaco-editor/react';

import './DashboardCodeEditor.scss';
import { useThemeContext } from '#~/app/ThemeContext';

loader.config({ monaco });

type DashboardCodeEditorProps = Omit<CodeEditorProps, 'ref'> & {
  testId?: string;
  codeEditorHeight?: string;
};

const DashboardCodeEditor: React.FC<Partial<DashboardCodeEditorProps>> = ({
  // 38px is the code editor toolbar height+border
  // calculate the div height to avoid container scrolling
  height = 'calc(100% - 38px)',
  codeEditorHeight = '400px',
  ...props
}) => {
  const { theme } = useThemeContext();
  return (
    <div data-testid={props.testId} style={{ height, padding: '14px' }}>
      <CodeEditor
        height={codeEditorHeight}
        className="odh-dashboard__code-editor"
        isDarkTheme={theme === 'dark'}
        {...props}
      />
    </div>
  );
};

export default DashboardCodeEditor;
