import * as React from 'react';
import { render, act, fireEvent } from '@testing-library/react';
import ManageInferenceServiceModal from '~/pages/modelServing/screens/projects/InferenceServiceModal/ManageInferenceServiceModal';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import useServingRuntimes from '~/pages/modelServing/useServingRuntimes';
import { mockServingRuntimeK8sResource } from '~/__mocks__/mockServingRuntimeK8sResource';

jest.mock('~/pages/modelServing/useServingRuntimes', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const useServingRuntimesMock = jest.mocked(useServingRuntimes);

describe('ManageInferenceServiceModal', () => {
  it('should not rerender serving runtime selection', async () => {
    useServingRuntimesMock.mockReturnValue([
      [
        mockServingRuntimeK8sResource({ name: 'runtime1', displayName: 'Runtime 1' }),
        mockServingRuntimeK8sResource({ name: 'runtime2' }),
      ],
      true,
      undefined,
      jest.fn(),
    ]);

    const currentProject = mockProjectK8sResource({});
    const wrapper = render(
      <ManageInferenceServiceModal
        isOpen={true}
        projectContext={{
          currentProject,
          dataConnections: [],
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
          isOpen={true}
          projectContext={{
            currentProject: projectChange,
            dataConnections: [],
          }}
          onClose={jest.fn()}
        />,
      );
    });

    expect(dropdown.textContent).toBe('Runtime 1');
  });
});
