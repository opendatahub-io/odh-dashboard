import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { checkAccess } from '@odh-dashboard/k8s-core/api/accessReview';
import { HostApiCoreContext } from '@odh-dashboard/plugin-core/host-api';
import HostApiProvider from '../HostApiProvider';

jest.mock('@odh-dashboard/k8s-core/api/accessReview', () => ({
  checkAccess: jest.fn(),
}));

const checkAccessMock = jest.mocked(checkAccess);

const AccessReview: React.FC = () => {
  const { checkAccess: checkHostAccess } = React.useContext(HostApiCoreContext);
  const [allowed, setAllowed] = React.useState<boolean>();

  React.useEffect(() => {
    void checkHostAccess({
      group: 'monitoring.rhobs.com',
      resource: 'metrics',
      subresource: '',
      verb: 'get',
      name: '',
      namespace: '',
    }).then(setAllowed);
  }, [checkHostAccess]);

  return <div data-testid="access-result">{String(allowed)}</div>;
};

describe('HostApiProvider', () => {
  it('uses the portal Kubernetes client for access reviews', async () => {
    checkAccessMock.mockResolvedValue(true);

    render(
      <HostApiProvider>
        <AccessReview />
      </HostApiProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('access-result').textContent).toBe('true'));
    expect(checkAccessMock).toHaveBeenCalledWith(
      {
        group: 'monitoring.rhobs.com',
        resource: 'metrics',
        subresource: '',
        verb: 'get',
        name: '',
        namespace: '',
      },
      { defaultAllowed: false },
    );
  });
});
