import React from 'react';
import { render, screen } from '@testing-library/react';
import AccessDeniedError from '~/app/components/errors/AccessDeniedError';

describe('AccessDeniedError', () => {
  it('should render default error message', () => {
    render(<AccessDeniedError />);

    expect(screen.getByText('Access denied')).toBeInTheDocument();
    expect(
      screen.getByText('You do not have access to this project in Data Registry.'),
    ).toBeInTheDocument();
  });

  it('should render custom resource name', () => {
    render(<AccessDeniedError resourceName="collections" />);

    expect(
      screen.getByText('You do not have access to collections in Data Registry.'),
    ).toBeInTheDocument();
  });
});
