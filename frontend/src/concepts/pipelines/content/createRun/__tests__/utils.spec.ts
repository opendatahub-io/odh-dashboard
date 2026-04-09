import { MlflowExperimentMode } from '#~/concepts/pipelines/content/createRun/types';
import { getMlflowExperimentName } from '#~/concepts/pipelines/content/createRun/utils';

describe('getMlflowExperimentName', () => {
  it('returns undefined when tracking is disabled', () => {
    expect(getMlflowExperimentName({ isExperimentTrackingEnabled: false })).toBeUndefined();
  });

  it('returns the existing experiment name in EXISTING mode', () => {
    expect(
      getMlflowExperimentName({
        isExperimentTrackingEnabled: true,
        mode: MlflowExperimentMode.EXISTING,
        existingExperimentName: 'my-experiment',
      }),
    ).toBe('my-experiment');
  });

  it('returns the new experiment name in NEW mode', () => {
    expect(
      getMlflowExperimentName({
        isExperimentTrackingEnabled: true,
        mode: MlflowExperimentMode.NEW,
        newExperimentName: 'brand-new',
      }),
    ).toBe('brand-new');
  });

  it('trims whitespace from the experiment name', () => {
    expect(
      getMlflowExperimentName({
        isExperimentTrackingEnabled: true,
        mode: MlflowExperimentMode.NEW,
        newExperimentName: '  padded  ',
      }),
    ).toBe('padded');
  });

  it('returns undefined when the name is only whitespace', () => {
    expect(
      getMlflowExperimentName({
        isExperimentTrackingEnabled: true,
        mode: MlflowExperimentMode.NEW,
        newExperimentName: '   ',
      }),
    ).toBeUndefined();
  });

  it('returns undefined when the existing name is empty', () => {
    expect(
      getMlflowExperimentName({
        isExperimentTrackingEnabled: true,
        mode: MlflowExperimentMode.EXISTING,
        existingExperimentName: '',
      }),
    ).toBeUndefined();
  });

  it('returns undefined when the new name is empty', () => {
    expect(
      getMlflowExperimentName({
        isExperimentTrackingEnabled: true,
        mode: MlflowExperimentMode.NEW,
        newExperimentName: '',
      }),
    ).toBeUndefined();
  });
});
