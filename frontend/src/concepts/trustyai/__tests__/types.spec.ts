import { TrustyInstallState } from '@odh-dashboard/k8s-core/trustyai';
import { TRUSTY_CR_NOT_AVAILABLE_STATES } from '#~/concepts/trustyai/types';

describe('TRUSTY_CR_NOT_AVAILABLE_STATES', () => {
  it('should contain the expected install states', () => {
    expect(TRUSTY_CR_NOT_AVAILABLE_STATES).toEqual([
      TrustyInstallState.UNINSTALLED,
      TrustyInstallState.LOADING_INITIAL_STATE,
    ]);
  });
});
