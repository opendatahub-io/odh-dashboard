import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { DeviceAllocationMode, type DeviceRequest } from '@odh-dashboard/k8s-core/dra/types';
import { mockResourceClaimTemplate } from '@odh-dashboard/k8s-core/__mocks__/mockResourceClaimTemplate';
import DeviceRequestsSection from '../DeviceRequestsSection';

const renderLoaded = (requests: DeviceRequest[]) =>
  render(
    <DeviceRequestsSection
      templateName="single-gpu"
      namespace="a-test-project"
      lookup={{
        status: 'loaded',
        resource: mockResourceClaimTemplate({ name: 'single-gpu', requests }),
      }}
    />,
  );

describe('DeviceRequestsSection', () => {
  it('should show an unknown allocation mode as the raw mode string', () => {
    renderLoaded([
      {
        name: 'gpu',
        exactly: {
          deviceClassName: 'gpu.nvidia.com',
          // Future upstream modes must not be guessed at.
          allocationMode: 'SomeFutureMode' as DeviceAllocationMode,
        },
      },
    ]);

    expect(screen.getByTestId('device-request-0-count')).toHaveTextContent(/^SomeFutureMode$/);
  });

  it('should show a neutral line for an unknown request shape', () => {
    renderLoaded([{ name: 'gpu' }]);

    expect(screen.getByTestId('device-request-0-unknown')).toHaveTextContent(
      'This request cannot be displayed.',
    );
    expect(screen.queryByTestId('device-request-0-device-class')).not.toBeInTheDocument();
  });

  it('should say when the template has no device requests', () => {
    renderLoaded([]);

    expect(screen.getByTestId('device-requests-empty')).toHaveTextContent(
      'This template has no device requests.',
    );
    expect(screen.getByTestId('device-requests-claim-template')).toHaveTextContent('single-gpu');
    expect(screen.queryByTestId('device-request-0-count')).not.toBeInTheDocument();
  });

  it('should render an All alternative with a devices label', () => {
    renderLoaded([
      {
        name: 'gpu',
        firstAvailable: [
          {
            name: 'all',
            deviceClassName: 'gpu.nvidia.com',
            allocationMode: DeviceAllocationMode.ALL,
          },
        ],
      },
    ]);

    expect(screen.getByTestId('device-request-0-alternative-0')).toHaveTextContent(
      'All devices · gpu.nvidia.com',
    );
  });

  it('should use an info alert when the namespace is unknown', () => {
    render(<DeviceRequestsSection templateName="single-gpu" lookup={{ status: 'noNamespace' }} />);

    const alert = screen.getByTestId('device-requests-no-namespace');
    expect(alert).toHaveTextContent('Device request details unavailable');
    expect(alert).toHaveTextContent('Info alert');
    expect(screen.getByTestId('device-requests-claim-template')).toHaveTextContent('single-gpu');
  });
});
