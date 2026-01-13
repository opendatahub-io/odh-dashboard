import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import TierInfoPopover from '~/app/AIAssets/components/TierInfoPopover';

describe('TierInfoPopover', () => {
  it('should render the Tier information button', () => {
    render(<TierInfoPopover />);

    const button = screen.getByTestId('tier-info-button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Tier information');
  });

  it('should render question circle icon in the button', () => {
    render(<TierInfoPopover />);

    const button = screen.getByTestId('tier-info-button');
    expect(button.querySelector('svg')).toBeInTheDocument();
  });

  it('should show Work in progress label in popover when clicked', async () => {
    const user = userEvent.setup();
    render(<TierInfoPopover />);

    const button = screen.getByTestId('tier-info-button');
    await user.click(button);

    expect(screen.getByText('Work in progress')).toBeInTheDocument();
  });

  it('should show explanatory text about tier access in popover', async () => {
    const user = userEvent.setup();
    render(<TierInfoPopover />);

    const button = screen.getByTestId('tier-info-button');
    await user.click(button);

    expect(
      screen.getByText(/This list of models is based on your current highest Tier/),
    ).toBeInTheDocument();
  });

  it('should show popover header when clicked', async () => {
    const user = userEvent.setup();
    render(<TierInfoPopover />);

    const button = screen.getByTestId('tier-info-button');
    await user.click(button);

    // There should be two "Tier information" texts - one in the button and one in the popover header
    expect(screen.getAllByText('Tier information').length).toBeGreaterThanOrEqual(2);
  });
});
