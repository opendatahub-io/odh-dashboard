import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfigureFormGroup from '~/app/components/common/ConfigureFormGroup';

// Mock DashboardPopupIconButton
jest.mock('mod-arch-shared', () => ({
  DashboardPopupIconButton: ({ icon, ...props }: { icon: React.ReactNode }) => (
    <button {...props}>{icon}</button>
  ),
}));

describe('ConfigureFormGroup', () => {
  it('should render label and children', () => {
    render(
      <ConfigureFormGroup label="Test Label">
        <div data-testid="test-child">Child content</div>
      </ConfigureFormGroup>,
    );

    expect(screen.getByTestId('configure-form-group-label-test-label')).toHaveTextContent(
      'Test Label',
    );
    expect(screen.getByTestId('test-child')).toHaveTextContent('Child content');
  });

  it('should render required asterisk when isRequired is true', () => {
    render(
      <ConfigureFormGroup label="Required Field" isRequired>
        <input type="text" />
      </ConfigureFormGroup>,
    );

    const label = screen.getByTestId('configure-form-group-label-required-field');
    expect(label.querySelector('.pf-v6-c-form__label-required')).toBeInTheDocument();
    expect(label.querySelector('.pf-v6-c-form__label-required')).toHaveTextContent('*');
  });

  it('should not render required asterisk when isRequired is false', () => {
    render(
      <ConfigureFormGroup label="Optional Field">
        <input type="text" />
      </ConfigureFormGroup>,
    );

    const label = screen.getByTestId('configure-form-group-label-optional-field');
    expect(label.querySelector('.pf-v6-c-form__label-required')).not.toBeInTheDocument();
  });

  it('should render description when provided', () => {
    render(
      <ConfigureFormGroup
        label="Field with Description"
        description="This is a helpful description"
      >
        <input type="text" />
      </ConfigureFormGroup>,
    );

    expect(
      screen.getByTestId('configure-form-group-description-field-with-description'),
    ).toHaveTextContent('This is a helpful description');
  });

  it('should not render description when not provided', () => {
    render(
      <ConfigureFormGroup label="Field without Description">
        <input type="text" />
      </ConfigureFormGroup>,
    );

    expect(
      screen.queryByTestId('configure-form-group-description-field-without-description'),
    ).not.toBeInTheDocument();
  });

  it('should render help popover button when labelHelp is provided', () => {
    render(
      <ConfigureFormGroup
        label="Field with Help"
        labelHelp={{ header: 'Help Header', body: 'Help Body' }}
      >
        <input type="text" />
      </ConfigureFormGroup>,
    );

    const helpButton = screen.getByTestId('configure-form-group-help-field-with-help');
    expect(helpButton).toBeInTheDocument();
    expect(helpButton).toHaveAttribute('aria-label', 'More info for field with help');
  });

  it('should show popover content when help button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <ConfigureFormGroup
        label="Field with Help"
        labelHelp={{ header: 'Help Header', body: 'Help Body Content' }}
      >
        <input type="text" />
      </ConfigureFormGroup>,
    );

    const helpButton = screen.getByTestId('configure-form-group-help-field-with-help');
    await user.click(helpButton);

    expect(screen.getByText('Help Header')).toBeInTheDocument();
    expect(screen.getByText('Help Body Content')).toBeInTheDocument();
  });

  it('should not render help popover button when labelHelp is not provided', () => {
    render(
      <ConfigureFormGroup label="Field without Help">
        <input type="text" />
      </ConfigureFormGroup>,
    );

    expect(
      screen.queryByTestId('configure-form-group-help-field-without-help'),
    ).not.toBeInTheDocument();
  });

  it('should generate correct test IDs based on label', () => {
    render(
      <ConfigureFormGroup label="My Complex Field Name">
        <input type="text" />
      </ConfigureFormGroup>,
    );

    expect(screen.getByTestId('configure-form-group-my-complex-field-name')).toBeInTheDocument();
    expect(
      screen.getByTestId('configure-form-group-label-my-complex-field-name'),
    ).toBeInTheDocument();
  });

  it('should render description as React node', () => {
    render(
      <ConfigureFormGroup
        label="Field with Rich Description"
        description={
          <span>
            This is <strong data-testid="strong-text">bold</strong> text
          </span>
        }
      >
        <input type="text" />
      </ConfigureFormGroup>,
    );

    const description = screen.getByTestId(
      'configure-form-group-description-field-with-rich-description',
    );
    expect(description).toBeInTheDocument();
    expect(screen.getByTestId('strong-text')).toHaveTextContent('bold');
  });

  it('should combine all props together', async () => {
    const user = userEvent.setup();

    render(
      <ConfigureFormGroup
        label="Complete Field"
        description="Field description"
        isRequired
        labelHelp={{ header: 'Help', body: 'Body' }}
      >
        <input data-testid="field-input" type="text" />
      </ConfigureFormGroup>,
    );

    // Label
    const label = screen.getByTestId('configure-form-group-label-complete-field');
    expect(label).toHaveTextContent('Complete Field');
    expect(label.querySelector('.pf-v6-c-form__label-required')).toBeInTheDocument();

    // Description
    expect(screen.getByTestId('configure-form-group-description-complete-field')).toHaveTextContent(
      'Field description',
    );

    // Help button
    const helpButton = screen.getByTestId('configure-form-group-help-complete-field');
    expect(helpButton).toBeInTheDocument();
    await user.click(helpButton);
    expect(screen.getByText('Help')).toBeInTheDocument();

    // Children
    expect(screen.getByTestId('field-input')).toBeInTheDocument();
  });
});
