import * as React from 'react';
import { CodeEditor, Language } from '@patternfly/react-code-editor';

type ConfigYAMLEditorProps = {
  value: string;
  onChange: (value: string) => void;
  isReadOnly?: boolean;
};

const ConfigYAMLEditor: React.FC<ConfigYAMLEditorProps> = ({ value, onChange, isReadOnly }) => (
  <div data-testid="config-yaml-editor">
    <CodeEditor
      code={value}
      onChange={(val) => onChange(val)}
      language={Language.yaml}
      isReadOnly={isReadOnly}
      isCopyEnabled
      isLanguageLabelVisible
      height="400px"
      options={{ tabSize: 2 }}
    />
  </div>
);

export default ConfigYAMLEditor;
