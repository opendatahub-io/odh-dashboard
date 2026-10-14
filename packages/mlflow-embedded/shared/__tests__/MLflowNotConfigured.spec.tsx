import React from 'react';
import { render, screen } from '@testing-library/react';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import { useUser } from '@odh-dashboard/internal/redux/selectors/user';
import MLflowNotConfigured from '../MLflowNotConfigured';

jest.mock('@odh-dashboard/internal/redux/selectors/user', () => ({ useUser: jest.fn() }));
jest.mock('@odh-dashboard/ui-core', () => ({ WhosMyAdministrator: () => null }));

const mockUseUser = jest.mocked(useUser);

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
  });

  it('should direct administrators to the MLflow installation documentation without a link', () => {
    render(<MLflowNotConfigured featureName="experiments" />);

    const emptyState = screen.getByTestId('mlflow-not-configured-admin-empty-state');
    expect(screen.getByRole('heading', { name: 'Enable experiments' })).toBeInTheDocument();
    expect(emptyState).toHaveTextContent(
      'To enable the use of experiments on this cluster, enable the MLflow Operator component and ensure that an MLflow custom resource has been created. To learn more about how to install and configure MLflow, view the documentation.',
    );
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it.each(['prompts', 'agent observability'])(
    'should name %s in the administrator guidance',
    (featureName) => {
      render(<MLflowNotConfigured featureName={featureName} />);

      expect(screen.getByRole('heading', { name: `Enable ${featureName}` })).toBeInTheDocument();
      expect(screen.getByTestId('mlflow-not-configured-admin-empty-state')).toHaveTextContent(
        `To enable the use of ${featureName} on this cluster`,
      );
    },
  );

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
  });
});
