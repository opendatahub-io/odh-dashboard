import * as React from 'react';
import { render } from '@testing-library/react';
import InferenceServiceServingRuntime from '#~/pages/modelServing/screens/global/InferenceServiceServingRuntime';
import { mockServingRuntimeK8sResource } from '#~/__mocks__/mockServingRuntimeK8sResource';

describe('InferenceServiceServingRuntime', () => {
  it('should handle undefined serving runtime', () => {
    const wrapper = render(<InferenceServiceServingRuntime />);
    expect(wrapper.container.textContent).toBe('Unknown');
  });

  it('should display serving runtime name', () => {
    const mockServingRuntime = mockServingRuntimeK8sResource({});
    const wrapper = render(<InferenceServiceServingRuntime servingRuntime={mockServingRuntime} />);
    expect(wrapper.container.textContent).toBe('OpenVINO Serving Runtime (Supports GPUs)');
  });
});
