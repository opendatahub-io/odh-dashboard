import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockPVCK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockPVCK8sResource';
import Fields, {
  isNIMPVC,
  NIM_PVC_ANNOTATION,
  NIM_PVC_SUBPATH_ANNOTATION,
} from '../clusterStorage';

describe('isNIMPVC', () => {
  it('should identify a PVC with the NIM annotation', () => {
    const pvc = mockPVCK8sResource({ annotations: { [NIM_PVC_ANNOTATION]: 'true' } });

    expect(isNIMPVC(pvc)).toBe(true);
  });

  it('should reject a PVC without the NIM annotation', () => {
    expect(isNIMPVC(mockPVCK8sResource({}))).toBe(false);
  });
});

describe('NIM storage fields', () => {
  it('should load and report the PVC subpath', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    const pvc = mockPVCK8sResource({
      annotations: {
        [NIM_PVC_ANNOTATION]: 'true',
        [NIM_PVC_SUBPATH_ANNOTATION]: 'arctic-embed-l',
      },
    });

    render(<Fields existingPvc={pvc} onChange={onChange} />);

    const input = screen.getByTestId('nim-subpath-input');
    expect(input).toHaveValue('arctic-embed-l');

    await user.clear(input);
    expect(onChange).toHaveBeenLastCalledWith({
      [NIM_PVC_SUBPATH_ANNOTATION]: '',
    });
    await user.type(input, 'new-model-path');

    expect(onChange).toHaveBeenLastCalledWith({
      [NIM_PVC_SUBPATH_ANNOTATION]: 'new-model-path',
    });
  });
});
