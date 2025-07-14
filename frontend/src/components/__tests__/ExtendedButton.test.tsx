import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ExtendedButton from '#~/components/ExtendedButton';

describe('ExtendedButton', () => {
  it('should render the Skeleton when not loaded', () => {
    render(<ExtendedButton loadProps={{ loaded: false }} />);
    expect(screen.getByTestId('skeleton-loader')).toBeInTheDocument();
  });

  it('should render the Popover when there is an error', async () => {
    render(<ExtendedButton loadProps={{ loaded: true, error: new Error('Error message') }} />);
    expect(screen.getByTestId('error-content')).toBeInTheDocument();

    const popoverTrigger = screen.getByTestId('error-icon');
    await userEvent.click(popoverTrigger);
    expect(await screen.findByText('Error message')).toBeInTheDocument();
  });

  it('should render the button when loaded with no errors', () => {
    render(<ExtendedButton loadProps={{ loaded: true }}>Click Me</ExtendedButton>);
    expect(screen.getByRole('button', { name: 'Click Me' })).toBeInTheDocument();
  });

  it('should disable the button when tooltip is enabled', async () => {
    const onClick = jest.fn();
    render(
      <ExtendedButton
        onClick={onClick}
        loadProps={{ loaded: true }}
        tooltipProps={{ isEnabled: true, content: 'Tooltip message' }}
      >
        Click Me
      </ExtendedButton>,
    );

    const button = screen.getByRole('button', { name: 'Click Me' });
    await userEvent.click(button);
    await userEvent.hover(button);

    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(await screen.findByText('Tooltip message')).toBeInTheDocument();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('should enable the button when tooltip is disabled', async () => {
    const onClick = jest.fn();
    render(
      <ExtendedButton loadProps={{ loaded: true }} onClick={onClick}>
        Click Me
      </ExtendedButton>,
    );

    const button = screen.getByRole('button', { name: 'Click Me' });
    await userEvent.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should behave like a regular button when no extended properties are provided', async () => {
    const onClick = jest.fn();
    render(<ExtendedButton onClick={onClick}>Click Me</ExtendedButton>);

    const button = screen.getByRole('button', { name: 'Click Me' });
    await userEvent.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
