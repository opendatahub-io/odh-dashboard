import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ServerConfigSection from '../ServerConfigSection';
import { FeastServerConfigs } from '../../../../k8sTypes';

jest.mock('@odh-dashboard/internal/components/pf-overrides/FormSection', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@odh-dashboard/ui-core/components/SimpleSelect', () => ({
  __esModule: true,
  default: ({
    value,
    onChange,
    dataTestId,
    options,
  }: {
    value: string;
    onChange: (key: string) => void;
    dataTestId?: string;
    options?: { key: string; label: string }[];
  }) => (
    <select data-testid={dataTestId} value={value} onChange={(e) => onChange(e.target.value)}>
      {options?.map((opt) => (
        <option key={opt.key} value={opt.key}>
          {opt.label}
        </option>
      ))}
    </select>
  ),
}));

jest.mock('@odh-dashboard/ui-core/components/NumberInputWrapper', () => ({
  __esModule: true,
  default: ({
    value,
    onChange,
    'data-testid': testId,
  }: {
    value: number;
    onChange: (v: number) => void;
    'data-testid'?: string;
  }) => (
    <input
      type="number"
      data-testid={testId}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  ),
}));

describe('ServerConfigSection', () => {
  let onChange: jest.Mock;

  beforeEach(() => {
    onChange = jest.fn();
  });

  it('renders the toggle text', () => {
    render(
      <ServerConfigSection
        title="Test server"
        idPrefix="test-server"
        serverConfig={undefined}
        onChange={onChange}
      />,
    );
    expect(screen.getByText('Test server')).toBeInTheDocument();
  });

  it('shows log level, metrics, and image fields when expanded', () => {
    render(
      <ServerConfigSection
        title="Test server"
        idPrefix="test-server"
        serverConfig={undefined}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText('Test server'));
    expect(screen.getByTestId('test-server-log-level')).toBeInTheDocument();
    expect(screen.getByText('Prometheus metrics')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Leave empty for operator default')).toBeInTheDocument();
  });

  it('calls onChange when log level changes', () => {
    render(
      <ServerConfigSection
        title="Test server"
        idPrefix="test-server"
        serverConfig={{}}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText('Test server'));
    fireEvent.change(screen.getByTestId('test-server-log-level'), {
      target: { value: 'debug' },
    });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ logLevel: 'debug' }));
  });

  it.each([
    ['off to on', {}, true],
    ['on to off', { metrics: true }, undefined],
  ] as [string, { metrics?: boolean }, boolean | undefined][])(
    'calls onChange when metrics toggle changes (%s)',
    (_, serverConfig, expectedMetrics) => {
      render(
        <ServerConfigSection
          title="Test server"
          idPrefix="test-server"
          serverConfig={serverConfig}
          onChange={onChange}
        />,
      );
      fireEvent.click(screen.getByText('Test server'));
      fireEvent.click(screen.getByLabelText('Prometheus metrics'));
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ metrics: expectedMetrics }));
    },
  );

  it('shows resource fields when resources section is expanded', () => {
    render(
      <ServerConfigSection
        title="Test server"
        idPrefix="test-server"
        serverConfig={{}}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText('Test server'));
    fireEvent.click(screen.getByText('Resources (CPU / Memory)'));
    expect(screen.getByPlaceholderText('e.g. 100m, 0.5, 1')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. 128Mi, 256Mi, 1Gi')).toBeInTheDocument();
  });

  it('calls onChange when CPU request changes', () => {
    render(
      <ServerConfigSection
        title="Test server"
        idPrefix="test-server"
        serverConfig={{}}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText('Test server'));
    fireEvent.click(screen.getByText('Resources (CPU / Memory)'));
    fireEvent.change(screen.getByPlaceholderText('e.g. 100m, 0.5, 1'), {
      target: { value: '500m' },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        resources: expect.objectContaining({
          requests: expect.objectContaining({ cpu: '500m' }),
        }),
      }),
    );
  });

  it('shows worker config fields when worker section is expanded', () => {
    render(
      <ServerConfigSection
        title="Test server"
        idPrefix="test-server"
        serverConfig={{}}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText('Test server'));
    fireEvent.click(screen.getByText('Worker configuration'));
    expect(screen.getByTestId('test-server-workers')).toBeInTheDocument();
    expect(screen.getByTestId('test-server-worker-connections')).toBeInTheDocument();
    expect(screen.getByTestId('test-server-max-requests')).toBeInTheDocument();
  });

  it('does not show registry TTL when showRegistryTTL is false', () => {
    render(
      <ServerConfigSection
        title="Test server"
        idPrefix="test-server"
        serverConfig={{}}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText('Test server'));
    fireEvent.click(screen.getByText('Worker configuration'));
    expect(screen.queryByTestId('test-server-registry-ttl')).not.toBeInTheDocument();
  });

  it('shows registry TTL when showRegistryTTL is true', () => {
    render(
      <ServerConfigSection
        title="Test server"
        idPrefix="test-server"
        serverConfig={{}}
        onChange={onChange}
        showRegistryTTL
      />,
    );
    fireEvent.click(screen.getByText('Test server'));
    fireEvent.click(screen.getByText('Worker configuration'));
    expect(screen.getByTestId('test-server-registry-ttl')).toBeInTheDocument();
  });

  it('calls onChange when CPU limit changes', () => {
    render(
      <ServerConfigSection
        title="Test server"
        idPrefix="test-server"
        serverConfig={{}}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText('Test server'));
    fireEvent.click(screen.getByText('Resources (CPU / Memory)'));
    fireEvent.change(screen.getByPlaceholderText('e.g. 500m, 1, 2'), {
      target: { value: '2' },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        resources: expect.objectContaining({
          limits: expect.objectContaining({ cpu: '2' }),
        }),
      }),
    );
  });

  it('calls onChange when memory request changes', () => {
    render(
      <ServerConfigSection
        title="Test server"
        idPrefix="test-server"
        serverConfig={{}}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText('Test server'));
    fireEvent.click(screen.getByText('Resources (CPU / Memory)'));
    fireEvent.change(screen.getByPlaceholderText('e.g. 128Mi, 256Mi, 1Gi'), {
      target: { value: '256Mi' },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        resources: expect.objectContaining({
          requests: expect.objectContaining({ memory: '256Mi' }),
        }),
      }),
    );
  });

  it('calls onChange when memory limit changes', () => {
    render(
      <ServerConfigSection
        title="Test server"
        idPrefix="test-server"
        serverConfig={{}}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText('Test server'));
    fireEvent.click(screen.getByText('Resources (CPU / Memory)'));
    fireEvent.change(screen.getByPlaceholderText('e.g. 256Mi, 512Mi, 2Gi'), {
      target: { value: '512Mi' },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        resources: expect.objectContaining({
          limits: expect.objectContaining({ memory: '512Mi' }),
        }),
      }),
    );
  });

  it('renders existing resource values from config', () => {
    render(
      <ServerConfigSection
        title="Test server"
        idPrefix="test-server"
        serverConfig={{
          resources: {
            requests: { cpu: '100m', memory: '128Mi' },
            limits: { cpu: '500m', memory: '256Mi' },
          },
        }}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText('Test server'));
    fireEvent.click(screen.getByText('Resources (CPU / Memory)'));
    expect(screen.getByDisplayValue('100m')).toBeInTheDocument();
    expect(screen.getByDisplayValue('500m')).toBeInTheDocument();
    expect(screen.getByDisplayValue('128Mi')).toBeInTheDocument();
    expect(screen.getByDisplayValue('256Mi')).toBeInTheDocument();
  });

  it('calls updateWorker when workers count changes', () => {
    render(
      <ServerConfigSection
        title="Test server"
        idPrefix="test-server"
        serverConfig={{}}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText('Test server'));
    fireEvent.click(screen.getByText('Worker configuration'));
    fireEvent.change(screen.getByTestId('test-server-workers'), {
      target: { value: '4' },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        workerConfigs: expect.objectContaining({ workers: 4 }),
      }),
    );
  });

  it('calls updateWorker when worker connections changes', () => {
    render(
      <ServerConfigSection
        title="Test server"
        idPrefix="test-server"
        serverConfig={{}}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText('Test server'));
    fireEvent.click(screen.getByText('Worker configuration'));
    fireEvent.change(screen.getByTestId('test-server-worker-connections'), {
      target: { value: '2000' },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        workerConfigs: expect.objectContaining({ workerConnections: 2000 }),
      }),
    );
  });

  it('calls updateWorker when max requests changes', () => {
    render(
      <ServerConfigSection
        title="Test server"
        idPrefix="test-server"
        serverConfig={{}}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText('Test server'));
    fireEvent.click(screen.getByText('Worker configuration'));
    fireEvent.change(screen.getByTestId('test-server-max-requests'), {
      target: { value: '5000' },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        workerConfigs: expect.objectContaining({ maxRequests: 5000 }),
      }),
    );
  });

  it('calls updateWorker when max requests jitter changes', () => {
    render(
      <ServerConfigSection
        title="Test server"
        idPrefix="test-server"
        serverConfig={{}}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText('Test server'));
    fireEvent.click(screen.getByText('Worker configuration'));
    fireEvent.change(screen.getByTestId('test-server-max-requests-jitter'), {
      target: { value: '100' },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        workerConfigs: expect.objectContaining({ maxRequestsJitter: 100 }),
      }),
    );
  });

  it('calls updateWorker when keep-alive timeout changes', () => {
    render(
      <ServerConfigSection
        title="Test server"
        idPrefix="test-server"
        serverConfig={{}}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText('Test server'));
    fireEvent.click(screen.getByText('Worker configuration'));
    fireEvent.change(screen.getByTestId('test-server-keep-alive'), {
      target: { value: '60' },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        workerConfigs: expect.objectContaining({ keepAliveTimeout: 60 }),
      }),
    );
  });

  it('calls updateWorker when registry TTL changes', () => {
    render(
      <ServerConfigSection
        title="Test server"
        idPrefix="test-server"
        serverConfig={{}}
        onChange={onChange}
        showRegistryTTL
      />,
    );
    fireEvent.click(screen.getByText('Test server'));
    fireEvent.click(screen.getByText('Worker configuration'));
    fireEvent.change(screen.getByTestId('test-server-registry-ttl'), {
      target: { value: '120' },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        workerConfigs: expect.objectContaining({ registryTTLSeconds: 120 }),
      }),
    );
  });

  it('preserves existing config values when updating', () => {
    const existingConfig: FeastServerConfigs = {
      logLevel: 'info',
      metrics: true,
      image: 'custom:latest',
    };
    render(
      <ServerConfigSection
        title="Test server"
        idPrefix="test-server"
        serverConfig={existingConfig}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText('Test server'));
    fireEvent.change(screen.getByPlaceholderText('Leave empty for operator default'), {
      target: { value: 'new:v2' },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        logLevel: 'info',
        metrics: true,
        image: 'new:v2',
      }),
    );
  });

  it('preserves unknown resource keys when updating a controlled field', () => {
    render(
      <ServerConfigSection
        title="Test server"
        idPrefix="test-server"
        serverConfig={{
          resources: {
            requests: { cpu: '100m', 'nvidia.com/gpu': '1' },
            limits: { cpu: '500m', memory: '1Gi', 'nvidia.com/gpu': '1' },
          },
        }}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText('Test server'));
    fireEvent.click(screen.getByText('Resources (CPU / Memory)'));
    fireEvent.change(screen.getByPlaceholderText('e.g. 128Mi, 256Mi, 1Gi'), {
      target: { value: '512Mi' },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        resources: {
          requests: { cpu: '100m', memory: '512Mi', 'nvidia.com/gpu': '1' },
          limits: { cpu: '500m', memory: '1Gi', 'nvidia.com/gpu': '1' },
        },
      }),
    );
  });
});
