import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdvancedStep from '../AdvancedStep';
import { DEFAULT_FEATURE_STORE_FORM_DATA } from '../../useCreateFeatureStoreProjectState';
import {
  AuthzType,
  FeatureStoreFormData,
  ScalingMode,
  PersistenceType,
  RegistryType,
} from '../../types';

jest.mock('@odh-dashboard/ui-core/components/SimpleSelect', () => {
  const MockSimpleSelect: React.FC<{
    dataTestId?: string;
    value?: string;
    onChange: (val: string) => void;
    placeholder?: string;
    options?: { key: string; label: string }[];
  }> = ({ dataTestId, value, onChange, placeholder, options }) => (
    <select
      data-testid={dataTestId}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={placeholder}
    >
      <option value="">{placeholder}</option>
      {options?.map((opt) => (
        <option key={opt.key} value={opt.key}>
          {opt.label}
        </option>
      ))}
    </select>
  );
  return MockSimpleSelect;
});

jest.mock('@odh-dashboard/ui-core/components/NumberInputWrapper', () => {
  const MockNumberInput: React.FC<{
    'data-testid'?: string;
    value: number;
    onChange: (val: number) => void;
    min?: number;
  }> = (props) => (
    <input
      data-testid={props['data-testid']}
      type="number"
      value={props.value}
      onChange={(e) => props.onChange(Number(e.target.value))}
      min={props.min}
    />
  );
  return MockNumberInput;
});

const renderStep = (overrides: Partial<FeatureStoreFormData> = {}) => {
  const data = { ...DEFAULT_FEATURE_STORE_FORM_DATA, ...overrides };
  const setData = jest.fn();
  render(
    <AdvancedStep
      data={data}
      setData={setData}
      namespaceSecrets={['oidc-secret', 'other-secret']}
      namespaceConfigMaps={['batch-config']}
    />,
  );
  return { data, setData };
};

describe('AdvancedStep', () => {
  it('renders all expandable sections', () => {
    renderStep();
    expect(screen.getByText('Authorization')).toBeInTheDocument();
    expect(screen.getByText('Scaling')).toBeInTheDocument();
    expect(screen.getByText('Cron job')).toBeInTheDocument();
    expect(screen.getByText('Batch compute engine')).toBeInTheDocument();
    expect(screen.getByText('Miscellaneous')).toBeInTheDocument();
  });

  describe('Authorization', () => {
    it('renders three auth type radios', () => {
      renderStep({ authzType: AuthzType.NONE });
      expect(screen.getByLabelText('No authorization')).toBeInTheDocument();
      expect(screen.getByLabelText('Kubernetes RBAC')).toBeInTheDocument();
      expect(screen.getByLabelText('OIDC')).toBeInTheDocument();
    });

    it.each([
      [AuthzType.NONE, 'OIDC', AuthzType.OIDC, 'authzType', AuthzType.OIDC],
      [AuthzType.OIDC, 'No authorization', AuthzType.NONE, 'authzType', AuthzType.NONE],
      [AuthzType.NONE, 'Kubernetes RBAC', AuthzType.KUBERNETES, 'authzType', AuthzType.KUBERNETES],
    ] as [AuthzType, string, AuthzType, string, AuthzType][])(
      'calls setData when switching from %s to %s',
      async (initial, label, _, expectedKey, expectedVal) => {
        const user = userEvent.setup();
        const { setData } = renderStep({ authzType: initial });
        await user.click(screen.getByLabelText(label));
        expect(setData).toHaveBeenCalledWith(expectedKey, expectedVal);
      },
    );

    it('clears authz when switching to No authorization', async () => {
      const user = userEvent.setup();
      const { setData } = renderStep({ authzType: AuthzType.OIDC });
      await user.click(screen.getByLabelText('No authorization'));
      expect(setData).toHaveBeenCalledWith('authz', undefined);
    });

    it('sets kubernetes roles when switching to Kubernetes RBAC', async () => {
      const user = userEvent.setup();
      const { setData } = renderStep({ authzType: AuthzType.NONE });
      await user.click(screen.getByLabelText('Kubernetes RBAC'));
      expect(setData).toHaveBeenCalledWith(
        'authz',
        expect.objectContaining({ kubernetes: { roles: [] }, oidc: undefined }),
      );
    });

    it('shows OIDC secret dropdown only when OIDC is selected', () => {
      renderStep({ authzType: AuthzType.OIDC });
      expect(screen.getByTestId('authz-oidc-secret')).toBeInTheDocument();
    });

    it('hides OIDC secret for non-OIDC types', () => {
      renderStep({ authzType: AuthzType.KUBERNETES });
      expect(screen.queryByTestId('authz-oidc-secret')).not.toBeInTheDocument();
    });

    it('calls setData when OIDC secret changes', () => {
      const { setData } = renderStep({ authzType: AuthzType.OIDC });
      fireEvent.change(screen.getByTestId('authz-oidc-secret'), {
        target: { value: 'oidc-secret' },
      });
      expect(setData).toHaveBeenCalledWith(
        'authz',
        expect.objectContaining({ oidc: { secretRef: { name: 'oidc-secret' } } }),
      );
    });
  });

  describe('Scaling', () => {
    it('renders scaling toggle and enables it', async () => {
      const user = userEvent.setup();
      const { setData } = renderStep();
      expect(screen.getByTestId('scaling-toggle')).toBeInTheDocument();
      await user.click(screen.getByTestId('scaling-toggle'));
      expect(setData).toHaveBeenCalledWith('scalingEnabled', true);
    });

    it('shows scaling mode radios when enabled', () => {
      renderStep({ scalingEnabled: true });
      expect(screen.getByLabelText('Static replica count')).toBeInTheDocument();
      expect(screen.getByLabelText('Horizontal Pod Autoscaler (HPA)')).toBeInTheDocument();
    });

    it.each([
      [ScalingMode.STATIC, 'Horizontal Pod Autoscaler (HPA)', ScalingMode.HPA],
      [ScalingMode.HPA, 'Static replica count', ScalingMode.STATIC],
    ] as [ScalingMode, string, ScalingMode][])(
      'switches scaling mode from %s via clicking "%s"',
      async (initial, label, expected) => {
        const user = userEvent.setup();
        const { setData } = renderStep({ scalingEnabled: true, scalingMode: initial });
        await user.click(screen.getByLabelText(label));
        expect(setData).toHaveBeenCalledWith('scalingMode', expected);
      },
    );

    it('shows and updates replicas input for static mode', () => {
      const { setData } = renderStep({ scalingEnabled: true, scalingMode: ScalingMode.STATIC });
      expect(screen.getByTestId('scaling-replicas')).toBeInTheDocument();
      fireEvent.change(screen.getByTestId('scaling-replicas'), { target: { value: '5' } });
      expect(setData).toHaveBeenCalledWith('replicas', 5);
    });

    it('clamps replicas to a minimum of 1', () => {
      const { setData } = renderStep({ scalingEnabled: true, scalingMode: ScalingMode.STATIC });
      fireEvent.change(screen.getByTestId('scaling-replicas'), { target: { value: '0' } });
      expect(setData).toHaveBeenCalledWith('replicas', 1);
    });

    it.each([
      ['min', 'scaling-hpa-min', 'hpaMinReplicas'],
      ['max', 'scaling-hpa-max', 'hpaMaxReplicas'],
    ])('shows and updates HPA %s replicas', (_, testId, expectedKey) => {
      const { setData } = renderStep({ scalingEnabled: true, scalingMode: ScalingMode.HPA });
      expect(screen.getByTestId(testId)).toBeInTheDocument();
      fireEvent.change(screen.getByTestId(testId), { target: { value: '5' } });
      expect(setData).toHaveBeenCalledWith(expectedKey, 5);
    });

    it.each([
      ['min', 'scaling-hpa-min', 'hpaMinReplicas'],
      ['max', 'scaling-hpa-max', 'hpaMaxReplicas'],
    ])('clamps HPA %s replicas to a minimum of 1', (_, testId, expectedKey) => {
      const { setData } = renderStep({ scalingEnabled: true, scalingMode: ScalingMode.HPA });
      fireEvent.change(screen.getByTestId(testId), { target: { value: '0' } });
      expect(setData).toHaveBeenCalledWith(expectedKey, 1);
    });

    it('shows file persistence warning when multi-replica with file persistence', () => {
      renderStep({
        scalingEnabled: true,
        scalingMode: ScalingMode.STATIC,
        replicas: 3,
        onlinePersistenceType: PersistenceType.FILE,
      });
      expect(screen.getByTestId('scaling-persistence-warning')).toBeInTheDocument();
    });

    it('does not show warning when DB persistence is used with remote registry', () => {
      renderStep({
        scalingEnabled: true,
        scalingMode: ScalingMode.STATIC,
        replicas: 3,
        onlinePersistenceType: PersistenceType.DB,
        registryType: RegistryType.REMOTE,
      });
      expect(screen.queryByTestId('scaling-persistence-warning')).not.toBeInTheDocument();
    });
  });

  describe('Cron job', () => {
    it('renders all cron job inputs', () => {
      renderStep();
      expect(screen.getByPlaceholderText('0 */6 * * *')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('UTC')).toBeInTheDocument();
      expect(screen.getByTestId('cronjob-concurrency')).toBeInTheDocument();
      expect(screen.getByTestId('cronjob-success-limit')).toBeInTheDocument();
      expect(screen.getByTestId('cronjob-fail-limit')).toBeInTheDocument();
    });

    it.each([
      ['schedule', '0 */6 * * *', '*/5 * * * *', { schedule: '*/5 * * * *' }],
      ['timezone', 'UTC', 'America/New_York', { timeZone: 'America/New_York' }],
    ])(
      'calls setData when %s changes via placeholder "%s"',
      (_, placeholder, value, expectedPatch) => {
        const { setData } = renderStep({ cronJob: { schedule: '0 */6 * * *' } });
        fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value } });
        expect(setData).toHaveBeenCalledWith('cronJob', expect.objectContaining(expectedPatch));
      },
    );

    it.each([
      ['success history limit', 'cronjob-success-limit', 'successfulJobsHistoryLimit'],
      ['failure history limit', 'cronjob-fail-limit', 'failedJobsHistoryLimit'],
    ])('calls setData when %s changes', (_, testId, expectedKey) => {
      const { setData } = renderStep({ cronJob: { schedule: '0 */6 * * *' } });
      fireEvent.change(screen.getByTestId(testId), { target: { value: '5' } });
      expect(setData).toHaveBeenCalledWith(
        'cronJob',
        expect.objectContaining({ [expectedKey]: expect.any(Number) }),
      );
    });

    it('calls setData when concurrency policy changes', () => {
      const { setData } = renderStep({ cronJob: { schedule: '0 */6 * * *' } });
      fireEvent.change(screen.getByTestId('cronjob-concurrency'), {
        target: { value: 'Forbid' },
      });
      expect(setData).toHaveBeenCalledWith(
        'cronJob',
        expect.objectContaining({ concurrencyPolicy: 'Forbid' }),
      );
    });

    it('clears schedule when schedule input is emptied', () => {
      const { setData } = renderStep({ cronJob: { schedule: '*/5 * * * *' } });
      fireEvent.change(screen.getByPlaceholderText('0 */6 * * *'), { target: { value: '' } });
      expect(setData).toHaveBeenCalledWith(
        'cronJob',
        expect.objectContaining({ schedule: undefined }),
      );
    });

    it('retains dependent-field edits made before a schedule is entered', () => {
      const { setData } = renderStep();
      fireEvent.change(screen.getByPlaceholderText('UTC'), { target: { value: 'US/Eastern' } });
      expect(setData).toHaveBeenCalledWith(
        'cronJob',
        expect.objectContaining({ timeZone: 'US/Eastern' }),
      );
    });
  });

  describe('Batch engine', () => {
    it.each([
      ['on', {}, true],
      ['off', { batchEngineEnabled: true }, false],
    ] as [string, Partial<FeatureStoreFormData>, boolean][])(
      'toggles batch engine %s',
      async (_, overrides, expectedVal) => {
        const user = userEvent.setup();
        const { setData } = renderStep(overrides);
        await user.click(screen.getByTestId('batch-engine-toggle'));
        expect(setData).toHaveBeenCalledWith('batchEngineEnabled', expectedVal);
      },
    );

    it('shows and updates ConfigMap fields when enabled', () => {
      const { setData } = renderStep({ batchEngineEnabled: true });
      expect(screen.getByTestId('batch-engine-configmap')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('config.yaml')).toBeInTheDocument();

      fireEvent.change(screen.getByTestId('batch-engine-configmap'), {
        target: { value: 'batch-config' },
      });
      expect(setData).toHaveBeenCalledWith('batchEngineConfigMapName', 'batch-config');

      setData.mockClear();
      fireEvent.change(screen.getByPlaceholderText('config.yaml'), {
        target: { value: 'custom.yaml' },
      });
      expect(setData).toHaveBeenCalledWith('batchEngineConfigMapKey', 'custom.yaml');
    });
  });

  describe('Miscellaneous', () => {
    it('renders all misc toggles', () => {
      renderStep();
      expect(screen.getByTestId('misc-init-containers')).toBeInTheDocument();
      expect(screen.getByTestId('misc-feast-apply')).toBeInTheDocument();
      expect(screen.getByTestId('misc-pdb')).toBeInTheDocument();
    });

    it.each([
      ['PDB on', {}, 'misc-pdb', 'services', { podDisruptionBudgets: { minAvailable: 1 } }],
      [
        'PDB off',
        { services: { podDisruptionBudgets: { minAvailable: 1 } } },
        'misc-pdb',
        'services',
        { podDisruptionBudgets: undefined },
      ],
      [
        'init containers on',
        {},
        'misc-init-containers',
        'services',
        { disableInitContainers: true },
      ],
      [
        'init containers off',
        { services: { disableInitContainers: true } },
        'misc-init-containers',
        'services',
        { disableInitContainers: undefined },
      ],
      ['feast apply off', {}, 'misc-feast-apply', 'services', { runFeastApplyOnInit: false }],
    ] as [string, Partial<FeatureStoreFormData>, string, string, Record<string, unknown>][])(
      'calls setData when toggling %s',
      async (_, overrides, testId, expectedKey, expectedVal) => {
        const user = userEvent.setup();
        const { setData } = renderStep(overrides);
        await user.click(screen.getByTestId(testId));
        expect(setData).toHaveBeenCalledWith(expectedKey, expect.objectContaining(expectedVal));
      },
    );
  });
});
