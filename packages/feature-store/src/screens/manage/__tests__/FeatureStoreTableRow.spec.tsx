import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { FeatureStoreKind } from '../../../k8sTypes';
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

  describe('delete action', () => {
    it('should call onDelete with the feature store when Delete is clicked', async () => {
      const onDeleteMock = jest.fn();
      const user = userEvent.setup();
      renderRow({ canDelete: true, onDelete: onDeleteMock });

      const kebab = screen.getByRole('button', { name: 'Kebab toggle' });
      await user.click(kebab);
      const deleteItem = await screen.findByRole('menuitem', { name: 'Delete' });
      await user.click(deleteItem);

      expect(onDeleteMock).toHaveBeenCalledWith(baseFeatureStore);
    });

    it('should disable Delete action when canDelete is false', async () => {
      const onDeleteMock = jest.fn();
      const user = userEvent.setup();
      renderRow({ canDelete: false, onDelete: onDeleteMock });

      const kebab = screen.getByRole('button', { name: 'Kebab toggle' });
      await user.click(kebab);
      const deleteItem = await screen.findByRole('menuitem', { name: 'Delete' });
      await user.click(deleteItem);

      expect(onDeleteMock).not.toHaveBeenCalled();
    });

    it('should show tooltip on disabled Delete action explaining permission restriction', async () => {
      const user = userEvent.setup();
      renderRow({ canDelete: false });

      const kebab = screen.getByRole('button', { name: 'Kebab toggle' });
      await user.click(kebab);
      const deleteItem = await screen.findByRole('menuitem', { name: 'Delete' });
      await user.hover(deleteItem);

      await waitFor(() => {
        expect(
          screen.getByText('You do not have permission to delete feature stores.'),
        ).toBeInTheDocument();
      });
    });

    it('should not show tooltip on enabled Delete action', async () => {
      const user = userEvent.setup();
      renderRow({ canDelete: true });

      const kebab = screen.getByRole('button', { name: 'Kebab toggle' });
      await user.click(kebab);
      const deleteItem = await screen.findByRole('menuitem', { name: 'Delete' });
      await user.hover(deleteItem);

      expect(
        screen.queryByText('You do not have permission to delete feature stores.'),
      ).not.toBeInTheDocument();
    });
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

    it('should show Kubernetes RBAC authz summary', () => {
      const fs: FeatureStoreKind = {
        ...baseFeatureStore,
        spec: {
          ...baseFeatureStore.spec,
          authz: { kubernetes: { roles: ['admin'] } },
        },
      };
      renderRow({ featureStore: fs, isExpanded: true });
      expect(screen.getByText('Kubernetes RBAC')).toBeInTheDocument();
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
      expect(screen.getByText('HPA (2\u20135 replicas)')).toBeInTheDocument();
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

    it('should show client ConfigMap from status when present', () => {
      const fs: FeatureStoreKind = {
        ...baseFeatureStore,
        status: {
          ...baseFeatureStore.status,
          clientConfigMap: 'feast-test-client-config',
        },
      };
      renderRow({ featureStore: fs, isExpanded: true });
      expect(screen.getByText('Client ConfigMap')).toBeInTheDocument();
      expect(screen.getByText('feast-test-client-config')).toBeInTheDocument();
    });

    it('should show Remote for remote registry without hostname or feastRef', () => {
      const fs: FeatureStoreKind = {
        ...baseFeatureStore,
        spec: {
          ...baseFeatureStore.spec,
          services: {
            registry: { remote: {} },
          },
        },
      };
      renderRow({ featureStore: fs, isExpanded: true });
      expect(screen.getByText('Remote')).toBeInTheDocument();
    });

    it('should show remote feastRef without namespace prefix', () => {
      const fs: FeatureStoreKind = {
        ...baseFeatureStore,
        spec: {
          ...baseFeatureStore.spec,
          services: {
            registry: {
              remote: { feastRef: { name: 'primary' } },
            },
          },
        },
      };
      renderRow({ featureStore: fs, isExpanded: true });
      expect(screen.getByText('Remote (ref: primary)')).toBeInTheDocument();
    });

    it('should show local DB registry summary', () => {
      const fs: FeatureStoreKind = {
        ...baseFeatureStore,
        spec: {
          ...baseFeatureStore.spec,
          services: {
            registry: {
              local: {
                persistence: { store: { type: 'sql', secretRef: { name: 's' } } },
              },
            },
          },
        },
      };
      renderRow({ featureStore: fs, isExpanded: true });
      expect(screen.getByText('Local (DB: sql)')).toBeInTheDocument();
    });

    it('should show local file registry summary with path', () => {
      const fs: FeatureStoreKind = {
        ...baseFeatureStore,
        spec: {
          ...baseFeatureStore.spec,
          services: {
            registry: {
              local: {
                persistence: { file: { path: '/data/registry.db' } },
              },
            },
          },
        },
      };
      renderRow({ featureStore: fs, isExpanded: true });
      expect(screen.getByText('Local (file: /data/registry.db)')).toBeInTheDocument();
    });

    it('should show Default registry when no services defined', () => {
      const fs: FeatureStoreKind = {
        ...baseFeatureStore,
        spec: {
          ...baseFeatureStore.spec,
          services: undefined,
        },
      };
      renderRow({ featureStore: fs, isExpanded: true });
      expect(screen.getByText('Default')).toBeInTheDocument();
    });

    it('should show File online store summary with path', () => {
      const fs: FeatureStoreKind = {
        ...baseFeatureStore,
        spec: {
          ...baseFeatureStore.spec,
          services: {
            ...baseFeatureStore.spec.services,
            onlineStore: {
              persistence: { file: { path: '/data/online.db' } },
            },
          },
        },
      };
      renderRow({ featureStore: fs, isExpanded: true });
      expect(screen.getByText('File (/data/online.db)')).toBeInTheDocument();
    });

    it('should show File online store summary without path', () => {
      const fs: FeatureStoreKind = {
        ...baseFeatureStore,
        spec: {
          ...baseFeatureStore.spec,
          services: {
            ...baseFeatureStore.spec.services,
            onlineStore: {
              persistence: { file: {} },
            },
          },
        },
      };
      renderRow({ featureStore: fs, isExpanded: true });
      expect(screen.getByText('File')).toBeInTheDocument();
    });

    it('should show Default online store summary when no persistence', () => {
      const fs: FeatureStoreKind = {
        ...baseFeatureStore,
        spec: {
          ...baseFeatureStore.spec,
          services: {
            ...baseFeatureStore.spec.services,
            onlineStore: {},
          },
        },
      };
      renderRow({ featureStore: fs, isExpanded: true });
      expect(screen.getByText('Default')).toBeInTheDocument();
    });

    it('should show DB offline store summary', () => {
      const fs: FeatureStoreKind = {
        ...baseFeatureStore,
        spec: {
          ...baseFeatureStore.spec,
          services: {
            ...baseFeatureStore.spec.services,
            offlineStore: {
              persistence: { store: { type: 'snowflake', secretRef: { name: 's' } } },
            },
          },
        },
      };
      renderRow({ featureStore: fs, isExpanded: true });
      expect(screen.getByText('DB (snowflake)')).toBeInTheDocument();
    });

    it('should show File offline store summary with type', () => {
      const fs: FeatureStoreKind = {
        ...baseFeatureStore,
        spec: {
          ...baseFeatureStore.spec,
          services: {
            ...baseFeatureStore.spec.services,
            offlineStore: {
              persistence: { file: { type: 'dask' } },
            },
          },
        },
      };
      renderRow({ featureStore: fs, isExpanded: true });
      expect(screen.getByText('File (dask)')).toBeInTheDocument();
    });

    it('should show File offline store summary without type', () => {
      const fs: FeatureStoreKind = {
        ...baseFeatureStore,
        spec: {
          ...baseFeatureStore.spec,
          services: {
            ...baseFeatureStore.spec.services,
            offlineStore: {
              persistence: { file: {} },
            },
          },
        },
      };
      renderRow({ featureStore: fs, isExpanded: true });
      expect(screen.getByText('File')).toBeInTheDocument();
    });

    it('should show Default offline store summary when no persistence', () => {
      const fs: FeatureStoreKind = {
        ...baseFeatureStore,
        spec: {
          ...baseFeatureStore.spec,
          services: {
            ...baseFeatureStore.spec.services,
            offlineStore: {},
          },
        },
      };
      renderRow({ featureStore: fs, isExpanded: true });
      const offlineDescs = screen.getAllByText('Default');
      expect(offlineDescs.length).toBeGreaterThanOrEqual(1);
    });

    it('should show None for authz with empty object', () => {
      const fs: FeatureStoreKind = {
        ...baseFeatureStore,
        spec: {
          ...baseFeatureStore.spec,
          authz: {},
        },
      };
      renderRow({ featureStore: fs, isExpanded: true });
      expect(screen.getByText('None')).toBeInTheDocument();
    });

    it('should show HPA scaling with default minReplicas', () => {
      const fs: FeatureStoreKind = {
        ...baseFeatureStore,
        spec: {
          ...baseFeatureStore.spec,
          services: {
            ...baseFeatureStore.spec.services,
            scaling: { autoscaling: { maxReplicas: 10 } },
          },
        },
      };
      renderRow({ featureStore: fs, isExpanded: true });
      expect(screen.getByText('HPA (1\u201310 replicas)')).toBeInTheDocument();
    });

    it('should show dash when creationTimestamp is absent', () => {
      const fs: FeatureStoreKind = {
        ...baseFeatureStore,
        metadata: {
          ...baseFeatureStore.metadata,
          creationTimestamp: undefined,
        },
      };
      renderRow({ featureStore: fs });
      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('should show batch engine name without key', () => {
      const fs: FeatureStoreKind = {
        ...baseFeatureStore,
        spec: {
          ...baseFeatureStore.spec,
          batchEngine: {
            configMapRef: { name: 'spark-config' },
          },
        },
      };
      renderRow({ featureStore: fs, isExpanded: true });
      expect(screen.getByText('spark-config')).toBeInTheDocument();
    });

    it('should show offline store hostname when available', () => {
      const fs: FeatureStoreKind = {
        ...baseFeatureStore,
        status: {
          ...baseFeatureStore.status,
          serviceHostnames: {
            offlineStore: 'feast-offline.test-ns.svc.cluster.local:443',
          },
        },
      };
      renderRow({ featureStore: fs, isExpanded: true });
      expect(screen.getByText('feast-offline.test-ns.svc.cluster.local:443')).toBeInTheDocument();
    });

    it('should show condition reason when message is absent', () => {
      const fs: FeatureStoreKind = {
        ...baseFeatureStore,
        status: {
          ...baseFeatureStore.status,
          conditions: [
            {
              type: 'Available',
              status: 'False',
              lastTransitionTime: '2025-06-01T12:05:00Z',
              reason: 'DeploymentUnavailable',
            },
          ],
        },
      };
      renderRow({ featureStore: fs, isExpanded: true });
      expect(screen.getByText('DeploymentUnavailable')).toBeInTheDocument();
    });

    it('should show em dash when condition has no message or reason', () => {
      const fs: FeatureStoreKind = {
        ...baseFeatureStore,
        status: {
          ...baseFeatureStore.status,
          conditions: [
            {
              type: 'Progressing',
              status: 'True',
              lastTransitionTime: '2025-06-01T12:05:00Z',
            },
          ],
        },
      };
      renderRow({ featureStore: fs, isExpanded: true });
      expect(screen.getByText('\u2014')).toBeInTheDocument();
    });

    it('should not show service hostnames section when none available', () => {
      const fs: FeatureStoreKind = {
        ...baseFeatureStore,
        status: {
          ...baseFeatureStore.status,
          serviceHostnames: undefined,
        },
      };
      renderRow({ featureStore: fs, isExpanded: true });
      expect(screen.queryByText('Service hostnames')).not.toBeInTheDocument();
    });
  });
});
