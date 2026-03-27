/* eslint-disable camelcase */
import { buildMockRunKF } from '#~/__mocks__/mockRunKF';
import { buildMockRecurringRunKF } from '#~/__mocks__/mockRecurringRunKF';
import { PluginStateKF } from '#~/concepts/pipelines/kfTypes';
import {
  filterByMlflowExperiment,
  getMlflowExperimentNameFromRun,
} from '#~/concepts/pipelines/content/tables/pipelineRun/utils';

describe('getMlflowExperimentNameFromRun', () => {
  it('should return the experiment name from plugins_output when available', () => {
    const run = buildMockRunKF({
      plugins_output: {
        mlflow: {
          entries: { experiment_name: { value: 'Output Experiment' } },
          state: PluginStateKF.PLUGIN_SUCCEEDED,
        },
      },
    });
    expect(getMlflowExperimentNameFromRun(run)).toBe('Output Experiment');
  });

  it('should prefer plugins_output over plugins_input', () => {
    const run = buildMockRunKF({
      plugins_input: { mlflow: { experiment_name: 'Input Experiment' } },
      plugins_output: {
        mlflow: {
          entries: { experiment_name: { value: 'Output Experiment' } },
          state: PluginStateKF.PLUGIN_SUCCEEDED,
        },
      },
    });
    expect(getMlflowExperimentNameFromRun(run)).toBe('Output Experiment');
  });

  it('should fall back to plugins_input when plugins_output has no experiment name', () => {
    const run = buildMockRunKF({
      plugins_input: { mlflow: { experiment_name: 'Input Experiment' } },
      plugins_output: {
        mlflow: {
          entries: {},
          state: PluginStateKF.PLUGIN_SUCCEEDED,
        },
      },
    });
    expect(getMlflowExperimentNameFromRun(run)).toBe('Input Experiment');
  });

  it('should return the experiment name from plugins_input for a pipeline run', () => {
    const run = buildMockRunKF({
      plugins_input: { mlflow: { experiment_name: 'Input Experiment' } },
    });
    expect(getMlflowExperimentNameFromRun(run)).toBe('Input Experiment');
  });

  it('should return the experiment name from plugins_input for a recurring run', () => {
    const recurringRun = buildMockRecurringRunKF({
      plugins_input: { mlflow: { experiment_name: 'Recurring Experiment' } },
    });
    expect(getMlflowExperimentNameFromRun(recurringRun)).toBe('Recurring Experiment');
  });

  it('should return undefined when no mlflow data is present', () => {
    const run = buildMockRunKF({});
    expect(getMlflowExperimentNameFromRun(run)).toBeUndefined();
  });

  it('should return undefined when plugins_input has no mlflow key', () => {
    const run = buildMockRunKF({ plugins_input: {} });
    expect(getMlflowExperimentNameFromRun(run)).toBeUndefined();
  });

  it('should return undefined for a recurring run with no mlflow data', () => {
    const recurringRun = buildMockRecurringRunKF({});
    expect(getMlflowExperimentNameFromRun(recurringRun)).toBeUndefined();
  });

  it('should trim whitespace from the experiment name', () => {
    const run = buildMockRunKF({
      plugins_input: { mlflow: { experiment_name: '  Padded Name  ' } },
    });
    expect(getMlflowExperimentNameFromRun(run)).toBe('Padded Name');
  });

  it('should return undefined when the experiment name is only whitespace', () => {
    const run = buildMockRunKF({
      plugins_input: { mlflow: { experiment_name: '   ' } },
    });
    expect(getMlflowExperimentNameFromRun(run)).toBeUndefined();
  });

  it('should return undefined when the experiment name is an empty string', () => {
    const run = buildMockRunKF({
      plugins_input: { mlflow: { experiment_name: '' } },
    });
    expect(getMlflowExperimentNameFromRun(run)).toBeUndefined();
  });
});

describe('filterByMlflowExperiment', () => {
  const runs = [
    buildMockRunKF({
      display_name: 'Run A',
      run_id: 'a',
      plugins_input: { mlflow: { experiment_name: 'training-exp' } },
    }),
    buildMockRunKF({
      display_name: 'Run B',
      run_id: 'b',
      plugins_input: { mlflow: { experiment_name: 'eval-exp' } },
    }),
    buildMockRunKF({ display_name: 'Run C', run_id: 'c' }),
  ];

  it('should return all runs when the filter is undefined', () => {
    expect(filterByMlflowExperiment(runs, undefined)).toEqual(runs);
  });

  it('should return all runs when the filter is an empty string', () => {
    expect(filterByMlflowExperiment(runs, '')).toEqual(runs);
  });

  it('should filter runs by exact mlflow experiment name', () => {
    const result = filterByMlflowExperiment(runs, 'training-exp');
    expect(result).toHaveLength(1);
    expect(result[0].run_id).toBe('a');
  });

  it('should not match partial experiment names', () => {
    const result = filterByMlflowExperiment(runs, 'training');
    expect(result).toHaveLength(0);
  });

  it('should match case-insensitively', () => {
    const result = filterByMlflowExperiment(runs, 'EVAL-EXP');
    expect(result).toHaveLength(1);
    expect(result[0].run_id).toBe('b');
  });

  it('should exclude runs with no mlflow experiment name', () => {
    const result = filterByMlflowExperiment(runs, 'training-exp');
    expect(result).toHaveLength(1);
    expect(result.map((r) => r.run_id)).toEqual(['a']);
  });

  it('should return an empty array when no runs match', () => {
    expect(filterByMlflowExperiment(runs, 'nonexistent')).toEqual([]);
  });

  it('should work with recurring runs', () => {
    const recurringRuns = [
      buildMockRecurringRunKF({
        display_name: 'Schedule A',
        recurring_run_id: 'sa',
        plugins_input: { mlflow: { experiment_name: 'scheduled-exp' } },
      }),
      buildMockRecurringRunKF({ display_name: 'Schedule B', recurring_run_id: 'sb' }),
    ];
    const result = filterByMlflowExperiment(recurringRuns, 'scheduled-exp');
    expect(result).toHaveLength(1);
    expect(result[0].recurring_run_id).toBe('sa');
  });
});
