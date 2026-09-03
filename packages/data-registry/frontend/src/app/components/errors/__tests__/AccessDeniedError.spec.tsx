import React from 'react';
import { render, screen } from '@testing-library/react';
import AccessDeniedError from '~/app/components/errors/AccessDeniedError';

describe('AccessDeniedError', () => {
  it('should render access denied message with resource', () => {
    render(<AccessDeniedError resource="this project" />);

    expect(screen.getByText('Access denied')).toBeInTheDocument();
    expect(screen.getByText(/You do not have access to this project/)).toBeInTheDocument();
  });

  it('should render with custom resource name', () => {
    render(<AccessDeniedError resource="the Data Registry" />);

    expect(screen.getByText(/You do not have access to the Data Registry/)).toBeInTheDocument();
  });
});
