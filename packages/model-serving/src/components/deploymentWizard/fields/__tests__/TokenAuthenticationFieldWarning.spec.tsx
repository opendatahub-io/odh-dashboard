import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TokenAuthenticationField } from '../TokenAuthenticationField';

jest.mock('@odh-dashboard/plugin-core');

describe('TokenAuthenticationField permission warning', () => {
  it('should show the warning while the field stays enabled, keeping it editable', () => {
    render(
      <TokenAuthenticationField
        tokens={[{ uuid: 'a', displayName: 'default-name' }]}
        allowCreate
        shouldAutoCheck
        isExternalRouteVisible={false}
        permissionWarning="May be refused"
      />,
    );
    expect(screen.getByTestId('token-authentication-permission-warning')).toHaveTextContent(
      'May be refused',
    );
    expect(screen.getByTestId('token-authentication-checkbox')).toBeEnabled();
    expect(screen.getByTestId('token-authentication-checkbox')).toBeChecked();
  });

  it('should not show the warning on a disabled field', () => {
    render(
      <TokenAuthenticationField
        tokens={[]}
        allowCreate={false}
        shouldAutoCheck={false}
        isExternalRouteVisible={false}
        permissionWarning="May be refused"
      />,
    );
    expect(screen.queryByTestId('token-authentication-permission-warning')).not.toBeInTheDocument();
  });
});
