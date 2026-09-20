import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StoreConfigStep from '../StoreConfigStep';
import { DEFAULT_FEATURE_STORE_FORM_DATA } from '../../useCreateFeatureStoreProjectState';
import { FeatureStoreFormData, PersistenceType } from '../../types';

jest.mock('../ServerConfigSection', () => {
  const MockServerConfigSection: React.FC<{ title: string; idPrefix: string }> = ({
    title,
    idPrefix,
  }) => <div data-testid={`mock-server-config-${idPrefix}`}>{title}</div>;
  return MockServerConfigSection;
});

jest.mock('../PvcConfigSection', () => {
  const MockPvcConfigSection: React.FC<{ idPrefix: string }> = ({ idPrefix }) => (
    <div data-testid={`mock-pvc-config-${idPrefix}`}>PVC Config</div>
  );
  return MockPvcConfigSection;
});

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

const renderStep = (overrides: Partial<FeatureStoreFormData> = {}) => {
  const data = { ...DEFAULT_FEATURE_STORE_FORM_DATA, ...overrides };
  const setData = jest.fn();
  render(
    <StoreConfigStep data={data} setData={setData} namespaceSecrets={['secret-a', 'secret-b']} />,
  );
  return { data, setData };
};

describe('StoreConfigStep', () => {
  it('renders default state with online store, offline toggle, and server config', () => {
    renderStep();
    expect(screen.getByText('Online store')).toBeInTheDocument();
    expect(screen.getByText('Offline store')).toBeInTheDocument();
    expect(screen.getByLabelText('File')).toBeInTheDocument();
    expect(screen.getByLabelText('Database')).toBeInTheDocument();
    expect(screen.getByTestId('offline-store-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('mock-server-config-online-store-server')).toBeInTheDocument();
    expect(screen.getByTestId('mock-pvc-config-online-store')).toBeInTheDocument();
  });

  it('calls setData when offline store toggle changes', async () => {
    const user = userEvent.setup();
    const { setData } = renderStep();
    await user.click(screen.getByTestId('offline-store-toggle'));
    expect(setData).toHaveBeenCalledWith('offlineStoreEnabled', true);
  });

  it('does not render offline sections when toggle is off', () => {
    renderStep({ offlineStoreEnabled: false });
    expect(screen.queryByTestId('mock-server-config-offline-store-server')).not.toBeInTheDocument();
    expect(screen.queryByTestId('offline-store-cred-secret')).not.toBeInTheDocument();
  });

  it('shows offline store config with PVC, credentials, file type, and server config when enabled', () => {
    renderStep({ offlineStoreEnabled: true, offlinePersistenceType: PersistenceType.FILE });
    expect(screen.getByText('Offline store server configuration')).toBeInTheDocument();
    expect(screen.getByTestId('mock-server-config-offline-store-server')).toBeInTheDocument();
    expect(screen.getByTestId('mock-pvc-config-offline-store')).toBeInTheDocument();
    expect(screen.getByTestId('offline-store-cred-secret')).toBeInTheDocument();
    expect(screen.getByTestId('offline-store-file-type')).toBeInTheDocument();
  });

  it.each([
    ['online', PersistenceType.DB, 'online-store'],
    ['offline', PersistenceType.DB, 'offline-store'],
  ])('shows DB fields for %s store when persistence is DB', (store, _, prefix) => {
    const overrides =
      store === 'offline'
        ? { offlineStoreEnabled: true, offlinePersistenceType: PersistenceType.DB }
        : { onlinePersistenceType: PersistenceType.DB };
    renderStep(overrides);
    expect(screen.getByTestId(`${prefix}-db-type`)).toBeInTheDocument();
    expect(screen.getByTestId(`${prefix}-db-secret`)).toBeInTheDocument();
  });

  it.each([
    ['online → DB', {}, 0, 'onlinePersistenceType', PersistenceType.DB],
    [
      'online → File',
      { onlinePersistenceType: PersistenceType.DB },
      0,
      'onlinePersistenceType',
      PersistenceType.FILE,
    ],
    [
      'offline → DB',
      { offlineStoreEnabled: true, offlinePersistenceType: PersistenceType.FILE },
      1,
      'offlinePersistenceType',
      PersistenceType.DB,
    ],
    [
      'offline → File',
      { offlineStoreEnabled: true, offlinePersistenceType: PersistenceType.DB },
      1,
      'offlinePersistenceType',
      PersistenceType.FILE,
    ],
  ] as [string, Partial<FeatureStoreFormData>, number, string, PersistenceType][])(
    'calls setData when persistence type changes: %s',
    async (_, overrides, radioIdx, expectedKey, expectedVal) => {
      const user = userEvent.setup();
      const { setData } = renderStep(overrides);
      const label = expectedVal === PersistenceType.DB ? 'Database' : 'File';
      const radios = screen.getAllByLabelText(label);
      await user.click(radios[radioIdx]);
      expect(setData).toHaveBeenCalledWith(expectedKey, expectedVal);
    },
  );

  it('calls setData when online file path changes', () => {
    const { setData } = renderStep();
    fireEvent.change(screen.getByPlaceholderText('/data/online_store.db'), {
      target: { value: '/custom/path' },
    });
    expect(setData).toHaveBeenCalledWith(
      'services',
      expect.objectContaining({
        onlineStore: expect.objectContaining({
          persistence: expect.objectContaining({
            file: expect.objectContaining({ path: '/custom/path' }),
          }),
        }),
      }),
    );
  });

  it.each([
    ['online credentials secret', {}, 'online-store-cred-secret', 'onlineStoreSecretName'],
    [
      'offline credentials secret',
      { offlineStoreEnabled: true, offlinePersistenceType: PersistenceType.FILE },
      'offline-store-cred-secret',
      'offlineStoreSecretName',
    ],
  ])('calls setData when %s changes', (_, overrides, testId, expectedKey) => {
    const { setData } = renderStep(overrides);
    fireEvent.change(screen.getByTestId(testId), { target: { value: 'secret-a' } });
    expect(setData).toHaveBeenCalledWith(expectedKey, 'secret-a');
  });

  it('calls setData(services) when online DB type changes', () => {
    const { setData } = renderStep({ onlinePersistenceType: PersistenceType.DB });
    fireEvent.change(screen.getByTestId('online-store-db-type'), {
      target: { value: 'redis' },
    });
    expect(setData).toHaveBeenCalledWith(
      'services',
      expect.objectContaining({
        onlineStore: expect.objectContaining({
          persistence: expect.objectContaining({
            store: expect.objectContaining({ type: 'redis' }),
          }),
        }),
      }),
    );
  });

  it('calls setData(services) when online DB secret changes', () => {
    const { setData } = renderStep({ onlinePersistenceType: PersistenceType.DB });
    fireEvent.change(screen.getByTestId('online-store-db-secret'), {
      target: { value: 'secret-a' },
    });
    expect(setData).toHaveBeenCalledWith(
      'services',
      expect.objectContaining({
        onlineStore: expect.objectContaining({
          persistence: expect.objectContaining({
            store: expect.objectContaining({ secretRef: { name: 'secret-a' } }),
          }),
        }),
      }),
    );
  });

  it('calls setData(services) when offline DB type changes', () => {
    const { setData } = renderStep({
      offlineStoreEnabled: true,
      offlinePersistenceType: PersistenceType.DB,
    });
    fireEvent.change(screen.getByTestId('offline-store-db-type'), {
      target: { value: 'snowflake.offline' },
    });
    expect(setData).toHaveBeenCalledWith(
      'services',
      expect.objectContaining({
        offlineStore: expect.objectContaining({
          persistence: expect.objectContaining({
            store: expect.objectContaining({ type: 'snowflake.offline' }),
          }),
        }),
      }),
    );
  });

  it('calls setData(services) when offline DB secret changes', () => {
    const { setData } = renderStep({
      offlineStoreEnabled: true,
      offlinePersistenceType: PersistenceType.DB,
    });
    fireEvent.change(screen.getByTestId('offline-store-db-secret'), {
      target: { value: 'secret-b' },
    });
    expect(setData).toHaveBeenCalledWith(
      'services',
      expect.objectContaining({
        offlineStore: expect.objectContaining({
          persistence: expect.objectContaining({
            store: expect.objectContaining({ secretRef: { name: 'secret-b' } }),
          }),
        }),
      }),
    );
  });

  it.each([
    [
      'online DB secret key',
      { onlinePersistenceType: PersistenceType.DB },
      'online-store',
      'onlineStore',
    ],
    [
      'offline DB secret key',
      {
        offlineStoreEnabled: true,
        offlinePersistenceType: PersistenceType.DB,
        onlinePersistenceType: PersistenceType.FILE,
      },
      'offline-store',
      'offlineStore',
    ],
  ] as [string, Partial<FeatureStoreFormData>, string, string][])(
    'calls setData(services) when %s changes',
    (_, overrides, prefix, storeKey) => {
      const { setData } = renderStep(overrides);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      fireEvent.change(document.getElementById(`${prefix}-db-secret-key`)!, {
        target: { value: 'my_key' },
      });
      expect(setData).toHaveBeenCalledWith(
        'services',
        expect.objectContaining({
          [storeKey]: expect.objectContaining({
            persistence: expect.objectContaining({
              store: expect.objectContaining({ secretKeyName: 'my_key' }),
            }),
          }),
        }),
      );
    },
  );

  it('calls setData with file type when offline file type changes', () => {
    const { setData } = renderStep({
      offlineStoreEnabled: true,
      offlinePersistenceType: PersistenceType.FILE,
    });
    fireEvent.change(screen.getByTestId('offline-store-file-type'), {
      target: { value: 'duckdb' },
    });
    expect(setData).toHaveBeenCalledWith(
      'services',
      expect.objectContaining({
        offlineStore: expect.objectContaining({
          persistence: expect.objectContaining({
            file: expect.objectContaining({ type: 'duckdb' }),
          }),
        }),
      }),
    );
  });

  it.each([
    [
      'online with existing data',
      {
        onlinePersistenceType: PersistenceType.DB,
        services: {
          onlineStore: {
            persistence: {
              store: { type: 'redis', secretRef: { name: 'my-secret' }, secretKeyName: 'conn' },
            },
          },
        },
      },
      'online-store',
    ],
    [
      'offline with existing data',
      {
        offlineStoreEnabled: true,
        offlinePersistenceType: PersistenceType.DB,
        services: {
          offlineStore: {
            persistence: {
              store: { type: 'snowflake.offline', secretRef: { name: 'sf-secret' } },
            },
          },
        },
      },
      'offline-store',
    ],
  ])('renders DB fields for %s', (_, overrides, prefix) => {
    renderStep(overrides);
    expect(screen.getByTestId(`${prefix}-db-type`)).toBeInTheDocument();
    expect(screen.getByTestId(`${prefix}-db-secret`)).toBeInTheDocument();
  });
});
