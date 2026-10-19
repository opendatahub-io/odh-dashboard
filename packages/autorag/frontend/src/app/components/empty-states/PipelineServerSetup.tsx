import { PipelineServerSetup as SharedPipelineServerSetup } from '@odh-dashboard/autox-core/ui/components/feature';
import { pipelinesBaseRoute } from '@odh-dashboard/internal/routes/pipelines/global';
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
  <SharedPipelineServerSetup {...props} config={config} />
);

export default PipelineServerSetup;
