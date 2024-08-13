import * as React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateHeader,
} from '@patternfly/react-core';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';
import { PIPELINE_ARGO_ERROR } from '~/concepts/pipelines/content/const';

const PipelineNotSupported: React.FC = () => (
  <EmptyState>
    <EmptyStateHeader
      titleText={PIPELINE_ARGO_ERROR}
      icon={
        <EmptyStateIcon
          color="var(--pf-v5-global--warning-color--100)"
          icon={ExclamationTriangleIcon}
        />
      }
      headingLevel="h4"
    />
    <EmptyStateBody>
      The selected pipeline was created using the Kubeflow v1 SDK, which is not supported by this
      UI.
      <br />
      Select a pipeline that was created or recompiled using the Kubeflow v2 SDK.
    </EmptyStateBody>
  </EmptyState>
);

export default PipelineNotSupported;
