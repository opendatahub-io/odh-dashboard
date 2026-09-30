import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { k8sCreateResource } from '@openshift/dynamic-plugin-sdk-utils';
import { useHostApiCore } from '@odh-dashboard/plugin-core/host-api';
import useNamespaces from '#~/pages/notebookController/useNamespaces';
import { checkAccess } from '#~/api/checkAccess';
import { AccessReviewProvider } from '#~/concepts/userSSAR/AccessReviewContext';
import { useAccessAllowed } from '#~/concepts/userSSAR/useAccessAllowed';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sCreateResource: jest.fn(),
}));

jest.mock('@odh-dashboard/plugin-core/host-api', () => ({
  useHostApiCore: jest.fn(),
}));

jest.mock('#~/pages/notebookController/useNamespaces', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const k8sCreateResourceMock = jest.mocked(k8sCreateResource);
const useHostApiCoreMock = jest.mocked(useHostApiCore);
const useNamespacesMock = jest.mocked(useNamespaces);

const resourceAttributes = {
  group: 'apps',
  resource: 'deployments',
  verb: 'get',
  namespace: 'test-namespace',
};

const AccessResult: React.FC = () => {
  const [allowed, loaded] = useAccessAllowed(resourceAttributes);
  return <div data-testid="access-result">{`${allowed}-${loaded}`}</div>;
};

const ConsumerToggle: React.FC = () => {
  const [isMounted, setIsMounted] = React.useState(true);
  return (
    <>
      <button type="button" onClick={() => setIsMounted((mounted) => !mounted)}>
        Toggle consumer
      </button>
      {isMounted ? <AccessResult /> : null}
    </>
  );
};

describe('AccessReviewProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useNamespacesMock.mockReturnValue({
      dashboardNamespace: 'dashboard-namespace',
      workbenchNamespace: 'workbench-namespace',
    });
    useHostApiCoreMock.mockReturnValue({ checkAccess } as ReturnType<typeof useHostApiCore>);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should deny while a review fails and retry on a later visit', async () => {
    jest.spyOn(console, 'warn').mockImplementation();
    k8sCreateResourceMock
      .mockRejectedValueOnce(new Error('temporary API failure'))
      .mockResolvedValueOnce({ status: { allowed: true } });

    render(
      <AccessReviewProvider>
        <ConsumerToggle />
      </AccessReviewProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('access-result')).toHaveTextContent('false-true'),
    );
    expect(k8sCreateResourceMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Toggle consumer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Toggle consumer' }));

    await waitFor(() => expect(screen.getByTestId('access-result')).toHaveTextContent('true-true'));
    expect(k8sCreateResourceMock).toHaveBeenCalledTimes(2);
  });
});
