import * as React from 'react';
import { act } from 'react';
import { render, fireEvent } from '@testing-library/react';
import ManageInferenceServiceModal from '#~/pages/modelServing/screens/projects/InferenceServiceModal/ManageInferenceServiceModal';
import { mockProjectK8sResource } from '#~/__mocks__/mockProjectK8sResource';
import useServingRuntimes from '#~/pages/modelServing/useServingRuntimes';
import { mockServingRuntimeK8sResource } from '#~/__mocks__/mockServingRuntimeK8sResource';
import { useAppContext } from '#~/app/AppContext';
import { mockDashboardConfig } from '#~/__mocks__';

jest.mock('#~/pages/modelServing/useServingRuntimes', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('#~/app/AppContext', () => ({
  __esModule: true,
  useAppContext: jest.fn(),
}));

jest.mock('#~/pages/modelServing/screens/projects/useModelDeploymentNotification', () => ({
  useModelDeploymentNotification: () => ({
    watchDeployment: jest.fn(),
  }),
}));

jest.mock('#~/redux/selectors', () => ({
  useDashboardNamespace: jest.fn(() => ({ dashboardNamespace: 'opendatahub' })),
}));

const useServingRuntimesMock = jest.mocked(useServingRuntimes);
const useAppContextMock = jest.mocked(useAppContext);

describe('ManageInferenceServiceModal', () => {
  it('should not re-render serving runtime selection', async () => {
    useServingRuntimesMock.mockReturnValue({
      data: {
        items: [
          mockServingRuntimeK8sResource({ name: 'runtime1', displayName: 'Runtime 1' }),
          mockServingRuntimeK8sResource({ name: 'runtime2' }),
        ],
        hasNonDashboardItems: false,
      },
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    console.log('here 1', Date.now());

    useAppContextMock.mockReturnValue({
      buildStatuses: [],
      dashboardConfig: mockDashboardConfig({}),
      storageClasses: [],
      isRHOAI: false,
    });

    console.log('here 2', Date.now());
    const currentProject = mockProjectK8sResource({});
    const wrapper = render(
      <ManageInferenceServiceModal
        projectContext={{
          currentProject,
          connections: [],
        }}
        onClose={jest.fn()}
      />,
    );

    console.log('here 3', Date.now());
    // Find the dropdown
    const dropdown = await wrapper.findByText('Select a model server');

    console.log('here 4', Date.now());
    fireEvent.click(dropdown);

    console.log('here 5', Date.now());
    const option = await wrapper.findByText('Runtime 1');
    console.log('here 6', Date.now());
    fireEvent.click(option);
    console.log('here 7', Date.now());
    expect(dropdown.textContent).toBe('Runtime 1');

    console.log('here 8', Date.now());
    const projectChange = mockProjectK8sResource({ phase: 'Terminating' });

    console.log('here 9', Date.now());
    // Change the currentProject prop
    await act(async () => {
      wrapper.rerender(
        <ManageInferenceServiceModal
          projectContext={{
            currentProject: projectChange,
            connections: [],
          }}
          onClose={jest.fn()}
        />,
      );
    });

    console.log('here', Date.now());
    expect(dropdown.textContent).toBe('Runtime 1');
  });
});
