import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FineTuneTaxonomySection } from '#~/pages/pipelines/global/modelCustomization/taxonomySection/FineTuneTaxonomySection';
import { FineTuneTaxonomyType } from '#~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/types';

describe('FineTuneTaxonomySection', () => {
  const defaultProps = {
    data: {
      url: 'test-url',
      secret: {
        type: FineTuneTaxonomyType.SSH_KEY,
        sshKey: 'test-key',
        username: '',
        token: '',
      },
    },
    setData: jest.fn(),
    handleOpenDrawer: jest.fn(),
  };

  it('should render initial value for ssh key radio', () => {
    render(<FineTuneTaxonomySection {...defaultProps} />);

    expect(screen.getByTestId('ssh-key-radio')).toBeChecked();
    expect(screen.getByTestId('taxonomy-github-url')).toHaveValue('test-url');
    expect(screen.getByTestId('taxonomy-ssh-key').querySelector('#sshKeyFileUpload')).toHaveValue(
      'test-key',
    );
  });

  it('should render initial value for username and password radio', () => {
    render(
      <FineTuneTaxonomySection
        {...defaultProps}
        data={{
          url: 'test-url',
          secret: {
            type: FineTuneTaxonomyType.USERNAME_TOKEN,
            sshKey: '',
            username: 'test-username',
            token: 'test-password',
          },
        }}
      />,
    );

    expect(screen.getByTestId('username-and-token-radio')).toBeChecked();
    expect(screen.getByTestId('taxonomy-username')).toHaveValue('test-username');
    expect(screen.getByTestId('taxonomy-token')).toHaveValue('test-password');
  });

  it('should show error message after fields are touched', async () => {
    const component = render(
      <FineTuneTaxonomySection
        {...defaultProps}
        data={{
          url: '',
          secret: {
            type: FineTuneTaxonomyType.SSH_KEY,
            sshKey: '',
            username: '',
            token: '',
          },
        }}
      />,
    );

    expect(screen.queryByTestId('taxonomy-github-url-error')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('taxonomy-github-url'));
    fireEvent.focusOut(screen.getByTestId('taxonomy-github-url'));
    expect(screen.queryByTestId('taxonomy-github-url-error')).toBeInTheDocument();

    expect(screen.queryByTestId('taxonomy-ssh-key-error')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('taxonomy-ssh-key'));
    fireEvent.focusOut(screen.getByTestId('taxonomy-ssh-key'));
    expect(screen.queryByTestId('taxonomy-ssh-key-error')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('username-and-token-radio'));
    component.rerender(
      <FineTuneTaxonomySection
        {...defaultProps}
        data={{
          url: '',
          secret: {
            type: FineTuneTaxonomyType.USERNAME_TOKEN,
            sshKey: '',
            username: '',
            token: '',
          },
        }}
      />,
    );

    expect(screen.queryByTestId('taxonomy-username-error')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('taxonomy-username'));
    fireEvent.focusOut(screen.getByTestId('taxonomy-username'));
    expect(screen.queryByTestId('taxonomy-username-error')).toBeInTheDocument();

    expect(screen.queryByTestId('taxonomy-token-error')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('taxonomy-token'));
    fireEvent.focusOut(screen.getByTestId('taxonomy-token'));
    expect(screen.queryByTestId('taxonomy-token-error')).toBeInTheDocument();
  });
});
