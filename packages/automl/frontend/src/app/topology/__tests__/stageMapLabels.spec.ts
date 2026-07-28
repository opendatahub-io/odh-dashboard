import { resolveStageLabel, resolveStepLabel } from '~/app/topology/stageMapLabels';

describe('resolveStageLabel', () => {
  it('returns mapped display names for known stage IDs', () => {
    expect(resolveStageLabel('model_selection')).toBe('Model selection');
    expect(resolveStageLabel('build_leaderboard')).toBe('Build leaderboard');
  });

  it('falls back for unknown stage IDs', () => {
    expect(resolveStageLabel('some_unknown_stage')).toBe('Some unknown stage');
  });

  it('ignores inherited prototype keys and falls back', () => {
    expect(resolveStageLabel('toString')).toBe('ToString');
    expect(resolveStageLabel('constructor')).toBe('Constructor');
  });
});

describe('resolveStepLabel', () => {
  it('returns mapped display names for known step IDs', () => {
    expect(resolveStepLabel('feature_engineering')).toBe('Feature engineering');
    expect(resolveStepLabel('model_training')).toBe('Model training');
  });

  it('falls back for unknown step IDs', () => {
    expect(resolveStepLabel('some_custom_step')).toBe('Some custom step');
  });

  it('ignores inherited prototype keys and falls back', () => {
    expect(resolveStepLabel('toString')).toBe('ToString');
    expect(resolveStepLabel('constructor')).toBe('Constructor');
  });
});
