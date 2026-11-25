import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import {
  TokenAuthenticationField,
  tokenAuthenticationFieldSchema,
} from '../TokenAuthenticationField';

describe('TokenAuthenticationField', () => {
  it('should describe token entries as secrets and preserve add and remove behavior', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    const tokens = [{ uuid: 'token-1', displayName: 'my-secret' }];

    render(
      <TokenAuthenticationField
        tokens={tokens}
        onChange={onChange}
        allowCreate
        shouldAutoCheck={false}
        isExternalRouteVisible={false}
      />,
    );

    expect(screen.getByTestId('service-account-form-name')).toHaveAccessibleName('Secret name');
    expect(
      screen.getByText('Enter a name for the secret that stores the generated token'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('add-service-account-button')).toHaveTextContent('Add a secret');
    expect(screen.getByTestId('remove-service-account-button')).toHaveAccessibleName(
      'Remove secret',
    );

    await user.click(screen.getByTestId('add-service-account-button'));
    expect(onChange).toHaveBeenLastCalledWith([
      ...tokens,
      expect.objectContaining({ displayName: 'default-name' }),
    ]);

    await user.click(screen.getByTestId('remove-service-account-button'));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('should identify a missing name as a required secret name', () => {
    const result = tokenAuthenticationFieldSchema.safeParse([{ uuid: 'token-1', displayName: '' }]);

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual([
      expect.objectContaining({ message: 'Secret name is required' }),
    ]);
  });
});
