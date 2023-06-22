import * as React from 'react';
import { CodeEditor, CodeEditorProps } from '@patternfly/react-code-editor';

import './DashboardCodeEditor.scss';

type DashboardCodeEditorProps = Omit<CodeEditorProps, 'ref'>;

const DashboardCodeEditor: React.FC<Partial<DashboardCodeEditorProps>> = ({
  // 38px is the code editor toolbar height+border
  // calculate the div height to avoid container scrolling
  height = 'calc(100% - 38px)',
  ...props
}) => (
  <div style={{ height }}>
    <CodeEditor height="100%" className="odh-dashboard__code-editor" {...props} />
  </div>
);

export default DashboardCodeEditor;
