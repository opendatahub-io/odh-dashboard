import * as React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { mockServingRuntimeK8sResource } from '#~/__mocks__/mockServingRuntimeK8sResource';
import { useTemplateByName } from '#~/pages/modelServing/customServingRuntimes/useTemplateByName';
import InferenceServiceServingRuntime from '#~/pages/modelServing/screens/global/InferenceServiceServingRuntime';
import { mockServingRuntimeTemplateK8sResource } from '#~/__mocks__/mockServingRuntimeTemplateK8sResource';

jest.mock('#~/pages/modelServing/customServingRuntimes/useTemplateByName', () => ({
  useTemplateByName: jest.fn(),
}));

const useTemplateByNameMock = useTemplateByName as jest.Mock;

describe('InferenceServiceServingRuntime', () => {
  beforeEach(() => {
    useTemplateByNameMock.mockReturnValue([null, true, null]);
  });

  it('should handle undefined serving runtime', () => {
    const { container } = render(<InferenceServiceServingRuntime />);
    expect(container.textContent).toBe('Unknown');
  });

  it('should display serving runtime name', () => {
    const mockServingRuntime = mockServingRuntimeK8sResource({});
    const { getByText } = render(
      <InferenceServiceServingRuntime servingRuntime={mockServingRuntime} />,
    );
    expect(getByText('OpenVINO Serving Runtime (Supports GPUs)')).toBeVisible();
  });

  it('should show "Latest" status when versions match', async () => {
    const mockServingRuntime = mockServingRuntimeK8sResource({ version: '1.0.0' });
    const mockTemplate = mockServingRuntimeTemplateK8sResource({
      name: 'test-template',
      version: '1.0.0',
    });
    useTemplateByNameMock.mockReturnValue([mockTemplate, true, null]);

    const { findByText } = render(
      <InferenceServiceServingRuntime servingRuntime={mockServingRuntime} />,
    );

    await findByText('Latest');
  });

  it('should show "Outdated" status when versions do not match', async () => {
    const mockServingRuntime = mockServingRuntimeK8sResource({ version: '1.0.0' });
    const mockTemplate = mockServingRuntimeTemplateK8sResource({
      name: 'test-template',
      version: '2.0.0',
    });
    useTemplateByNameMock.mockReturnValue([mockTemplate, true, null]);

    const { findByText } = render(
      <InferenceServiceServingRuntime servingRuntime={mockServingRuntime} />,
    );

    await findByText('Outdated');
  });
});
