import * as React from 'react';
import { CodeEditor, Language } from '@patternfly/react-code-editor';
import YAML from 'yaml';
import { PipelineRunKind } from '~/k8sTypes';

type PipelineDetailsYAMLProps = {
  pipelineRun?: PipelineRunKind | null;
};

const PipelineDetailsYAML: React.FC<PipelineDetailsYAMLProps> = ({ pipelineRun }) => {
  if (!pipelineRun) {
    return null;
  }

  const pipelineYAML = YAML.stringify(pipelineRun);

  return (
    <CodeEditor
      code={pipelineYAML}
      height="400px" // TODO: PF doesn't want to expand into the space
      downloadFileName={`Pipeline ${pipelineRun.metadata.name}`}
      isDownloadEnabled
      isCopyEnabled
      isLanguageLabelVisible
      language={Language.yaml}
    />
  );
};

export default PipelineDetailsYAML;
