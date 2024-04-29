import * as React from 'react';
import { Language } from '@patternfly/react-code-editor';
import YAML from 'yaml';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateHeader,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon';
import DashboardCodeEditor from '~/concepts/dashboard/codeEditor/DashboardCodeEditor';

type PipelineDetailsYAMLProps = {
  filename?: string;
  content?: Record<string, unknown> | null;
};

const PipelineDetailsYAML: React.FC<PipelineDetailsYAMLProps> = ({ filename, content }) => {
  if (!content) {
    return (
      <EmptyState>
        <EmptyStateHeader
          titleText="Error with the run"
          icon={<EmptyStateIcon icon={ExclamationCircleIcon} />}
          headingLevel="h2"
        />
        <EmptyStateBody>There was an issue trying to render the YAML information.</EmptyStateBody>
      </EmptyState>
    );
  }

  const pipelineYAML = YAML.stringify(content);

  return (
    <DashboardCodeEditor
      testId="pipeline-dashboard-code-editor"
      code={pipelineYAML}
      downloadFileName={filename ?? 'Pipeline content'}
      isDownloadEnabled
      isCopyEnabled
      isLanguageLabelVisible
      language={Language.yaml}
      isReadOnly
    />
  );
};

export default PipelineDetailsYAML;
