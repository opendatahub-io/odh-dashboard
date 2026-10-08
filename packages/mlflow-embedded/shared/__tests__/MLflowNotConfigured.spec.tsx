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

  it('should link administrators to the MLflow installation guide', () => {
    render(<MLflowNotConfigured />);

    expect(screen.getByTestId('mlflow-installation-docs-link')).toHaveAttribute(
      'href',
      'https://docs.redhat.com/en/documentation/red_hat_openshift_ai_self-managed/3.5/html/working_with_mlflow/installing-mlflow_mlflow',
    );
  });

  it('should show non-administrators the cluster-level guidance without an installation link', () => {
    mockUseUser.mockReturnValue({
      username: 'user',
      userID: 'user',
      isAdmin: false,
      isAllowed: true,
      userLoading: false,
      userError: null,
    });
    render(<MLflowNotConfigured />);

    expect(screen.getByTestId('mlflow-not-configured-empty-state')).toHaveTextContent(
      'Ask your administrator to enable MLflow for this cluster.',
    );
    expect(screen.queryByTestId('mlflow-installation-docs-link')).not.toBeInTheDocument();
  });
});
