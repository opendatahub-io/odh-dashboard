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
});
