import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import CommunityPlugins from '#~/pages/communityPlugins/CommunityPlugins';

describe('CommunityPlugins', () => {
  it('should render unsupported setup guidance and community plugin links', () => {
    render(<CommunityPlugins />);

    expect(
      screen.getByRole('heading', { name: /Community plugins/, level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Community plugins are not supported by Red Hat.')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'What you get when enabled', level: 2 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'How to enable community plugins', level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Troubleshooting', level: 2 })).toBeInTheDocument();

    expect(screen.getByTestId('community-plugins-setup-instructions')).toHaveAttribute(
      'href',
      'https://red.ht/rh-ai-cp',
    );
    expect(screen.getByTestId('community-plugins-related-link')).toHaveAttribute(
      'href',
      'https://red.ht/rh-ai-cp',
    );
    expect(screen.getByTestId('community-plugins-quay-link')).toHaveAttribute(
      'href',
      'https://quay.io/organization/rh-ai-community-plugins',
    );
  });
});
