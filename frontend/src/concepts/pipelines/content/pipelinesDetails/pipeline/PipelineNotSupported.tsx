import * as React from 'react';
import { EmptyState, EmptyStateBody } from '@patternfly/react-core';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';
import { PIPELINE_ARGO_ERROR } from '#~/concepts/pipelines/content/const';

const PipelineNotSupported: React.FC = () => (
  <EmptyState headingLevel="h4" icon={ExclamationTriangleIcon} titleText={PIPELINE_ARGO_ERROR}>
    <EmptyStateBody>
      The selected pipeline was created using the Kubeflow v1 SDK, which is not supported by this
      UI.
      <br />
      Select a pipeline that was created or recompiled using the Kubeflow v2 SDK.
    </EmptyStateBody>
  </EmptyState>
);

export default PipelineNotSupported;
