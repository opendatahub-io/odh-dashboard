import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { checkAccess } from '@odh-dashboard/k8s-core/api/accessReview';
import { useAccessReview } from '@odh-dashboard/plugin-core/host-api';
import HostApiProvider from '../HostApiProvider';

jest.mock('@odh-dashboard/k8s-core/api/accessReview', () => ({
  checkAccess: jest.fn(),
}));

const checkAccessMock = jest.mocked(checkAccess);

const AccessReview: React.FC = () => {
  const [allowed, loaded] = useAccessReview({
    group: 'monitoring.rhobs.com',
    resource: 'metrics',
    verb: 'get',
  });

  return <div data-testid="access-result">{`${allowed}-${loaded}`}</div>;
};

describe('HostApiProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses the portal Kubernetes client for access reviews', async () => {
    checkAccessMock.mockResolvedValue(true);

    render(
      <HostApiProvider>
        <AccessReview />
      </HostApiProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('access-result').textContent).toBe('true-true'));
    expect(checkAccessMock).toHaveBeenCalledWith(
      {
        group: 'monitoring.rhobs.com',
        resource: 'metrics',
        subresource: '',
        verb: 'get',
        name: '',
        namespace: '',
      },
      { failureMode: 'reject' },
    );
  });

  it('should deny access and finish loading when the review fails', async () => {
    checkAccessMock.mockRejectedValue(new Error('network unavailable'));

    render(
      <HostApiProvider>
        <AccessReview />
      </HostApiProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('access-result').textContent).toBe('false-true'));
    expect(checkAccessMock).toHaveBeenCalledTimes(1);
  });
});
