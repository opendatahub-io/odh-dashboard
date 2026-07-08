import * as React from 'react';
import { Language } from '@patternfly/react-code-editor';

const DashboardCodeEditor = React.lazy(
  () => import('@odh-dashboard/internal/concepts/dashboard/codeEditor/DashboardCodeEditor'),
);

type ConfigYAMLEditorProps = {
  code: string;
  onCodeChange: (code: string) => void;
  topologyTypeLabel?: string;
};

const ConfigYAMLEditor: React.FC<ConfigYAMLEditorProps> = ({
  code,
  onCodeChange,
  topologyTypeLabel,
}) => (
  <React.Suspense fallback={null}>
    <DashboardCodeEditor
      testId="config-yaml-editor"
      code={code}
      isUploadEnabled
      isLanguageLabelVisible
      language={Language.yaml}
      emptyStateTitle={`Add a ${topologyTypeLabel || 'topology'} configuration`}
      emptyStateBody="Drag a file here, upload files, or start from scratch."
      emptyStateButton="Upload files"
      onCodeChange={onCodeChange}
      options={{ tabSize: 2 }}
    />
  </React.Suspense>
);

export default ConfigYAMLEditor;
