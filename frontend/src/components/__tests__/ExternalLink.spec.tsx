import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ExternalLink from '#~/components/ExternalLink';

describe('ExternalLink', () => {
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
});
