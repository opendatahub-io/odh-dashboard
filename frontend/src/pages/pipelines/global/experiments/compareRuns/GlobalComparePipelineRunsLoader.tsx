import * as React from 'react';
import { CompareRunsContextProvider } from '#~/concepts/pipelines/content/compareRuns/CompareRunsContext';
import {
  ExperimentCoreDetails,
  GlobalPipelineCoreDetailsProps,
  PipelineRunCoreDetails,
} from '#~/pages/pipelines/global/GlobalPipelineCoreDetails';
import PipelineRunExperimentsContextProvider from '#~/pages/pipelines/global/runs/PipelineRunExperimentsContext';
import PipelineRunVersionsContextProvider from '#~/pages/pipelines/global/runs/PipelineRunVersionsContext';

export const GlobalComparePipelineRunsLoader: React.FC<
  Pick<GlobalPipelineCoreDetailsProps, 'BreadcrumbDetailsComponent'>
> = (props) => (
  <CompareRunsContextProvider>
    <PipelineRunExperimentsContextProvider>
      <PipelineRunVersionsContextProvider>
        <PipelineRunCoreDetails {...props} />
      </PipelineRunVersionsContextProvider>
    </PipelineRunExperimentsContextProvider>
  </CompareRunsContextProvider>
);

export const ExperimentComparePipelineRunsLoader: React.FC<
  Pick<GlobalPipelineCoreDetailsProps, 'BreadcrumbDetailsComponent'>
> = (props) => (
  <CompareRunsContextProvider>
    <PipelineRunVersionsContextProvider>
      <ExperimentCoreDetails {...props} />
    </PipelineRunVersionsContextProvider>
  </CompareRunsContextProvider>
);

export const GlobalManagePipelineRunsLoader: React.FC<
  Pick<GlobalPipelineCoreDetailsProps, 'BreadcrumbDetailsComponent'>
> = (props) => (
  <PipelineRunExperimentsContextProvider>
    <PipelineRunVersionsContextProvider>
      <PipelineRunCoreDetails {...props} />
    </PipelineRunVersionsContextProvider>
  </PipelineRunExperimentsContextProvider>
);

export const ExperimentManagePipelineRunsLoader: React.FC<
  Pick<GlobalPipelineCoreDetailsProps, 'BreadcrumbDetailsComponent'>
> = (props) => (
  <PipelineRunVersionsContextProvider>
    <ExperimentCoreDetails {...props} />
  </PipelineRunVersionsContextProvider>
);
