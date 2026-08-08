import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TokenAuthenticationField } from '../TokenAuthenticationField';

describe('TokenAuthenticationField', () => {
  const defaultProps = {
    tokens: [],
    onChange: jest.fn(),
    allowCreate: true,
    shouldAutoCheck: false,
    isExternalRouteVisible: false,
    externalRouteData: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the checkbox', () => {
    render(<TokenAuthenticationField {...defaultProps} />);
    expect(screen.getByTestId('token-authentication-checkbox')).toBeInTheDocument();
  });

  it('should show checkbox as disabled when allowCreate is false', () => {
    render(<TokenAuthenticationField {...defaultProps} allowCreate={false} />);
    expect(screen.getByTestId('token-authentication-checkbox')).toBeDisabled();
  });

  it('should not show MaaS helper text when isMaaSDisabled is false', () => {
    render(<TokenAuthenticationField {...defaultProps} isMaaSDisabled={false} />);
    expect(screen.queryByTestId('maas-token-auth-helper-text')).not.toBeInTheDocument();
  });

  it('should not show MaaS helper text when isMaaSDisabled is undefined', () => {
    render(<TokenAuthenticationField {...defaultProps} />);
    expect(screen.queryByTestId('maas-token-auth-helper-text')).not.toBeInTheDocument();
  });

  it('should show MaaS helper text when isMaaSDisabled is true', () => {
    render(<TokenAuthenticationField {...defaultProps} allowCreate={false} isMaaSDisabled />);
    expect(screen.getByTestId('maas-token-auth-helper-text')).toBeInTheDocument();
    expect(screen.getByTestId('maas-token-auth-helper-text')).toHaveTextContent(
      'Deployment token authentication does not apply for MaaS',
    );
    expect(screen.getByTestId('maas-token-auth-helper-text')).toHaveTextContent(
      'API keys are used instead',
    );
  });

  it('should keep checkbox unchecked and disabled when MaaS disables token auth', () => {
    render(<TokenAuthenticationField {...defaultProps} allowCreate={false} isMaaSDisabled />);
    const checkbox = screen.getByTestId('token-authentication-checkbox');
    expect(checkbox).toBeDisabled();
    expect(checkbox).not.toBeChecked();
  });

  it('should force checkbox unchecked and disabled when isMaaSDisabled even with existing tokens and allowCreate', () => {
    const existingTokens = [{ uuid: 'tok-1', displayName: 'my-token', error: '' }];
    render(
      <TokenAuthenticationField
        {...defaultProps}
        tokens={existingTokens}
        allowCreate
        isMaaSDisabled
      />,
    );
    const checkbox = screen.getByTestId('token-authentication-checkbox');
    expect(checkbox).toBeDisabled();
    expect(checkbox).not.toBeChecked();
  });

  it('should not render token inputs when isMaaSDisabled even with existing tokens', () => {
    const existingTokens = [{ uuid: 'tok-1', displayName: 'my-token', error: '' }];
    render(
      <TokenAuthenticationField
        {...defaultProps}
        tokens={existingTokens}
        allowCreate
        isMaaSDisabled
      />,
    );
    expect(screen.queryByTestId('service-account-form-name')).not.toBeInTheDocument();
    expect(screen.queryByTestId('add-service-account-button')).not.toBeInTheDocument();
  });

  it('should call onChange when checkbox is checked', () => {
    const onChange = jest.fn();
    render(<TokenAuthenticationField {...defaultProps} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('token-authentication-checkbox'));
    expect(onChange).toHaveBeenCalled();
  });
});
