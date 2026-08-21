import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen, act } from '@testing-library/react';
import AddRuleModal from '#~/pages/projects/projectRoles/AddRuleModal';
import type { ApiResourcesData } from '#~/pages/projects/projectRoles/useApiResources';

const mockApiResourcesData: ApiResourcesData = {
  apiGroups: ['', 'apps', 'batch', 'kubeflow.org', 'networking.k8s.io'],
  resources: [
    { name: 'pods', kind: 'Pod', apiGroup: '' },
    { name: 'services', kind: 'Service', apiGroup: '' },
    { name: 'deployments', kind: 'Deployment', apiGroup: 'apps' },
    { name: 'statefulsets', kind: 'StatefulSet', apiGroup: 'apps' },
    { name: 'jobs', kind: 'Job', apiGroup: 'batch' },
    { name: 'notebooks', kind: 'Notebook', apiGroup: 'kubeflow.org' },
    { name: 'networkpolicies', kind: 'NetworkPolicy', apiGroup: 'networking.k8s.io' },
  ],
};

jest.mock('#~/pages/projects/projectRoles/useApiResources', () => ({
  __esModule: true,
  default: () => ({
    data: mockApiResourcesData,
    loaded: true,
    error: undefined,
  }),
}));

let capturedResourcesProps: {
  selectedResources: string[];
  onSelectedResourcesChange: (resources: string[]) => void;
  filterByApiGroups?: string[];
};
let capturedApiGroupsProps: {
  selectedApiGroups: string[];
  onSelectedApiGroupsChange: (groups: string[]) => void;
};

jest.mock('#~/pages/projects/projectRoles/ResourcesTreeSelect', () => {
  const Mock: React.FC<typeof capturedResourcesProps> = (props) => {
    capturedResourcesProps = props;
    return (
      <div data-testid="resources-tree-select">
        {props.selectedResources.join(',')}
        {props.filterByApiGroups ? ` [filter:${props.filterByApiGroups.join(',')}]` : ''}
      </div>
    );
  };
  Mock.displayName = 'MockResourcesTreeSelect';
  return { __esModule: true, default: Mock };
});

jest.mock('#~/pages/projects/projectRoles/ApiGroupsTreeSelect', () => {
  const Mock: React.FC<typeof capturedApiGroupsProps> = (props) => {
    capturedApiGroupsProps = props;
    return <div data-testid="api-groups-tree-select">{props.selectedApiGroups.join(',')}</div>;
  };
  Mock.displayName = 'MockApiGroupsTreeSelect';
  return { __esModule: true, default: Mock };
});

jest.mock('#~/pages/projects/projectRoles/VerbsTreeSelect', () => {
  const Mock = () => <div data-testid="verbs-tree-select" />;
  Mock.displayName = 'MockVerbsTreeSelect';
  return { __esModule: true, default: Mock };
});

describe('AddRuleModal orchestration', () => {
  const mockOnSave = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderModal = (existingRule?: Parameters<typeof AddRuleModal>[0]['existingRule']) => {
    render(<AddRuleModal onSave={mockOnSave} onClose={mockOnClose} existingRule={existingRule} />);
  };

  describe('filterByApiGroups prop forwarding', () => {
    it('should not filter Resource types until the user selects an API group', () => {
      renderModal();

      expect(capturedResourcesProps.filterByApiGroups).toEqual([]);
    });

    it('should not filter when an existing rule already has API groups', () => {
      renderModal({ id: 'r1', apiGroups: ['apps'], resources: ['deployments'], verbs: [] });

      expect(capturedResourcesProps.filterByApiGroups).toEqual([]);
    });

    it('should filter Resource types when the user selects an API group', () => {
      renderModal();

      act(() => {
        capturedApiGroupsProps.onSelectedApiGroupsChange(['apps']);
      });

      expect(capturedResourcesProps.filterByApiGroups).toEqual(['apps']);
    });

    it('should keep the API group filter after a matching resource is selected', () => {
      renderModal();

      act(() => {
        capturedApiGroupsProps.onSelectedApiGroupsChange(['apps']);
      });
      act(() => {
        capturedResourcesProps.onSelectedResourcesChange(['deployments']);
      });

      expect(capturedApiGroupsProps.selectedApiGroups).toContain('apps');
      expect(capturedResourcesProps.filterByApiGroups).toEqual(['apps']);
    });

    it('should not filter when an API group is only auto-added from a resource', () => {
      renderModal();

      act(() => {
        capturedResourcesProps.onSelectedResourcesChange(['notebooks']);
      });

      expect(capturedApiGroupsProps.selectedApiGroups).toContain('kubeflow.org');
      expect(capturedResourcesProps.filterByApiGroups).toEqual([]);
    });

    it('should not widen the resource filter when a resource auto-adds another API group', () => {
      renderModal();

      act(() => {
        capturedApiGroupsProps.onSelectedApiGroupsChange(['apps']);
      });
      act(() => {
        capturedResourcesProps.onSelectedResourcesChange(['notebooks']);
      });

      expect(capturedApiGroupsProps.selectedApiGroups).toEqual(
        expect.arrayContaining(['apps', 'kubeflow.org']),
      );
      expect(capturedResourcesProps.filterByApiGroups).toEqual(['apps']);
    });

    it('should clear the resource filter when the last resource for an explicit API group is removed', () => {
      renderModal();

      act(() => {
        capturedApiGroupsProps.onSelectedApiGroupsChange(['apps']);
      });
      act(() => {
        capturedResourcesProps.onSelectedResourcesChange(['deployments']);
      });
      act(() => {
        capturedResourcesProps.onSelectedResourcesChange([]);
      });

      expect(capturedApiGroupsProps.selectedApiGroups).toEqual([]);
      expect(capturedResourcesProps.filterByApiGroups).toEqual([]);
    });
  });

  describe('auto-populate API groups when resource is selected', () => {
    it('should auto-add the API group when a resource is selected', () => {
      renderModal();

      act(() => {
        capturedResourcesProps.onSelectedResourcesChange(['deployments']);
      });

      expect(capturedApiGroupsProps.selectedApiGroups).toContain('apps');
    });

    it('should auto-add multiple API groups when resources from different groups are selected', () => {
      renderModal();

      act(() => {
        capturedResourcesProps.onSelectedResourcesChange(['deployments', 'notebooks']);
      });

      expect(capturedApiGroupsProps.selectedApiGroups).toContain('apps');
      expect(capturedApiGroupsProps.selectedApiGroups).toContain('kubeflow.org');
    });

    it('should not auto-add an API group that is already selected', () => {
      renderModal({ id: 'r1', apiGroups: ['apps'], resources: ['deployments'], verbs: [] });

      act(() => {
        capturedResourcesProps.onSelectedResourcesChange(['deployments', 'statefulsets']);
      });

      const appsCount = capturedApiGroupsProps.selectedApiGroups.filter((g) => g === 'apps').length;
      expect(appsCount).toBe(1);
    });

    it('should not auto-populate when wildcard resources are selected', () => {
      renderModal();

      act(() => {
        capturedResourcesProps.onSelectedResourcesChange(['*']);
      });

      expect(capturedApiGroupsProps.selectedApiGroups).toEqual([]);
    });

    it('should not auto-add a concrete API group when All API groups is selected', () => {
      renderModal({ id: 'r1', apiGroups: ['*'], resources: [], verbs: [] });

      act(() => {
        capturedResourcesProps.onSelectedResourcesChange(['pods']);
      });

      expect(capturedApiGroupsProps.selectedApiGroups).toEqual(['*']);
    });

    it('should not auto-populate for custom resources with unknown API group', () => {
      renderModal();

      act(() => {
        capturedResourcesProps.onSelectedResourcesChange(['mycustomresource']);
      });

      expect(capturedApiGroupsProps.selectedApiGroups).toEqual([]);
    });

    it('should auto-add core group (empty string) for core resources', () => {
      renderModal();

      act(() => {
        capturedResourcesProps.onSelectedResourcesChange(['pods']);
      });

      expect(capturedApiGroupsProps.selectedApiGroups).toContain('');
    });

    it('should remove an API group when its last mapped resource is removed', () => {
      renderModal({ id: 'r1', apiGroups: [''], resources: ['pods'], verbs: [] });

      act(() => {
        capturedResourcesProps.onSelectedResourcesChange([]);
      });

      expect(capturedApiGroupsProps.selectedApiGroups).toEqual([]);
    });

    it('should keep an API group when another resource from that group remains', () => {
      renderModal({ id: 'r1', apiGroups: [''], resources: ['pods', 'services'], verbs: [] });

      act(() => {
        capturedResourcesProps.onSelectedResourcesChange(['services']);
      });

      expect(capturedApiGroupsProps.selectedApiGroups).toEqual(['']);
    });

    it('should replace the API group when the last resource is swapped to another group', () => {
      renderModal({ id: 'r1', apiGroups: [''], resources: ['pods'], verbs: [] });

      act(() => {
        capturedResourcesProps.onSelectedResourcesChange(['jobs']);
      });

      expect(capturedApiGroupsProps.selectedApiGroups).toEqual(['batch']);
    });

    it('should keep a custom-typed API group when only a custom resource is selected', () => {
      renderModal({
        id: 'r1',
        apiGroups: ['custom.example.io'],
        resources: [],
        verbs: [],
      });

      act(() => {
        capturedResourcesProps.onSelectedResourcesChange(['mywidgets']);
      });

      expect(capturedApiGroupsProps.selectedApiGroups).toEqual(['custom.example.io']);
    });

    it('should drop auto-added API groups when All resources is cleared', () => {
      renderModal();

      act(() => {
        capturedResourcesProps.onSelectedResourcesChange(['notebooks']);
      });
      act(() => {
        capturedResourcesProps.onSelectedResourcesChange(['*']);
      });
      act(() => {
        capturedResourcesProps.onSelectedResourcesChange([]);
      });

      expect(capturedApiGroupsProps.selectedApiGroups).toEqual([]);
    });

    it('should keep an explicit API group filter when All resources is cleared', () => {
      renderModal();

      act(() => {
        capturedApiGroupsProps.onSelectedApiGroupsChange(['apps']);
      });
      act(() => {
        capturedResourcesProps.onSelectedResourcesChange(['*']);
      });
      act(() => {
        capturedResourcesProps.onSelectedResourcesChange([]);
      });

      expect(capturedApiGroupsProps.selectedApiGroups).toEqual(['apps']);
      expect(capturedResourcesProps.filterByApiGroups).toEqual(['apps']);
    });
  });

  describe('cascading deselection when API group is removed', () => {
    it('should remove orphaned resources when their API group is removed', () => {
      renderModal({
        id: 'r1',
        apiGroups: ['apps', 'batch'],
        resources: ['deployments', 'jobs'],
        verbs: ['get'],
      });

      act(() => {
        capturedApiGroupsProps.onSelectedApiGroupsChange(['batch']);
      });

      expect(capturedResourcesProps.selectedResources).not.toContain('deployments');
      expect(capturedResourcesProps.selectedResources).toContain('jobs');
    });

    it('should not cascade when wildcard API group is selected', () => {
      renderModal({
        id: 'r1',
        apiGroups: ['apps'],
        resources: ['deployments'],
        verbs: ['get'],
      });

      act(() => {
        capturedApiGroupsProps.onSelectedApiGroupsChange(['*']);
      });

      expect(capturedResourcesProps.selectedResources).toContain('deployments');
    });

    it('should cascade resources when API groups become empty', () => {
      renderModal({
        id: 'r1',
        apiGroups: ['apps'],
        resources: ['deployments'],
        verbs: ['get'],
      });

      act(() => {
        capturedApiGroupsProps.onSelectedApiGroupsChange([]);
      });

      expect(capturedResourcesProps.selectedResources).not.toContain('deployments');
    });

    it('should not cascade when resources wildcard is selected', () => {
      renderModal({
        id: 'r1',
        apiGroups: ['apps', 'batch'],
        resources: ['*'],
        verbs: ['get'],
      });

      act(() => {
        capturedApiGroupsProps.onSelectedApiGroupsChange(['batch']);
      });

      expect(capturedResourcesProps.selectedResources).toContain('*');
    });

    it('should keep custom resources (unknown group) when API group is removed', () => {
      renderModal({
        id: 'r1',
        apiGroups: ['apps', ''],
        resources: ['deployments', 'pods', 'mycustomresource'],
        verbs: ['get'],
      });

      act(() => {
        capturedApiGroupsProps.onSelectedApiGroupsChange(['']);
      });

      expect(capturedResourcesProps.selectedResources).not.toContain('deployments');
      expect(capturedResourcesProps.selectedResources).toContain('pods');
      expect(capturedResourcesProps.selectedResources).toContain('mycustomresource');
    });

    it('should remove only resources belonging to the removed group', () => {
      renderModal({
        id: 'r1',
        apiGroups: ['apps', 'networking.k8s.io'],
        resources: ['deployments', 'statefulsets', 'networkpolicies'],
        verbs: ['get'],
      });

      act(() => {
        capturedApiGroupsProps.onSelectedApiGroupsChange(['networking.k8s.io']);
      });

      expect(capturedResourcesProps.selectedResources).not.toContain('deployments');
      expect(capturedResourcesProps.selectedResources).not.toContain('statefulsets');
      expect(capturedResourcesProps.selectedResources).toContain('networkpolicies');
    });

    it('should cascade all resources when wildcard API group is cleared', () => {
      renderModal({
        id: 'r1',
        apiGroups: ['*'],
        resources: ['deployments', 'pods', 'mycustomresource'],
        verbs: ['get'],
      });

      act(() => {
        capturedApiGroupsProps.onSelectedApiGroupsChange([]);
      });

      expect(capturedResourcesProps.selectedResources).not.toContain('deployments');
      expect(capturedResourcesProps.selectedResources).not.toContain('pods');
      expect(capturedResourcesProps.selectedResources).toContain('mycustomresource');
    });
  });

  describe('edit mode', () => {
    it('should not cascade on initial render with mismatched state', () => {
      renderModal({
        id: 'r1',
        apiGroups: ['apps'],
        resources: ['pods', 'deployments'],
        verbs: ['get'],
      });

      expect(capturedResourcesProps.selectedResources).toEqual(['pods', 'deployments']);
      expect(capturedApiGroupsProps.selectedApiGroups).toEqual(['apps']);
    });
  });

  describe('save button', () => {
    it('should be disabled when API groups, resources, and verbs are not all selected', () => {
      renderModal();

      expect(screen.getByTestId('modal-submit-button')).toBeDisabled();
    });

    it('should save only the API groups wildcard when extra groups are also selected', () => {
      renderModal({
        id: 'r1',
        apiGroups: ['*', ''],
        resources: ['pods'],
        verbs: ['get'],
      });

      act(() => {
        screen.getByTestId('modal-submit-button').click();
      });

      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          apiGroups: ['*'],
          resources: ['pods'],
          verbs: ['get'],
        }),
      );
    });
  });
});
