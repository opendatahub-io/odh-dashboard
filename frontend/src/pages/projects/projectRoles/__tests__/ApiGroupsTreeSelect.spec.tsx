import * as React from 'react';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import ApiGroupsTreeSelect from '#~/pages/projects/projectRoles/ApiGroupsTreeSelect';
import type { ApiResourcesData } from '#~/pages/projects/projectRoles/useApiResources';

const mockApiResourcesData: ApiResourcesData = {
  apiGroups: [
    '',
    'apps',
    'batch',
    'kubeflow.org',
    'image.openshift.io',
    'infrastructure.opendatahub.io',
    'storage.k8s.io',
    'snapshot.storage.k8s.io',
    'networking.k8s.io',
    'k8s.cni.cncf.io',
    'rbac.authorization.k8s.io',
  ],
  resources: [],
};

const openDropdown = async () => {
  const combobox = screen.getByRole('combobox', { name: 'API groups' });
  await act(async () => {
    fireEvent.keyDown(combobox, { key: 'ArrowDown' });
  });
};

describe('ApiGroupsTreeSelect', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the multi-select toggle', () => {
    render(
      <ApiGroupsTreeSelect
        selectedApiGroups={[]}
        onSelectedApiGroupsChange={mockOnChange}
        apiResourcesData={mockApiResourcesData}
      />,
    );

    expect(screen.getByTestId('rule-api-groups-toggle')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'API groups' })).toBeInTheDocument();
  });

  it('should show "All API groups" option and category headers when opened', async () => {
    render(
      <ApiGroupsTreeSelect
        selectedApiGroups={[]}
        onSelectedApiGroupsChange={mockOnChange}
        apiResourcesData={mockApiResourcesData}
      />,
    );

    await openDropdown();

    expect(screen.getByText('All API groups')).toBeInTheDocument();
    expect(screen.getByTestId('select-multi-typeahead-Core')).toBeInTheDocument();
    expect(screen.getByTestId('select-multi-typeahead-Applications')).toBeInTheDocument();
    expect(screen.getByTestId('select-multi-typeahead-Storage')).toBeInTheDocument();
    expect(screen.getByTestId('select-multi-typeahead-Networking')).toBeInTheDocument();
    expect(screen.getByTestId('select-multi-typeahead-RBAC')).toBeInTheDocument();
  });

  it('should show API group names and descriptions', async () => {
    render(
      <ApiGroupsTreeSelect
        selectedApiGroups={[]}
        onSelectedApiGroupsChange={mockOnChange}
        apiResourcesData={mockApiResourcesData}
      />,
    );

    await openDropdown();

    expect(screen.getByText('core')).toBeInTheDocument();
    expect(screen.getByText('Pods, services, configmaps, namespaces, events')).toBeInTheDocument();
    expect(screen.getByText('apps')).toBeInTheDocument();
    expect(screen.getByText('Deployments, StatefulSets, DaemonSets')).toBeInTheDocument();
  });

  it('should emit ["*"] when "All API groups" is selected', async () => {
    render(
      <ApiGroupsTreeSelect
        selectedApiGroups={[]}
        onSelectedApiGroupsChange={mockOnChange}
        apiResourcesData={mockApiResourcesData}
      />,
    );

    await openDropdown();

    const allOption = screen.getByText('All API groups');
    await act(async () => {
      fireEvent.click(allOption);
    });

    expect(mockOnChange).toHaveBeenCalledWith(['*']);
  });

  it('should emit [] when "All API groups" is deselected', async () => {
    render(
      <ApiGroupsTreeSelect
        selectedApiGroups={['*']}
        onSelectedApiGroupsChange={mockOnChange}
        apiResourcesData={mockApiResourcesData}
      />,
    );

    await openDropdown();

    const menuItem = screen.getByTestId('select-multi-typeahead-All-API-groups');
    await act(async () => {
      fireEvent.click(within(menuItem).getByText('All API groups'));
    });

    expect(mockOnChange).toHaveBeenCalledWith([]);
  });

  it('should select all groups in a category when category option is selected', async () => {
    render(
      <ApiGroupsTreeSelect
        selectedApiGroups={[]}
        onSelectedApiGroupsChange={mockOnChange}
        apiResourcesData={mockApiResourcesData}
      />,
    );

    await openDropdown();

    const menuItem = screen.getByTestId('select-multi-typeahead-Networking');
    await act(async () => {
      fireEvent.click(within(menuItem).getByText('Networking'));
    });

    expect(mockOnChange).toHaveBeenCalledWith(['networking.k8s.io', 'k8s.cni.cncf.io']);
  });

  it('should deselect a category when "All API groups" is active', async () => {
    render(
      <ApiGroupsTreeSelect
        selectedApiGroups={['*']}
        onSelectedApiGroupsChange={mockOnChange}
        apiResourcesData={mockApiResourcesData}
      />,
    );

    await openDropdown();

    const menuItem = screen.getByTestId('select-multi-typeahead-Core');
    await act(async () => {
      fireEvent.click(within(menuItem).getByText('Core'));
    });

    const result = mockOnChange.mock.calls[0][0] as string[];
    expect(result).not.toContain('');
    expect(result).toContain('apps');
    expect(result).toContain('networking.k8s.io');
  });

  it('should show selected groups as labels in the toggle', () => {
    render(
      <ApiGroupsTreeSelect
        selectedApiGroups={['apps', 'batch']}
        onSelectedApiGroupsChange={mockOnChange}
        apiResourcesData={mockApiResourcesData}
      />,
    );

    expect(screen.getByText('apps')).toBeInTheDocument();
    expect(screen.getByText('batch')).toBeInTheDocument();
  });

  it('should hide groups not present in discovered API groups', async () => {
    const limitedData: ApiResourcesData = {
      apiGroups: ['', 'apps'],
      resources: [],
    };

    render(
      <ApiGroupsTreeSelect
        selectedApiGroups={[]}
        onSelectedApiGroupsChange={mockOnChange}
        apiResourcesData={limitedData}
      />,
    );

    await openDropdown();

    expect(screen.getByText('core')).toBeInTheDocument();
    expect(screen.getByText('apps')).toBeInTheDocument();
    expect(screen.queryByText('batch')).not.toBeInTheDocument();
    expect(screen.queryByText('kubeflow.org')).not.toBeInTheDocument();
  });

  it('should allow creating a custom API group', async () => {
    render(
      <ApiGroupsTreeSelect
        selectedApiGroups={[]}
        onSelectedApiGroupsChange={mockOnChange}
        apiResourcesData={mockApiResourcesData}
      />,
    );

    const combobox = screen.getByRole('combobox', { name: 'API groups' });
    await act(async () => {
      fireEvent.change(combobox, { target: { value: 'custom.example.io' } });
    });

    expect(screen.getByText('Use custom API group "custom.example.io"')).toBeInTheDocument();
  });

  it('should map core group selection to empty string in callback', async () => {
    render(
      <ApiGroupsTreeSelect
        selectedApiGroups={[]}
        onSelectedApiGroupsChange={mockOnChange}
        apiResourcesData={mockApiResourcesData}
      />,
    );

    await openDropdown();

    const menuItem = screen.getByTestId('select-multi-typeahead-core');
    await act(async () => {
      fireEvent.click(within(menuItem).getByText('core'));
    });

    expect(mockOnChange).toHaveBeenCalledWith(['']);
  });

  it('should render core group chip when selectedApiGroups contains empty string', () => {
    render(
      <ApiGroupsTreeSelect
        selectedApiGroups={['']}
        onSelectedApiGroupsChange={mockOnChange}
        apiResourcesData={mockApiResourcesData}
      />,
    );

    expect(screen.getByText('core')).toBeInTheDocument();
  });

  it('should filter by category name showing all child groups', async () => {
    render(
      <ApiGroupsTreeSelect
        selectedApiGroups={[]}
        onSelectedApiGroupsChange={mockOnChange}
        apiResourcesData={mockApiResourcesData}
      />,
    );

    const combobox = screen.getByRole('combobox', { name: 'API groups' });
    await act(async () => {
      fireEvent.change(combobox, { target: { value: 'networking' } });
    });

    expect(screen.getByText('networking.k8s.io')).toBeInTheDocument();
    expect(screen.getByText('k8s.cni.cncf.io')).toBeInTheDocument();
    expect(screen.queryByText('apps')).not.toBeInTheDocument();
  });

  describe('Other category for unmapped API groups', () => {
    const dataWithUnmapped: ApiResourcesData = {
      ...mockApiResourcesData,
      apiGroups: [...mockApiResourcesData.apiGroups, 'serving.kserve.io', 'custom.example.com'],
    };

    it('should show "Other" category when unmapped API groups are discovered', async () => {
      render(
        <ApiGroupsTreeSelect
          selectedApiGroups={[]}
          onSelectedApiGroupsChange={mockOnChange}
          apiResourcesData={dataWithUnmapped}
        />,
      );

      await openDropdown();

      expect(screen.getByText('Other')).toBeInTheDocument();
      expect(screen.getByText('serving.kserve.io')).toBeInTheDocument();
      expect(screen.getByText('custom.example.com')).toBeInTheDocument();
    });

    it('should NOT show "Other" category when all groups are mapped', async () => {
      render(
        <ApiGroupsTreeSelect
          selectedApiGroups={[]}
          onSelectedApiGroupsChange={mockOnChange}
          apiResourcesData={mockApiResourcesData}
        />,
      );

      await openDropdown();

      expect(screen.queryByText('Other')).not.toBeInTheDocument();
    });

    it('should NOT show "Other" category when discovery is empty (fallback mode)', async () => {
      const emptyData: ApiResourcesData = { apiGroups: [], resources: [] };

      render(
        <ApiGroupsTreeSelect
          selectedApiGroups={[]}
          onSelectedApiGroupsChange={mockOnChange}
          apiResourcesData={emptyData}
        />,
      );

      await openDropdown();

      expect(screen.queryByText('Other')).not.toBeInTheDocument();
    });

    it('should allow selecting an unmapped API group from "Other"', async () => {
      render(
        <ApiGroupsTreeSelect
          selectedApiGroups={[]}
          onSelectedApiGroupsChange={mockOnChange}
          apiResourcesData={dataWithUnmapped}
        />,
      );

      await openDropdown();

      const menuItem = screen.getByTestId('select-multi-typeahead-serving-kserve-io');
      await act(async () => {
        fireEvent.click(within(menuItem).getByText('serving.kserve.io'));
      });

      expect(mockOnChange).toHaveBeenCalledWith(['serving.kserve.io']);
    });

    it('should select all "Other" groups when category header is clicked', async () => {
      render(
        <ApiGroupsTreeSelect
          selectedApiGroups={[]}
          onSelectedApiGroupsChange={mockOnChange}
          apiResourcesData={dataWithUnmapped}
        />,
      );

      await openDropdown();

      const menuItem = screen.getByTestId('select-multi-typeahead-Other');
      await act(async () => {
        fireEvent.click(within(menuItem).getByText('Other'));
      });

      expect(mockOnChange).toHaveBeenCalledWith(['serving.kserve.io', 'custom.example.com']);
    });

    it('should not treat unmapped API groups as custom entries', async () => {
      render(
        <ApiGroupsTreeSelect
          selectedApiGroups={['serving.kserve.io']}
          onSelectedApiGroupsChange={mockOnChange}
          apiResourcesData={dataWithUnmapped}
        />,
      );

      await openDropdown();

      const menuItem = screen.getByTestId('select-multi-typeahead-serving-kserve-io');
      expect(menuItem).toBeInTheDocument();
    });
  });

  it('should not convert a custom API group named "__core__" to empty string', async () => {
    render(
      <ApiGroupsTreeSelect
        selectedApiGroups={['__core__', 'apps']}
        onSelectedApiGroupsChange={mockOnChange}
        apiResourcesData={mockApiResourcesData}
      />,
    );

    await openDropdown();

    const appsMenuItem = screen.getByTestId('select-multi-typeahead-apps');
    await act(async () => {
      fireEvent.click(within(appsMenuItem).getByText('apps'));
    });

    const result = mockOnChange.mock.calls[0][0] as string[];
    expect(result).toContain('__core__');
    expect(result).not.toContain('');
  });

  it('should not convert a discovered group named "__core__" to empty string', async () => {
    const dataWithCoreCollision: ApiResourcesData = {
      apiGroups: [...mockApiResourcesData.apiGroups, '__core__'],
      resources: [],
    };

    render(
      <ApiGroupsTreeSelect
        selectedApiGroups={['__core__', 'apps']}
        onSelectedApiGroupsChange={mockOnChange}
        apiResourcesData={dataWithCoreCollision}
      />,
    );

    await openDropdown();

    const appsMenuItem = screen.getByTestId('select-multi-typeahead-apps');
    await act(async () => {
      fireEvent.click(within(appsMenuItem).getByText('apps'));
    });

    const result = mockOnChange.mock.calls[0][0] as string[];
    expect(result).toContain('__core__');
    expect(result).not.toContain('');
  });

  it('should not create a duplicate option when selectedApiGroups contains CORE_GROUP_ID sentinel', async () => {
    render(
      <ApiGroupsTreeSelect
        selectedApiGroups={['__builtin_core_group__', 'apps']}
        onSelectedApiGroupsChange={mockOnChange}
        apiResourcesData={mockApiResourcesData}
      />,
    );

    await openDropdown();

    // The sentinel value should be silently excluded from custom entries (not a valid K8s name)
    // so only the built-in core option exists with that ID — no duplicate
    const coreOptions = screen.getAllByTestId('select-multi-typeahead-core');
    expect(coreOptions).toHaveLength(1);

    // Deselecting 'apps' should not emit the sentinel as a raw value
    const appsMenuItem = screen.getByTestId('select-multi-typeahead-apps');
    await act(async () => {
      fireEvent.click(within(appsMenuItem).getByText('apps'));
    });

    const result = mockOnChange.mock.calls[0][0] as string[];
    expect(result).not.toContain('__builtin_core_group__');
  });

  it('should not create a duplicate option when selectedApiGroups contains ALL_CATEGORY_PREFIX value', async () => {
    render(
      <ApiGroupsTreeSelect
        selectedApiGroups={['__all_category__core', 'apps']}
        onSelectedApiGroupsChange={mockOnChange}
        apiResourcesData={mockApiResourcesData}
      />,
    );

    await openDropdown();

    // The category-prefixed value should be excluded from custom entries
    // so only the category header option exists with that ID — no duplicate
    const categoryOptions = screen.getAllByTestId('select-multi-typeahead-Core');
    expect(categoryOptions).toHaveLength(1);

    // Deselecting 'apps' should not emit the category prefix value
    const appsMenuItem = screen.getByTestId('select-multi-typeahead-apps');
    await act(async () => {
      fireEvent.click(within(appsMenuItem).getByText('apps'));
    });

    const result = mockOnChange.mock.calls[0][0] as string[];
    expect(result).not.toContain('__all_category__core');
  });
});
