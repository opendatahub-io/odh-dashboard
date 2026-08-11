import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MODEL_CAPABILITIES_ANNOTATION } from '../../../shared/modelCapabilities';
import DeploymentCapabilities from '../DeploymentCapabilities';
import type { Deployment } from '../../../../extension-points';

const mockDeployment = (annotations?: Record<string, string>): Deployment =>
  ({
    modelServingPlatformId: 'test-platform',
    model: {
      apiVersion: 'v1',
      kind: 'InferenceService',
      metadata: {
        name: 'test-deployment',
        namespace: 'test-project',
        annotations,
      },
    },
  } as unknown as Deployment);

describe('DeploymentCapabilities', () => {
  it('should render nothing when annotations are undefined', () => {
    const { container } = render(<DeploymentCapabilities deployment={mockDeployment(undefined)} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('should render nothing when capabilities annotation is absent', () => {
    const { container } = render(
      <DeploymentCapabilities deployment={mockDeployment({ other: 'value' })} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('should render nothing when capabilities annotation is malformed', () => {
    const { container } = render(
      <DeploymentCapabilities
        deployment={mockDeployment({ [MODEL_CAPABILITIES_ANNOTATION]: 'bad-json' })}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('should render nothing when capabilities is an empty array', () => {
    const { container } = render(
      <DeploymentCapabilities
        deployment={mockDeployment({ [MODEL_CAPABILITIES_ANNOTATION]: '[]' })}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('should render a single capability label', () => {
    render(
      <DeploymentCapabilities
        deployment={mockDeployment({
          [MODEL_CAPABILITIES_ANNOTATION]: JSON.stringify(['Vision']),
        })}
      />,
    );
    expect(screen.getByTestId('deployment-capabilities')).toBeInTheDocument();
    expect(screen.getByText('Vision')).toBeInTheDocument();
    expect(screen.queryByText(/^\+\d/)).not.toBeInTheDocument();
  });

  it('should render two capability labels without overflow', () => {
    render(
      <DeploymentCapabilities
        deployment={mockDeployment({
          [MODEL_CAPABILITIES_ANNOTATION]: JSON.stringify(['Vision', 'Transcription']),
        })}
      />,
    );
    expect(screen.getByText('Vision')).toBeInTheDocument();
    expect(screen.getByText('Transcription')).toBeInTheDocument();
    expect(screen.queryByText(/^\+\d/)).not.toBeInTheDocument();
  });

  it('should render two labels with overflow indicator when more than 2 capabilities', () => {
    render(
      <DeploymentCapabilities
        deployment={mockDeployment({
          [MODEL_CAPABILITIES_ANNOTATION]: JSON.stringify([
            'Vision',
            'Transcription',
            'CodeGen',
            'Summarization',
          ]),
        })}
      />,
    );
    expect(screen.getByText('Vision')).toBeInTheDocument();
    expect(screen.getByText('Transcription')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
    expect(screen.queryByText('CodeGen')).not.toBeInTheDocument();
    expect(screen.queryByText('Summarization')).not.toBeInTheDocument();
  });
});
