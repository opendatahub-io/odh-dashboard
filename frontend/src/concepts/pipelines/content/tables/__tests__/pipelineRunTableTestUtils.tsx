import * as React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import { ExperimentContext } from '#~/pages/pipelines/global/experiments/ExperimentContext';
import { PipelineRunExperimentsContext } from '#~/pages/pipelines/global/runs/PipelineRunExperimentsContext';
import { PipelineRunVersionsContext } from '#~/pages/pipelines/global/runs/PipelineRunVersionsContext';

export const renderWithRunContext = (ui: React.ReactElement): ReturnType<typeof render> =>
  render(
    <BrowserRouter>
      <ExperimentContext.Provider value={{ experiment: null, basePath: '' }}>
        <PipelineRunExperimentsContext.Provider
          value={{ experiments: [], loaded: true, error: undefined }}
        >
          <PipelineRunVersionsContext.Provider
            value={{ versions: [], loaded: true, error: undefined }}
          >
            {ui}
          </PipelineRunVersionsContext.Provider>
        </PipelineRunExperimentsContext.Provider>
      </ExperimentContext.Provider>
    </BrowserRouter>,
  );

export const getMlflowMocks = (): {
  useIsMlflowPipelinesAvailable: { default: jest.Mock };
  useMlflowExperiments: { default: jest.Mock };
} => ({
  useIsMlflowPipelinesAvailable: jest.requireMock(
    '#~/concepts/mlflow/hooks/useIsMlflowPipelinesAvailable',
  ) as { default: jest.Mock },
  useMlflowExperiments: jest.requireMock('#~/concepts/mlflow/hooks/useMlflowExperiments') as {
    default: jest.Mock;
  },
});

export const setupMlflowMocks = (): {
  useIsMlflowPipelinesAvailable: { default: jest.Mock };
  useMlflowExperiments: { default: jest.Mock };
} => {
  const { useIsMlflowPipelinesAvailable, useMlflowExperiments } = getMlflowMocks();
  useIsMlflowPipelinesAvailable.default.mockReturnValue({
    available: false,
    loaded: true,
    error: undefined,
  });
  useMlflowExperiments.default.mockReturnValue({
    data: [],
    loaded: true,
  });
  return { useIsMlflowPipelinesAvailable, useMlflowExperiments };
};
