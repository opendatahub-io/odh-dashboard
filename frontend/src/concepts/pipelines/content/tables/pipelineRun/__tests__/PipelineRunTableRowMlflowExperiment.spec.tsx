import * as React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PluginStateKF } from '#~/concepts/pipelines/kfTypes';
import { buildMockRunKF } from '#~/__mocks__/mockRunKF';
import PipelineRunTableRowMlflowExperiment from '#~/concepts/pipelines/content/tables/pipelineRun/PipelineRunTableRowMlflowExperiment';

jest.mock('#~/concepts/pipelines/context/PipelinesContext', () => ({
  usePipelinesAPI: jest.fn(() => ({
    namespace: 'test-namespace',
  })),
}));

describe('PipelineRunTableRowMlflowExperiment', () => {
  it('renders a linked experiment name from plugins_output', () => {
    render(
      <BrowserRouter>
        <PipelineRunTableRowMlflowExperiment
          run={buildMockRunKF({
            // eslint-disable-next-line camelcase
            plugins_output: {
              mlflow: {
                entries: {
                  // eslint-disable-next-line camelcase
                  experiment_name: { value: 'Exp 1' },
                  // eslint-disable-next-line camelcase
                  experiment_id: { value: 'exp-id-1' },
                },
                state: PluginStateKF.PLUGIN_SUCCEEDED,
              },
            },
          })}
          mlflow={{ isAvailable: true, experiments: [], loaded: true }}
        />
      </BrowserRouter>,
    );

    expect(screen.getByRole('link', { name: 'Exp 1' })).toHaveAttribute(
      'href',
      '/develop-train/mlflow/experiments/exp-id-1?workspace=test-namespace',
    );
  });

  it('renders the experiment name using a looked-up experiment id when plugins_output is unavailable', () => {
    render(
      <BrowserRouter>
        <PipelineRunTableRowMlflowExperiment
          run={buildMockRunKF({
            // eslint-disable-next-line camelcase
            plugins_input: {
              mlflow: {
                // eslint-disable-next-line camelcase
                experiment_name: 'Exp from input',
              },
            },
          })}
          mlflow={{
            isAvailable: true,
            experiments: [{ id: 'exp-id-from-lookup', name: 'Exp from input', lastUpdateTime: '' }],
            loaded: true,
          }}
        />
      </BrowserRouter>,
    );

    expect(screen.getByRole('link', { name: 'Exp from input' })).toHaveAttribute(
      'href',
      '/develop-train/mlflow/experiments/exp-id-from-lookup?workspace=test-namespace',
    );
  });

  it('renders the experiment name as plain text when no experiment id is available', () => {
    render(
      <BrowserRouter>
        <PipelineRunTableRowMlflowExperiment
          run={buildMockRunKF({
            // eslint-disable-next-line camelcase
            plugins_input: {
              mlflow: {
                // eslint-disable-next-line camelcase
                experiment_name: 'Exp from input',
              },
            },
          })}
          mlflow={{ isAvailable: true, experiments: [], loaded: true }}
        />
      </BrowserRouter>,
    );

    expect(screen.getByText('Exp from input')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Exp from input' })).not.toBeInTheDocument();
  });

  it('renders empty content when the run has no mlflow data', () => {
    render(
      <BrowserRouter>
        <PipelineRunTableRowMlflowExperiment
          run={buildMockRunKF({})}
          mlflow={{ isAvailable: true, experiments: [], loaded: true }}
        />
      </BrowserRouter>,
    );

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('renders a skeleton while experiments are loading', () => {
    render(
      <BrowserRouter>
        <PipelineRunTableRowMlflowExperiment
          run={buildMockRunKF({
            // eslint-disable-next-line camelcase
            plugins_input: {
              mlflow: {
                // eslint-disable-next-line camelcase
                experiment_name: 'Loading Exp',
              },
            },
          })}
          mlflow={{ isAvailable: true, experiments: [], loaded: false }}
        />
      </BrowserRouter>,
    );

    expect(screen.getByTestId('mlflow-experiment-loading')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
