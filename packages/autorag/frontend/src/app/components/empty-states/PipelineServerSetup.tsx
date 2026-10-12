import { PipelineServerSetup as SharedPipelineServerSetup } from '@odh-dashboard/autox-core/ui/components/feature';
import { pipelinesBaseRoute } from '@odh-dashboard/internal/routes/pipelines/global';
import { Alert } from '@patternfly/react-core';
import * as React from 'react';
import {
  shouldShowManagedPipelinesMissing,
  shouldShowNoDSPAEmptyState,
  shouldShowPipelineServerNotReady,
} from '~/app/utilities/pipelineServerEmptyState';

const config = {
  productName: 'AutoRAG',
  detailsRoute: pipelinesBaseRoute,
  isTransientError: (error: unknown) =>
    shouldShowNoDSPAEmptyState(error) ||
    shouldShowManagedPipelinesMissing(error) ||
    shouldShowPipelineServerNotReady(error),
};

type PipelineServerSetupProps = React.ComponentProps<typeof SharedPipelineServerSetup>;

const PipelineServerSetup: React.FC<Omit<PipelineServerSetupProps, 'config'>> = (props) => (
  <>
    {props.mode === 'enable' ? (
      <Alert
        variant="warning"
        isInline
        title="AutoRAG managed pipelines are not available"
        data-testid="autorag-managed-pipelines-prerequisite"
      >
        <p>
          Enable the managed AutoRAG pipelines on the Pipeline Server in this project before
          creating a run.
        </p>
      </Alert>
    ) : null}
    <SharedPipelineServerSetup {...props} config={config} />
  </>
);

export default PipelineServerSetup;
