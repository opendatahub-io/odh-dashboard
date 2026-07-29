import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { mockInferenceServiceK8sResource } from '#~/__mocks__/mockInferenceServiceK8sResource';
import InferenceServiceLastDeployed from '#~/pages/modelServing/screens/global/InferenceServiceLastDeployed';

describe('InferenceServiceLastDeployed', () => {
  it('should show timestamp for a ready model', () => {
    const inferenceService = mockInferenceServiceK8sResource({
      isReady: true,
      lastTransitionTime: '2024-01-15T10:00:00Z',
    });

    render(<InferenceServiceLastDeployed inferenceService={inferenceService} />);
    expect(screen.getByTestId('last-deployed-timestamp')).toBeInTheDocument();
  });

  it('should show timestamp for a stopped model', () => {
    const inferenceService = mockInferenceServiceK8sResource({
      isReady: false,
      lastTransitionTime: '2024-01-15T10:00:00Z',
    });
    inferenceService.metadata.annotations = {
      ...inferenceService.metadata.annotations,
      'serving.kserve.io/stop': 'true',
    };

    render(<InferenceServiceLastDeployed inferenceService={inferenceService} />);
    expect(screen.getByTestId('last-deployed-timestamp')).toBeInTheDocument();
  });

  it('should show - when no status conditions exist', () => {
    const inferenceService = mockInferenceServiceK8sResource({
      missingStatus: true,
    });

    const { container } = render(
      <InferenceServiceLastDeployed inferenceService={inferenceService} />,
    );
    expect(container.textContent).toBe('-');
  });
});
