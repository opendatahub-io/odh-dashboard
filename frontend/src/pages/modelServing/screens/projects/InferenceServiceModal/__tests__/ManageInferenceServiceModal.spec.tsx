import * as React from 'react';
import { act } from 'react';
import { render, fireEvent } from '@testing-library/react';
import ManageInferenceServiceModal from '~/pages/modelServing/screens/projects/InferenceServiceModal/ManageInferenceServiceModal';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import useServingRuntimes from '~/pages/modelServing/useServingRuntimes';
import { mockServingRuntimeK8sResource } from '~/__mocks__/mockServingRuntimeK8sResource';
import { useAppContext } from '~/app/AppContext';
import { mockDashboardConfig } from '~/__mocks__';

jest.mock('~/pages/modelServing/useServingRuntimes', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('~/app/AppContext', () => ({
  __esModule: true,
  useAppContext: jest.fn(),
}));

jest.mock('~/pages/modelServing/screens/projects/useModelDeploymentNotification', () => ({
  useModelDeploymentNotification: () => ({
    watchDeployment: jest.fn(),
  }),
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

    useAppContextMock.mockReturnValue({
      buildStatuses: [],
      dashboardConfig: mockDashboardConfig({}),
      storageClasses: [],
      isRHOAI: false,
    });

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

    // Find the dropdown
    const dropdown = await wrapper.findByText('Select a model server');

    fireEvent.click(dropdown);

    const option = await wrapper.findByText('Runtime 1');
    fireEvent.click(option);
    expect(dropdown.textContent).toBe('Runtime 1');

    const projectChange = mockProjectK8sResource({ phase: 'Terminating' });

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

    expect(dropdown.textContent).toBe('Runtime 1');
  });
});
