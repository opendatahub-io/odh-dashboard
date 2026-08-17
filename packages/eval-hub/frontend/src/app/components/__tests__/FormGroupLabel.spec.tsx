import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FormGroupLabel from '~/app/components/FormGroupLabel';

describe('FormGroupLabel', () => {
  it('should render label and description', () => {
    render(<FormGroupLabel label="Name" description="Enter your name" />);

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Enter your name')).toBeInTheDocument();
  });

  it('should render the required asterisk when isRequired is true', () => {
    const { container } = render(
      <FormGroupLabel label="Name" description="Required field" isRequired />,
    );

    const asterisk = container.querySelector('.pf-v6-c-form__label-required');
    expect(asterisk).toBeInTheDocument();
    expect(asterisk).toHaveAttribute('aria-hidden', 'true');
  });

  it('should not render the required asterisk when isRequired is false', () => {
    const { container } = render(<FormGroupLabel label="Name" description="Optional field" />);

    expect(container.querySelector('.pf-v6-c-form__label-required')).not.toBeInTheDocument();
  });

  it('should render help popover trigger with correct aria-label', () => {
    render(
      <FormGroupLabel
        label="Name"
        description="A description"
        helpPopover={{ ariaLabel: 'More about name', content: 'Help text' }}
      />,
    );

    expect(screen.getByRole('button', { name: 'More about name' })).toBeInTheDocument();
  });

  it('should open popover dialog with accessible name matching ariaLabel', async () => {
    const user = userEvent.setup();

    render(
      <FormGroupLabel
        label="Name"
        description="A description"
        helpPopover={{ ariaLabel: 'More about name', content: 'Help text' }}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'More about name' }));

    const dialog = screen.getByRole('dialog', { name: 'More about name' });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent('Help text');
  });

  it('should not render help popover when helpPopover is not provided', () => {
    render(<FormGroupLabel label="Name" description="No help" />);

    expect(screen.queryByRole('button', { name: /help/i })).not.toBeInTheDocument();
  });
});
