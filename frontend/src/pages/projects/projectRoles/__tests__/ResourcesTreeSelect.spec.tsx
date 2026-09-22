import * as React from 'react';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import ResourcesTreeSelect from '#~/pages/projects/projectRoles/ResourcesTreeSelect';
import type { ApiResourcesData } from '#~/pages/projects/projectRoles/useApiResources';

const mockApiResourcesData: ApiResourcesData = {
  apiGroups: [
    '',
    'apps',
    'batch',
    'kubeflow.org',
    'networking.k8s.io',
    'rbac.authorization.k8s.io',
    'storage.k8s.io',
    'image.openshift.io',
    'infrastructure.opendatahub.io',
  ],
  resources: [
    { name: 'pods', kind: 'Pod', apiGroup: '' },
    { name: 'services', kind: 'Service', apiGroup: '' },
    { name: 'configmaps', kind: 'ConfigMap', apiGroup: '' },
    { name: 'namespaces', kind: 'Namespace', apiGroup: '' },
    { name: 'events', kind: 'Event', apiGroup: '' },
    { name: 'persistentvolumes', kind: 'PersistentVolume', apiGroup: '' },
    { name: 'persistentvolumeclaims', kind: 'PersistentVolumeClaim', apiGroup: '' },
    { name: 'deployments', kind: 'Deployment', apiGroup: 'apps' },
    { name: 'statefulsets', kind: 'StatefulSet', apiGroup: 'apps' },
    { name: 'daemonsets', kind: 'DaemonSet', apiGroup: 'apps' },
    { name: 'jobs', kind: 'Job', apiGroup: 'batch' },
    { name: 'cronjobs', kind: 'CronJob', apiGroup: 'batch' },
    { name: 'notebooks', kind: 'Notebook', apiGroup: 'kubeflow.org' },
    { name: 'imagestreams', kind: 'ImageStream', apiGroup: 'image.openshift.io' },
    {
      name: 'hardwareprofiles',
      kind: 'HardwareProfile',
      apiGroup: 'infrastructure.opendatahub.io',
    },
    { name: 'networkpolicies', kind: 'NetworkPolicy', apiGroup: 'networking.k8s.io' },
    { name: 'ingresses', kind: 'Ingress', apiGroup: 'networking.k8s.io' },
    { name: 'storageclasses', kind: 'StorageClass', apiGroup: 'storage.k8s.io' },
    { name: 'roles', kind: 'Role', apiGroup: 'rbac.authorization.k8s.io' },
    { name: 'rolebindings', kind: 'RoleBinding', apiGroup: 'rbac.authorization.k8s.io' },
    { name: 'clusterroles', kind: 'ClusterRole', apiGroup: 'rbac.authorization.k8s.io' },
    {
      name: 'clusterrolebindings',
      kind: 'ClusterRoleBinding',
      apiGroup: 'rbac.authorization.k8s.io',
    },
  ],
};

const openDropdown = async () => {
  const combobox = screen.getByRole('combobox', { name: 'Resource types' });
  await act(async () => {
    fireEvent.keyDown(combobox, { key: 'ArrowDown' });
  });
};

describe('ResourcesTreeSelect', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the multi-select toggle', () => {
    render(
      <ResourcesTreeSelect
        selectedResources={[]}
        onSelectedResourcesChange={mockOnChange}
        apiResourcesData={mockApiResourcesData}
      />,
    );

    expect(screen.getByTestId('rule-resource-types-toggle')).toBeInTheDocument();
  });

  it('should show grouped options when opened', async () => {
    render(
      <ResourcesTreeSelect
        selectedResources={[]}
        onSelectedResourcesChange={mockOnChange}
        apiResourcesData={mockApiResourcesData}
      />,
    );

    await openDropdown();

    expect(screen.getByText('Core')).toBeInTheDocument();
    expect(screen.getByText('Applications')).toBeInTheDocument();
    expect(screen.getByText('Storage')).toBeInTheDocument();
    expect(screen.getByText('Networking')).toBeInTheDocument();
    expect(screen.getByText('RBAC')).toBeInTheDocument();
  });

  it('should show resource labels', async () => {
    render(
      <ResourcesTreeSelect
        selectedResources={[]}
        onSelectedResourcesChange={mockOnChange}
        apiResourcesData={mockApiResourcesData}
      />,
    );

    await openDropdown();

    expect(screen.getByText('Pods')).toBeInTheDocument();
    expect(screen.getByText('Services')).toBeInTheDocument();
    expect(screen.getByText('Workbenches (notebooks)')).toBeInTheDocument();
    expect(screen.getByText('Deployments')).toBeInTheDocument();
    expect(screen.getByText('Network policies')).toBeInTheDocument();
  });

  it('should show "All resources" option at the top', async () => {
    render(
      <ResourcesTreeSelect
        selectedResources={[]}
        onSelectedResourcesChange={mockOnChange}
        apiResourcesData={mockApiResourcesData}
      />,
    );

    await openDropdown();

    expect(screen.getByText('All resources')).toBeInTheDocument();
  });

  it('should show category headers with select-all behavior', async () => {
    render(
      <ResourcesTreeSelect
        selectedResources={[]}
        onSelectedResourcesChange={mockOnChange}
        apiResourcesData={mockApiResourcesData}
      />,
    );

    await openDropdown();

    expect(screen.getByTestId('select-multi-typeahead-Core')).toBeInTheDocument();
    expect(screen.getByTestId('select-multi-typeahead-Applications')).toBeInTheDocument();
    expect(screen.getByTestId('select-multi-typeahead-Storage')).toBeInTheDocument();
    expect(screen.getByTestId('select-multi-typeahead-Networking')).toBeInTheDocument();
    expect(screen.getByTestId('select-multi-typeahead-RBAC')).toBeInTheDocument();
  });

  it('should emit ["*"] when "All resources" is selected', async () => {
    render(
      <ResourcesTreeSelect
        selectedResources={[]}
        onSelectedResourcesChange={mockOnChange}
        apiResourcesData={mockApiResourcesData}
      />,
    );

    await openDropdown();

    const allResourcesOption = screen.getByText('All resources');
    await act(async () => {
      fireEvent.click(allResourcesOption);
    });

    expect(mockOnChange).toHaveBeenCalledWith(['*']);
  });

  it('should emit [] when "All resources" is deselected', async () => {
    render(
      <ResourcesTreeSelect
        selectedResources={['*']}
        onSelectedResourcesChange={mockOnChange}
        apiResourcesData={mockApiResourcesData}
      />,
    );

    await openDropdown();

    const menuItem = screen.getByTestId('select-multi-typeahead-All-resources');
    await act(async () => {
      fireEvent.click(within(menuItem).getByText('All resources'));
    });

    expect(mockOnChange).toHaveBeenCalledWith([]);
  });

  it('should select all resources in a category when category option is selected', async () => {
    render(
      <ResourcesTreeSelect
        selectedResources={[]}
        onSelectedResourcesChange={mockOnChange}
        apiResourcesData={mockApiResourcesData}
      />,
    );

    await openDropdown();

    const menuItem = screen.getByTestId('select-multi-typeahead-Networking');
    await act(async () => {
      fireEvent.click(within(menuItem).getByText('Networking'));
    });

    expect(mockOnChange).toHaveBeenCalledWith(['networkpolicies', 'ingresses']);
  });

  it('should deselect all resources in a category when category option is deselected', async () => {
    render(
      <ResourcesTreeSelect
        selectedResources={['networkpolicies', 'ingresses', 'pods']}
        onSelectedResourcesChange={mockOnChange}
        apiResourcesData={mockApiResourcesData}
      />,
    );

    await openDropdown();

    const menuItem = screen.getByTestId('select-multi-typeahead-Networking');
    await act(async () => {
      fireEvent.click(within(menuItem).getByText('Networking'));
    });

    const result = mockOnChange.mock.calls[0][0] as string[];
    expect(result).toContain('pods');
    expect(result).not.toContain('networkpolicies');
    expect(result).not.toContain('ingresses');
  });

  it('should deselect a category when "All resources" is active', async () => {
    render(
      <ResourcesTreeSelect
        selectedResources={['*']}
        onSelectedResourcesChange={mockOnChange}
        apiResourcesData={mockApiResourcesData}
      />,
    );

    await openDropdown();

    const menuItem = screen.getByTestId('select-multi-typeahead-Core');
    await act(async () => {
      fireEvent.click(within(menuItem).getByText('Core'));
    });

    const result = mockOnChange.mock.calls[0][0] as string[];
    expect(result).not.toContain('pods');
    expect(result).not.toContain('services');
    expect(result).not.toContain('configmaps');
    expect(result).not.toContain('namespaces');
    expect(result).not.toContain('events');
    expect(result).toContain('deployments');
    expect(result).toContain('networkpolicies');
  });

  it('should mark category as selected when all category resources are selected', async () => {
    render(
      <ResourcesTreeSelect
        selectedResources={['networkpolicies', 'ingresses']}
        onSelectedResourcesChange={mockOnChange}
        apiResourcesData={mockApiResourcesData}
      />,
    );

    await openDropdown();

    // Clicking "Networking" when already fully selected should deselect the category
    const menuItem = screen.getByTestId('select-multi-typeahead-Networking');
    await act(async () => {
      fireEvent.click(within(menuItem).getByText('Networking'));
    });

    const result = mockOnChange.mock.calls[0][0] as string[];
    expect(result).not.toContain('networkpolicies');
    expect(result).not.toContain('ingresses');
  });

  it('should mark all options as selected when "*" is in selectedResources', async () => {
    render(
      <ResourcesTreeSelect
        selectedResources={['*']}
        onSelectedResourcesChange={mockOnChange}
        apiResourcesData={mockApiResourcesData}
      />,
    );

    await openDropdown();

    // Verify "All resources" chip is shown in the toggle
    expect(screen.getByLabelText('Remove All resources')).toBeInTheDocument();

    // Clicking a resource when * is active should deselect all (since * covers everything)
    const menuItem = screen.getByTestId('select-multi-typeahead-All-resources');
    await act(async () => {
      fireEvent.click(within(menuItem).getByText('All resources'));
    });

    expect(mockOnChange).toHaveBeenCalledWith([]);
  });

  it('should show selected resources as labels in the toggle', () => {
    render(
      <ResourcesTreeSelect
        selectedResources={['pods', 'services']}
        onSelectedResourcesChange={mockOnChange}
        apiResourcesData={mockApiResourcesData}
      />,
    );

    expect(screen.getByText('Pods')).toBeInTheDocument();
    expect(screen.getByText('Services')).toBeInTheDocument();
  });

  it('should allow creating a custom resource', async () => {
    render(
      <ResourcesTreeSelect
        selectedResources={[]}
        onSelectedResourcesChange={mockOnChange}
        apiResourcesData={mockApiResourcesData}
      />,
    );

    const combobox = screen.getByRole('combobox', { name: 'Resource types' });
    await act(async () => {
      fireEvent.change(combobox, { target: { value: 'mycustomresource' } });
    });

    expect(screen.getByText('Use custom resource type "mycustomresource"')).toBeInTheDocument();
  });

  it('should filter resources not discovered on the cluster', async () => {
    const limitedData: ApiResourcesData = {
      apiGroups: ['', 'apps'],
      resources: [
        { name: 'pods', kind: 'Pod', apiGroup: '' },
        { name: 'deployments', kind: 'Deployment', apiGroup: 'apps' },
      ],
    };

    render(
      <ResourcesTreeSelect
        selectedResources={[]}
        onSelectedResourcesChange={mockOnChange}
        apiResourcesData={limitedData}
      />,
    );

    const combobox = screen.getByRole('combobox', { name: 'Resource types' });
    await act(async () => {
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    });

    expect(screen.getByText('Pods')).toBeInTheDocument();
    expect(screen.getByText('Deployments')).toBeInTheDocument();
    expect(screen.queryByText('Services')).not.toBeInTheDocument();
    expect(screen.queryByText('ConfigMaps')).not.toBeInTheDocument();
  });

  it('should emit ["*"] when "All resources" is toggled on with existing selections', async () => {
    render(
      <ResourcesTreeSelect
        selectedResources={['mycustom', 'pods']}
        onSelectedResourcesChange={mockOnChange}
        apiResourcesData={mockApiResourcesData}
      />,
    );

    await openDropdown();

    const allResourcesOption = screen.getByText('All resources');
    await act(async () => {
      fireEvent.click(allResourcesOption);
    });

    expect(mockOnChange).toHaveBeenCalledWith(['*']);
  });

  describe('Other category for unmapped resources', () => {
    const dataWithUnmapped: ApiResourcesData = {
      ...mockApiResourcesData,
      resources: [
        ...mockApiResourcesData.resources,
        { name: 'inferenceservices', kind: 'InferenceService', apiGroup: 'serving.kserve.io' },
        { name: 'trainedmodels', kind: 'TrainedModel', apiGroup: 'serving.kserve.io' },
      ],
    };

    it('should show "Other" category when unmapped resources are discovered', async () => {
      render(
        <ResourcesTreeSelect
          selectedResources={[]}
          onSelectedResourcesChange={mockOnChange}
          apiResourcesData={dataWithUnmapped}
        />,
      );

      await openDropdown();

      expect(screen.getByText('Other')).toBeInTheDocument();
      expect(screen.getByText('inferenceservices')).toBeInTheDocument();
      expect(screen.getByText('trainedmodels')).toBeInTheDocument();
    });

    it('should NOT show "Other" category when all resources are mapped', async () => {
      render(
        <ResourcesTreeSelect
          selectedResources={[]}
          onSelectedResourcesChange={mockOnChange}
          apiResourcesData={mockApiResourcesData}
        />,
      );

      await openDropdown();

      expect(screen.queryByText('Other')).not.toBeInTheDocument();
    });

    it('should NOT show "Other" category when discovery is empty (fallback mode)', async () => {
      const emptyData: ApiResourcesData = { apiGroups: [], resources: [] };

      render(
        <ResourcesTreeSelect
          selectedResources={[]}
          onSelectedResourcesChange={mockOnChange}
          apiResourcesData={emptyData}
        />,
      );

      await openDropdown();

      expect(screen.queryByText('Other')).not.toBeInTheDocument();
    });

    it('should allow selecting an unmapped resource from "Other"', async () => {
      render(
        <ResourcesTreeSelect
          selectedResources={[]}
          onSelectedResourcesChange={mockOnChange}
          apiResourcesData={dataWithUnmapped}
        />,
      );

      await openDropdown();

      const menuItem = screen.getByTestId('select-multi-typeahead-inferenceservices');
      await act(async () => {
        fireEvent.click(within(menuItem).getByText('inferenceservices'));
      });

      expect(mockOnChange).toHaveBeenCalledWith(['inferenceservices']);
    });

    it('should select all "Other" resources when category header is clicked', async () => {
      render(
        <ResourcesTreeSelect
          selectedResources={[]}
          onSelectedResourcesChange={mockOnChange}
          apiResourcesData={dataWithUnmapped}
        />,
      );

      await openDropdown();

      const menuItem = screen.getByTestId('select-multi-typeahead-Other');
      await act(async () => {
        fireEvent.click(within(menuItem).getByText('Other'));
      });

      expect(mockOnChange).toHaveBeenCalledWith(['inferenceservices', 'trainedmodels']);
    });

    it('should not treat unmapped resources as custom entries', async () => {
      render(
        <ResourcesTreeSelect
          selectedResources={['inferenceservices']}
          onSelectedResourcesChange={mockOnChange}
          apiResourcesData={dataWithUnmapped}
        />,
      );

      await openDropdown();

      const menuItem = screen.getByTestId('select-multi-typeahead-inferenceservices');
      expect(menuItem).toBeInTheDocument();
    });

    it('should not trigger category-toggle when resource named "all-category-other" is selected', async () => {
      const dataWithCollision: ApiResourcesData = {
        ...mockApiResourcesData,
        resources: [
          ...mockApiResourcesData.resources,
          { name: 'all-category-other', kind: 'Collider', apiGroup: 'test.io' },
          { name: 'normalresource', kind: 'Normal', apiGroup: 'test.io' },
        ],
      };

      render(
        <ResourcesTreeSelect
          selectedResources={[]}
          onSelectedResourcesChange={mockOnChange}
          apiResourcesData={dataWithCollision}
        />,
      );

      await openDropdown();

      const menuItem = screen.getByTestId('select-multi-typeahead-all-category-other');
      await act(async () => {
        fireEvent.click(within(menuItem).getByText('all-category-other'));
      });

      expect(mockOnChange).toHaveBeenCalledWith(['all-category-other']);
    });
  });

  it('should show category children when searching a category name with wildcard selected', async () => {
    render(
      <ResourcesTreeSelect
        selectedResources={['*']}
        onSelectedResourcesChange={mockOnChange}
        apiResourcesData={mockApiResourcesData}
      />,
    );

    const combobox = screen.getByRole('combobox', { name: 'Resource types' });
    await act(async () => {
      fireEvent.change(combobox, { target: { value: 'Core' } });
    });

    expect(screen.getByText('Core')).toBeInTheDocument();
    expect(screen.getByText('Pods')).toBeInTheDocument();
    expect(screen.getByText('Services')).toBeInTheDocument();
    expect(screen.getByText('ConfigMaps')).toBeInTheDocument();
  });

  it('should not create a duplicate option when selectedResources contains ALL_CATEGORY_PREFIX value', async () => {
    render(
      <ResourcesTreeSelect
        selectedResources={['__all_category__core', 'pods']}
        onSelectedResourcesChange={mockOnChange}
        apiResourcesData={mockApiResourcesData}
      />,
    );

    await openDropdown();

    // The category-prefixed value should be excluded from custom entries
    // so only the category header option exists with that ID — no duplicate
    const categoryOptions = screen.getAllByTestId('select-multi-typeahead-Core');
    expect(categoryOptions).toHaveLength(1);

    // Deselecting 'pods' should not emit the category prefix value
    const podsMenuItem = screen.getByTestId('select-multi-typeahead-Pods');
    await act(async () => {
      fireEvent.click(within(podsMenuItem).getByText('Pods'));
    });

    const result = mockOnChange.mock.calls[0][0] as string[];
    expect(result).not.toContain('__all_category__core');
  });

  describe('filterByApiGroups', () => {
    it('should show all resources when filterByApiGroups is undefined', async () => {
      render(
        <ResourcesTreeSelect
          selectedResources={[]}
          onSelectedResourcesChange={mockOnChange}
          apiResourcesData={mockApiResourcesData}
        />,
      );

      await openDropdown();

      expect(screen.getByText('Core')).toBeInTheDocument();
      expect(screen.getByText('Applications')).toBeInTheDocument();
      expect(screen.getByText('Storage')).toBeInTheDocument();
      expect(screen.getByText('Networking')).toBeInTheDocument();
      expect(screen.getByText('RBAC')).toBeInTheDocument();
    });

    it('should show all resources when filterByApiGroups is empty', async () => {
      render(
        <ResourcesTreeSelect
          selectedResources={[]}
          onSelectedResourcesChange={mockOnChange}
          apiResourcesData={mockApiResourcesData}
          filterByApiGroups={[]}
        />,
      );

      await openDropdown();

      expect(screen.getByText('Core')).toBeInTheDocument();
      expect(screen.getByText('Applications')).toBeInTheDocument();
      expect(screen.getByText('Storage')).toBeInTheDocument();
      expect(screen.getByText('Networking')).toBeInTheDocument();
      expect(screen.getByText('RBAC')).toBeInTheDocument();
    });

    it('should show all resources when filterByApiGroups contains wildcard', async () => {
      render(
        <ResourcesTreeSelect
          selectedResources={[]}
          onSelectedResourcesChange={mockOnChange}
          apiResourcesData={mockApiResourcesData}
          filterByApiGroups={['*']}
        />,
      );

      await openDropdown();

      expect(screen.getByText('Core')).toBeInTheDocument();
      expect(screen.getByText('Applications')).toBeInTheDocument();
      expect(screen.getByText('Storage')).toBeInTheDocument();
      expect(screen.getByText('Networking')).toBeInTheDocument();
      expect(screen.getByText('RBAC')).toBeInTheDocument();
    });

    it('should filter resources to only show those in selected API groups', async () => {
      render(
        <ResourcesTreeSelect
          selectedResources={[]}
          onSelectedResourcesChange={mockOnChange}
          apiResourcesData={mockApiResourcesData}
          filterByApiGroups={['apps']}
        />,
      );

      await openDropdown();

      expect(screen.getByText('Deployments')).toBeInTheDocument();
      expect(screen.getByText('StatefulSets')).toBeInTheDocument();
      expect(screen.getByText('DaemonSets')).toBeInTheDocument();
      expect(screen.queryByText('Pods')).not.toBeInTheDocument();
      expect(screen.queryByText('Network policies')).not.toBeInTheDocument();
      expect(screen.queryByText('Roles')).not.toBeInTheDocument();
    });

    it('should hide empty categories when all their resources are filtered out', async () => {
      render(
        <ResourcesTreeSelect
          selectedResources={[]}
          onSelectedResourcesChange={mockOnChange}
          apiResourcesData={mockApiResourcesData}
          filterByApiGroups={['networking.k8s.io']}
        />,
      );

      await openDropdown();

      expect(screen.getByText('Networking')).toBeInTheDocument();
      expect(screen.getByText('Network policies')).toBeInTheDocument();
      expect(screen.getByText('Ingresses')).toBeInTheDocument();
      expect(screen.queryByText('Core')).not.toBeInTheDocument();
      expect(screen.queryByText('Applications')).not.toBeInTheDocument();
      expect(screen.queryByText('Storage')).not.toBeInTheDocument();
      expect(screen.queryByText('RBAC')).not.toBeInTheDocument();
    });

    it('should filter core group resources using empty string', async () => {
      render(
        <ResourcesTreeSelect
          selectedResources={[]}
          onSelectedResourcesChange={mockOnChange}
          apiResourcesData={mockApiResourcesData}
          filterByApiGroups={['']}
        />,
      );

      await openDropdown();

      expect(screen.getByText('Core')).toBeInTheDocument();
      expect(screen.getByText('Pods')).toBeInTheDocument();
      expect(screen.getByText('Services')).toBeInTheDocument();
      expect(screen.getByText('Persistent volumes')).toBeInTheDocument();
      expect(screen.getByText('Cluster storage (persistentvolumeclaims)')).toBeInTheDocument();
      expect(screen.queryByText('Storage')).not.toBeInTheDocument();
      expect(screen.queryByText('Storage classes')).not.toBeInTheDocument();
      expect(screen.queryByText('Deployments')).not.toBeInTheDocument();
      expect(screen.queryByText('Networking')).not.toBeInTheDocument();
      expect(screen.queryByText('RBAC')).not.toBeInTheDocument();
    });

    it('should show only storage.k8s.io resources when that API group is selected', async () => {
      render(
        <ResourcesTreeSelect
          selectedResources={[]}
          onSelectedResourcesChange={mockOnChange}
          apiResourcesData={mockApiResourcesData}
          filterByApiGroups={['storage.k8s.io']}
        />,
      );

      await openDropdown();

      expect(screen.getByText('Storage')).toBeInTheDocument();
      expect(screen.getByText('Storage classes')).toBeInTheDocument();
      expect(screen.queryByText('Persistent volumes')).not.toBeInTheDocument();
      expect(
        screen.queryByText('Cluster storage (persistentvolumeclaims)'),
      ).not.toBeInTheDocument();
      expect(screen.queryByText('Core')).not.toBeInTheDocument();
      expect(screen.queryByText('Pods')).not.toBeInTheDocument();
    });

    it('should show resources from multiple selected API groups', async () => {
      render(
        <ResourcesTreeSelect
          selectedResources={[]}
          onSelectedResourcesChange={mockOnChange}
          apiResourcesData={mockApiResourcesData}
          filterByApiGroups={['apps', 'batch']}
        />,
      );

      await openDropdown();

      expect(screen.getByText('Applications')).toBeInTheDocument();
      expect(screen.getByText('Deployments')).toBeInTheDocument();
      expect(screen.getByText('Jobs')).toBeInTheDocument();
      expect(screen.getByText('CronJobs')).toBeInTheDocument();
      expect(screen.queryByText('Core')).not.toBeInTheDocument();
      expect(screen.queryByText('Pods')).not.toBeInTheDocument();
    });

    it('should not hide the resource tree when only a custom API group is selected', async () => {
      render(
        <ResourcesTreeSelect
          selectedResources={[]}
          onSelectedResourcesChange={mockOnChange}
          apiResourcesData={mockApiResourcesData}
          filterByApiGroups={['custom.example.io']}
        />,
      );

      await openDropdown();

      expect(screen.getByText('All resources')).toBeInTheDocument();
      expect(screen.getByText('Core')).toBeInTheDocument();
      expect(screen.getByText('Pods')).toBeInTheDocument();
      expect(screen.getByText('Applications')).toBeInTheDocument();
    });

    it('should still filter to known groups when mixed with a custom API group', async () => {
      render(
        <ResourcesTreeSelect
          selectedResources={[]}
          onSelectedResourcesChange={mockOnChange}
          apiResourcesData={mockApiResourcesData}
          filterByApiGroups={['apps', 'custom.example.io']}
        />,
      );

      await openDropdown();

      expect(screen.getByText('Deployments')).toBeInTheDocument();
      expect(screen.queryByText('Pods')).not.toBeInTheDocument();
    });

    it('should always show the "All resources" wildcard option regardless of filter', async () => {
      render(
        <ResourcesTreeSelect
          selectedResources={[]}
          onSelectedResourcesChange={mockOnChange}
          apiResourcesData={mockApiResourcesData}
          filterByApiGroups={['apps']}
        />,
      );

      await openDropdown();

      expect(screen.getByText('All resources')).toBeInTheDocument();
    });
  });
});
