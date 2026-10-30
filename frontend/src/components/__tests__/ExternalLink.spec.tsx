import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { fireLinkTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import ExternalLink from '#~/components/ExternalLink';

jest.mock('#~/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireLinkTrackingEvent: jest.fn(),
}));

const mockFireLinkTrackingEvent = jest.mocked(fireLinkTrackingEvent);

describe('ExternalLink', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render an HTTP(S) link with safe new-tab attributes', () => {
    render(
      <ExternalLink text="Documentation" to="https://example.com/docs" testId="external-link" />,
    );

    expect(screen.getByTestId('external-link')).toHaveAttribute('href', 'https://example.com/docs');
    expect(screen.getByTestId('external-link')).toHaveAttribute('target', '_blank');
    expect(screen.getByTestId('external-link')).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it.each(['javascript:alert(document.cookie)', 'data:text/html,<script>alert(1)</script>'])(
    'should remove href for an unsafe URL scheme',
    (to) => {
      render(<ExternalLink text="Documentation" to={to} testId="external-link" />);

      expect(screen.getByTestId('external-link')).not.toHaveAttribute('href');
    },
  );

  it('should render an HTTP link with safe new-tab attributes', () => {
    render(
      <ExternalLink text="Documentation" to="http://example.com/docs" testId="external-link" />,
    );

    expect(screen.getByTestId('external-link')).toHaveAttribute('href', 'http://example.com/docs');
    expect(screen.getByTestId('external-link')).toHaveAttribute('target', '_blank');
    expect(screen.getByTestId('external-link')).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should remove href for an empty URL', () => {
    render(<ExternalLink text="Documentation" to="" testId="external-link" />);

    expect(screen.getByTestId('external-link')).not.toHaveAttribute('href');
  });

  it('should record telemetry when link is clicked', async () => {
    const user = userEvent.setup();
    const to = 'https://example.com/docs';
    render(<ExternalLink text="Documentation" to={to} testId="external-link" />);

    await user.click(screen.getByTestId('external-link'));

    expect(mockFireLinkTrackingEvent).toHaveBeenCalledWith('ExternalLink Clicked', {
      href: to,
      from: window.location.pathname,
    });
  });
});
