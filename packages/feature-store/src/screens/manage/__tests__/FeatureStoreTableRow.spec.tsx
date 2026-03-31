import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { FeatureStoreKind } from '@odh-dashboard/internal/k8sTypes';
import FeatureStoreTableRow from '../FeatureStoreTableRow';

const baseFeatureStore: FeatureStoreKind = {
  apiVersion: 'feast.dev/v1',
  kind: 'FeatureStore',
  metadata: {
    name: 'test-store',
    namespace: 'test-ns',
    creationTimestamp: '2025-06-01T12:00:00Z',
  },
  spec: {
    feastProject: 'test',
    services: {
      registry: {
        local: {
          server: { restAPI: true, grpc: true },
        },
      },
      onlineStore: {},
    },
  },
  status: {
    phase: 'Ready',
    feastVersion: '0.40.0',
    conditions: [{ type: 'Ready', status: 'True', lastTransitionTime: '2025-06-01T12:05:00Z' }],
    serviceHostnames: {
      registry: 'feast-test-registry.test-ns.svc.cluster.local:443',
      registryRest: 'feast-test-registry-rest.test-ns.svc.cluster.local:80',
      onlineStore: 'feast-test-online.test-ns.svc.cluster.local:443',
    },
  },
};

const renderRow = (props: Partial<React.ComponentProps<typeof FeatureStoreTableRow>> = {}) => {
  const defaultProps: React.ComponentProps<typeof FeatureStoreTableRow> = {
    featureStore: baseFeatureStore,
    rowIndex: 0,
    isExpanded: false,
    onToggleExpansion: jest.fn(),
    isUILabeled: false,
    canDelete: true,
    onDelete: jest.fn(),
    ...props,
  };
  return render(
    <MemoryRouter>
      <table>
        <tbody>
          <FeatureStoreTableRow {...defaultProps} />
        </tbody>
      </table>
    </MemoryRouter>,
  );
};

describe('FeatureStoreTableRow', () => {
  it('should render the feature store name, namespace, and version', () => {
    renderRow();
    expect(screen.getByText('test-store')).toBeInTheDocument();
    expect(screen.getByText('test-ns')).toBeInTheDocument();
    expect(screen.getByText('0.40.0')).toBeInTheDocument();
  });

  it('should render name as a link when status is Ready', () => {
    renderRow();
    const link = screen.getByRole('link', { name: 'test-store' });
    expect(link).toHaveAttribute('href', '/develop-train/feature-store/overview/test');
  });

  it('should render name as plain text when status is not Ready', () => {
    const fs: FeatureStoreKind = {
      ...baseFeatureStore,
      status: { ...baseFeatureStore.status, phase: 'Installing' },
    };
    renderRow({ featureStore: fs });
    expect(screen.queryByRole('link', { name: 'test-store' })).not.toBeInTheDocument();
    expect(screen.getByText('test-store')).toBeInTheDocument();
  });

  it('should render Ready status label', () => {
    renderRow();
    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  it('should render Installing status label', () => {
    const fs: FeatureStoreKind = {
      ...baseFeatureStore,
      status: { ...baseFeatureStore.status, phase: 'Installing' },
    };
    renderRow({ featureStore: fs });
    expect(screen.getByText('Installing')).toBeInTheDocument();
  });

  it('should render Failed status label', () => {
    const fs: FeatureStoreKind = {
      ...baseFeatureStore,
      status: { ...baseFeatureStore.status, phase: 'Failed' },
    };
    renderRow({ featureStore: fs });
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('should render Pending for undefined phase', () => {
    const fs: FeatureStoreKind = {
      ...baseFeatureStore,
      status: { ...baseFeatureStore.status, phase: undefined },
    };
    renderRow({ featureStore: fs });
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('should show Primary label when isUILabeled is true', () => {
    renderRow({ isUILabeled: true });
    expect(screen.getByText('Primary')).toBeInTheDocument();
  });

  it('should not show Primary label when isUILabeled is false', () => {
    renderRow({ isUILabeled: false });
    expect(screen.queryByText('Primary')).not.toBeInTheDocument();
  });

  it('should show version as dash when not available', () => {
    const fs: FeatureStoreKind = {
      ...baseFeatureStore,
      status: { ...baseFeatureStore.status, feastVersion: undefined },
    };
    renderRow({ featureStore: fs });
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  describe('expanded details', () => {
    it('should not render expanded content when collapsed', () => {
      renderRow({ isExpanded: false });
      expect(screen.queryByText('Feast project')).not.toBeInTheDocument();
    });

    it('should render spec details when expanded', () => {
      renderRow({ isExpanded: true });
      expect(screen.getByText('Feast project')).toBeInTheDocument();
      expect(screen.getByText('test')).toBeInTheDocument();
      expect(screen.getByText('Registry')).toBeInTheDocument();
      expect(screen.getAllByText('Online store').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Authorization')).toBeInTheDocument();
      expect(screen.getByText('Scaling')).toBeInTheDocument();
    });

    it('should render service hostnames when expanded and available', () => {
      renderRow({ isExpanded: true });
      expect(screen.getByText('Service hostnames')).toBeInTheDocument();
      expect(screen.getByText('Registry (gRPC)')).toBeInTheDocument();
      expect(screen.getByText('Registry (REST)')).toBeInTheDocument();
      expect(
        screen.getByText('feast-test-registry.test-ns.svc.cluster.local:443'),
      ).toBeInTheDocument();
    });

    it('should render conditions when expanded', () => {
      renderRow({ isExpanded: true });
      expect(screen.getByText('Conditions')).toBeInTheDocument();
    });

    it('should show registry summary as Local (file) for default local registry', () => {
      renderRow({ isExpanded: true });
      expect(screen.getByText('Local (file)')).toBeInTheDocument();
    });

    it('should show remote registry summary with hostname', () => {
      const fs: FeatureStoreKind = {
        ...baseFeatureStore,
        spec: {
          ...baseFeatureStore.spec,
          services: {
            registry: {
              remote: { hostname: 'registry.example.com:443' },
            },
          },
        },
      };
      renderRow({ featureStore: fs, isExpanded: true });
      expect(screen.getByText('Remote (hostname: registry.example.com:443)')).toBeInTheDocument();
    });

    it('should show remote registry summary with feastRef', () => {
      const fs: FeatureStoreKind = {
        ...baseFeatureStore,
        spec: {
          ...baseFeatureStore.spec,
          services: {
            registry: {
              remote: { feastRef: { name: 'primary', namespace: 'feast-ns' } },
            },
          },
        },
      };
      renderRow({ featureStore: fs, isExpanded: true });
      expect(screen.getByText('Remote (ref: feast-ns/primary)')).toBeInTheDocument();
    });

    it('should show DB online store summary', () => {
      const fs: FeatureStoreKind = {
        ...baseFeatureStore,
        spec: {
          ...baseFeatureStore.spec,
          services: {
            ...baseFeatureStore.spec.services,
            onlineStore: {
              persistence: { store: { type: 'redis', secretRef: { name: 's' } } },
            },
          },
        },
      };
      renderRow({ featureStore: fs, isExpanded: true });
      expect(screen.getByText('DB (redis)')).toBeInTheDocument();
    });

    it('should show Disabled for missing offline store', () => {
      renderRow({ isExpanded: true });
      expect(screen.getByText('Disabled')).toBeInTheDocument();
    });

    it('should show authz summary as None when no authz', () => {
      renderRow({ isExpanded: true });
      expect(screen.getByText('None')).toBeInTheDocument();
    });

    it('should show OIDC authz summary', () => {
      const fs: FeatureStoreKind = {
        ...baseFeatureStore,
        spec: {
          ...baseFeatureStore.spec,
          authz: { oidc: { secretRef: { name: 'oidc-secret' } } },
        },
      };
      renderRow({ featureStore: fs, isExpanded: true });
      expect(screen.getByText('OIDC')).toBeInTheDocument();
    });

    it('should show HPA scaling summary', () => {
      const fs: FeatureStoreKind = {
        ...baseFeatureStore,
        spec: {
          ...baseFeatureStore.spec,
          services: {
            ...baseFeatureStore.spec.services,
            scaling: { autoscaling: { minReplicas: 2, maxReplicas: 5 } },
          },
        },
      };
      renderRow({ featureStore: fs, isExpanded: true });
      expect(screen.getByText('HPA (2–5 replicas)')).toBeInTheDocument();
    });

    it('should show static scaling summary', () => {
      const fs: FeatureStoreKind = {
        ...baseFeatureStore,
        spec: {
          ...baseFeatureStore.spec,
          replicas: 3,
        },
      };
      renderRow({ featureStore: fs, isExpanded: true });
      expect(screen.getByText('Static (3 replicas)')).toBeInTheDocument();
    });

    it('should show cronJob schedule when present', () => {
      const fs: FeatureStoreKind = {
        ...baseFeatureStore,
        spec: {
          ...baseFeatureStore.spec,
          cronJob: { schedule: '*/5 * * * *' },
        },
      };
      renderRow({ featureStore: fs, isExpanded: true });
      expect(screen.getByText('CronJob schedule')).toBeInTheDocument();
      expect(screen.getByText('*/5 * * * *')).toBeInTheDocument();
    });

    it('should show batch engine info when present', () => {
      const fs: FeatureStoreKind = {
        ...baseFeatureStore,
        spec: {
          ...baseFeatureStore.spec,
          batchEngine: {
            configMapRef: { name: 'spark-config' },
            configMapKey: 'config.yaml',
          },
        },
      };
      renderRow({ featureStore: fs, isExpanded: true });
      expect(screen.getByText('Batch engine')).toBeInTheDocument();
      expect(screen.getByText('spark-config (key: config.yaml)')).toBeInTheDocument();
    });
  });
});
