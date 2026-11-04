import React from 'react';
import { render, screen } from '@testing-library/react';
import { checkAccess } from '@odh-dashboard/k8s-core/api/accessReview';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import { useUser } from '@odh-dashboard/internal/redux/selectors/user';
import MLflowNotConfigured from '../MLflowNotConfigured';

jest.mock('@odh-dashboard/internal/redux/selectors/user', () => ({ useUser: jest.fn() }));
jest.mock('@odh-dashboard/k8s-core/api/accessReview', () => ({ checkAccess: jest.fn() }));
jest.mock('@odh-dashboard/ui-core', () => ({ WhosMyAdministrator: () => null }));

const mockUseUser = jest.mocked(useUser);
const mockCheckAccess = jest.mocked(checkAccess);

describe('MLflowNotConfigured', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUser.mockReturnValue({
      username: 'admin',
      userID: 'admin',
      isAdmin: true,
      isAllowed: true,
      userLoading: false,
      userError: null,
    });
    mockCheckAccess.mockResolvedValue(true);
  });

  it('should show the original administrator guidance when MLflow CR creation and editing are allowed', async () => {
    render(<MLflowNotConfigured featureName="experiments" />);

    const emptyState = await screen.findByTestId('mlflow-not-configured-admin-empty-state');
    expect(screen.getByRole('heading', { name: 'Enable experiments' })).toBeInTheDocument();
    expect(emptyState).toHaveTextContent(
      'To enable the use of experiments on this cluster, enable the MLflow Operator component and ensure that an MLflow custom resource has been created and is ready. To learn more about how to install and configure MLflow, view the documentation.',
    );
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(mockCheckAccess).toHaveBeenCalledTimes(3);
    expect(mockCheckAccess.mock.calls.map(([attributes]) => attributes)).toEqual([
      { group: 'mlflow.opendatahub.io', resource: 'mlflows', verb: 'create' },
      { group: 'mlflow.opendatahub.io', resource: 'mlflows', verb: 'update' },
      { group: 'mlflow.opendatahub.io', resource: 'mlflows', verb: 'patch' },
    ]);
    mockCheckAccess.mock.calls.forEach(([, options]) => {
      expect(options).toEqual({ failureMode: 'reject' });
    });
  });

  it.each(['prompts', 'agent observability'])(
    'should name %s in the administrator guidance',
    async (featureName) => {
      render(<MLflowNotConfigured featureName={featureName} />);

      expect(
        await screen.findByRole('heading', { name: `Enable ${featureName}` }),
      ).toBeInTheDocument();
      expect(screen.getByTestId('mlflow-not-configured-admin-empty-state')).toHaveTextContent(
        `To enable the use of ${featureName} on this cluster`,
      );
    },
  );

  it('should accept patch permission as edit access', async () => {
    mockCheckAccess.mockImplementation(async ({ verb }) => verb !== 'update');
    render(<MLflowNotConfigured featureName="experiments" />);

    expect(
      await screen.findByTestId('mlflow-not-configured-admin-empty-state'),
    ).toBeInTheDocument();
  });

  it('should show the non-admin guidance when an administrator cannot create MLflow CRs', async () => {
    mockCheckAccess.mockImplementation(async ({ verb }) => verb !== 'create');
    render(<MLflowNotConfigured featureName="experiments" />);

    expect(await screen.findByTestId('mlflow-not-configured-empty-state')).toBeInTheDocument();
    expect(screen.queryByTestId('mlflow-not-configured-admin-empty-state')).not.toBeInTheDocument();
  });

  it('should show the non-admin guidance when an administrator cannot edit MLflow CRs', async () => {
    mockCheckAccess.mockImplementation(async ({ verb }) => verb === 'create');
    render(<MLflowNotConfigured featureName="experiments" />);

    expect(await screen.findByTestId('mlflow-not-configured-empty-state')).toBeInTheDocument();
    expect(screen.queryByTestId('mlflow-not-configured-admin-empty-state')).not.toBeInTheDocument();
  });

  it('should show the non-admin guidance when the access review fails', async () => {
    mockCheckAccess.mockRejectedValue(new Error('access review unavailable'));
    render(<MLflowNotConfigured featureName="experiments" />);

    expect(await screen.findByTestId('mlflow-not-configured-empty-state')).toBeInTheDocument();
  });

  it('should show non-administrators the cluster-level guidance', () => {
    mockUseUser.mockReturnValue({
      username: 'user',
      userID: 'user',
      isAdmin: false,
      isAllowed: true,
      userLoading: false,
      userError: null,
    });
    render(<MLflowNotConfigured featureName="experiments" />);

    expect(screen.getByTestId('mlflow-not-configured-empty-state')).toHaveTextContent(
      'Ask your administrator to enable MLflow for this cluster.',
    );
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(mockCheckAccess).not.toHaveBeenCalled();
  });
});
