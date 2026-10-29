import { renderHook } from '@testing-library/react';
import { mockDeploymentWizardState } from '../../../../__tests__/mockUtils';
import { useDeployMethod } from '../useDeployMethod';
import { useWizardFieldApply } from '../../useWizardFieldApply';
import { useWizardFieldPreDeploy } from '../useWizardFieldPreDeploy';
import { useWizardFieldPostDeploy } from '../useWizardFieldPostDeploy';
import { useModelDeploymentSubmit } from '../useModelDeploymentSubmit';

jest.mock('@odh-dashboard/plugin-core');
jest.mock('../useDeployMethod');
jest.mock('../../useWizardFieldApply');
jest.mock('../useWizardFieldPreDeploy');
jest.mock('../useWizardFieldPostDeploy');
jest.mock('../../../../shared/tracking/useModelDeployedTracking', () => ({
  useModelDeployedTracking: () => ({ fireModelDeployedTracking: jest.fn() }),
}));

const configureReadiness = (pending?: string) => {
  jest.mocked(useDeployMethod).mockReturnValue({
    deployMethodLoaded: pending !== 'method',
    deployMethodErrors: [],
    deployMethod: {
      properties: { platform: 'llmd-serving', supportsOverwrite: true },
    } as NonNullable<ReturnType<typeof useDeployMethod>['deployMethod']>,
  });
  jest.mocked(useWizardFieldApply).mockReturnValue({
    applyAllFieldDataFn: jest.fn(),
    applyExtensionsLoaded: pending !== 'apply',
    applyExtensionErrors: [],
  });
  jest.mocked(useWizardFieldPreDeploy).mockReturnValue({
    runPreDeploy: jest.fn(),
    preDeployExtensionsLoaded: pending !== 'preDeploy',
  });
  jest.mocked(useWizardFieldPostDeploy).mockReturnValue({
    runPostDeploy: jest.fn(),
    postDeployExtensionsLoaded: pending !== 'postDeploy',
    postDeployExtensionErrors: [],
  });
};

const renderSubmit = () =>
  renderHook(() =>
    useModelDeploymentSubmit(
      mockDeploymentWizardState().state,
      { modelLocationData: { data: undefined } },
      {},
      { isAllValid: true } as Parameters<typeof useModelDeploymentSubmit>[3],
      {},
      jest.fn(),
      'yaml-edit',
    ),
  );

describe('useModelDeploymentSubmit readiness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    configureReadiness();
  });

  it('should be ready when the method and all extensions are resolved', () => {
    expect(renderSubmit().result.current.isReady).toBe(true);
  });

  it('should not be ready without an inferred deployment method', () => {
    jest.mocked(useDeployMethod).mockReturnValue({
      deployMethodLoaded: true,
      deployMethodErrors: [],
    });
    expect(renderSubmit().result.current.isReady).toBe(false);
  });

  it.each(['method', 'apply', 'preDeploy', 'postDeploy'])(
    'should become ready only after %s finishes loading',
    (pending) => {
      configureReadiness(pending);
      const { result, rerender } = renderSubmit();
      expect(result.current.isReady).toBe(false);
      configureReadiness();
      rerender();
      expect(result.current.isReady).toBe(true);
    },
  );
});
