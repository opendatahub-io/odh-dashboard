import * as React from 'react';
import { CodeEditor, Language } from '@patternfly/react-code-editor';

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
  <div data-testid="config-yaml-editor">
    <CodeEditor
      code={code}
      isUploadEnabled
      isLanguageLabelVisible
      language={Language.yaml}
      height="400px"
      emptyStateTitle={`Add a ${topologyTypeLabel || 'topology'} configuration`}
      emptyStateBody="Drag a file here, upload files, or start from scratch."
      emptyStateButton="Upload files"
      onCodeChange={onCodeChange}
      options={{ tabSize: 2 }}
    />
  </div>
);

export default ConfigYAMLEditor;
