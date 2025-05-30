import * as React from 'react';
import { Language } from '@patternfly/react-code-editor';
import YAML from 'yaml';
import { EmptyState, EmptyStateBody } from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon';
import DashboardCodeEditor from '#~/concepts/dashboard/codeEditor/DashboardCodeEditor';
import PipelineVersionError from './PipelineVersionError';

type PipelineDetailsYAMLProps = {
  filename?: string;
  content?: Record<string, unknown> | null;
  versionError?: Error;
};

const PipelineDetailsYAML: React.FC<PipelineDetailsYAMLProps> = ({
  versionError,
  filename,
  content,
}) => {
  if (versionError) {
    return (
      <PipelineVersionError
        title="Pipeline spec unavailable"
        description="The pipeline version that this pipeline spec belongs to has been deleted."
        testId="pipeline-spec-error-state"
      />
    );
  }

  if (!content) {
    return (
      <EmptyState headingLevel="h2" icon={ExclamationCircleIcon} titleText="Error with the run">
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
      codeEditorHeight="100%"
    />
  );
};

export default PipelineDetailsYAML;
