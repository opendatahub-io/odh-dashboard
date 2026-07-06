import * as React from 'react';
import { CodeEditor, Language } from '@patternfly/react-code-editor';
import YAML from 'yaml';

type ConfigYAMLEditorProps = {
  code: string;
  onCodeChange: (code: string) => void;
  name?: string;
  displayName?: string;
  description?: string;
  topologyType?: string;
  topologyTypeLabel?: string;
};

const sanitizeStaticFields = (
  code: string,
  fields: {
    name?: string;
    displayName?: string;
    description?: string;
    topologyType?: string;
  },
): string => {
  if (!code) {
    return code;
  }
  try {
    const doc = YAML.parseDocument(code);
    if (fields.name) {
      doc.setIn(['metadata', 'name'], fields.name);
    }
    if (fields.displayName) {
      doc.setIn(['metadata', 'annotations', 'openshift.io/display-name'], fields.displayName);
    }
    if (fields.description !== undefined) {
      doc.setIn(['metadata', 'annotations', 'openshift.io/description'], fields.description);
    }
    if (fields.topologyType) {
      doc.setIn(['metadata', 'labels', 'opendatahub.io/config-type'], fields.topologyType);
    }
    return doc.toString();
  } catch {
    return code;
  }
};

const ConfigYAMLEditor: React.FC<ConfigYAMLEditorProps> = ({
  code,
  onCodeChange,
  name,
  displayName,
  description,
  topologyType,
  topologyTypeLabel,
}) => {
  const sanitizedCode = sanitizeStaticFields(code, {
    name,
    displayName,
    description,
    topologyType,
  });

  return (
    <div data-testid="config-yaml-editor" style={{ minHeight: '400px', height: '100%' }}>
      <CodeEditor
        code={sanitizedCode}
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
};

export default ConfigYAMLEditor;
