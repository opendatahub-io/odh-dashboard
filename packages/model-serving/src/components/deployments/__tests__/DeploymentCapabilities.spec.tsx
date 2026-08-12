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
  it('should render a dash when annotations are undefined', () => {
    render(<DeploymentCapabilities deployment={mockDeployment(undefined)} />);
    expect(screen.getByText('-')).toBeInTheDocument();
    expect(screen.queryByTestId('deployment-capabilities')).not.toBeInTheDocument();
  });

  it('should render a dash when capabilities annotation is absent', () => {
    render(<DeploymentCapabilities deployment={mockDeployment({ other: 'value' })} />);
    expect(screen.getByText('-')).toBeInTheDocument();
    expect(screen.queryByTestId('deployment-capabilities')).not.toBeInTheDocument();
  });

  it('should render a dash when capabilities annotation is malformed', () => {
    render(
      <DeploymentCapabilities
        deployment={mockDeployment({ [MODEL_CAPABILITIES_ANNOTATION]: 'bad-json' })}
      />,
    );
    expect(screen.getByText('-')).toBeInTheDocument();
    expect(screen.queryByTestId('deployment-capabilities')).not.toBeInTheDocument();
  });

  it('should render a dash when capabilities is an empty array', () => {
    render(
      <DeploymentCapabilities
        deployment={mockDeployment({ [MODEL_CAPABILITIES_ANNOTATION]: '[]' })}
      />,
    );
    expect(screen.getByText('-')).toBeInTheDocument();
    expect(screen.queryByTestId('deployment-capabilities')).not.toBeInTheDocument();
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
