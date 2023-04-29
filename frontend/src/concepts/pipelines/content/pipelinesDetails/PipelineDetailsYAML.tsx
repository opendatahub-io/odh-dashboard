import * as React from 'react';
import { CodeEditor, Language } from '@patternfly/react-code-editor';
import YAML from 'yaml';
import { EmptyState, EmptyStateBody, EmptyStateIcon, Title } from '@patternfly/react-core';
import ExclamationCircleIcon from '@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon';

type PipelineDetailsYAMLProps = {
  filename?: string;
  content?: Record<string, unknown> | null;
};

const PipelineDetailsYAML: React.FC<PipelineDetailsYAMLProps> = ({ filename, content }) => {
  if (!content) {
    return (
      <EmptyState>
        <EmptyStateIcon icon={ExclamationCircleIcon} />
        <Title headingLevel="h2" size="lg">
          Error with the run
        </Title>
        <EmptyStateBody>There was an issue trying to render the YAML information.</EmptyStateBody>
      </EmptyState>
    );
  }

  const pipelineYAML = YAML.stringify(content);

  return (
    <CodeEditor
      code={pipelineYAML}
      // TODO: PF doesn't want to expand into the space
      height="400px"
      downloadFileName={filename ?? 'Pipeline content'}
      isDownloadEnabled
      isCopyEnabled
      isLanguageLabelVisible
      language={Language.yaml}
    />
  );
};

export default PipelineDetailsYAML;
