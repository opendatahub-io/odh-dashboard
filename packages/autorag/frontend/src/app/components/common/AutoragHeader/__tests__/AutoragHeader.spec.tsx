import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import AutoragHeader from '~/app/components/common/AutoragHeader/AutoragHeader';

describe('AutoragHeader', () => {
  it('should render AutoRAG text', () => {
    render(<AutoragHeader />);
    expect(screen.getByText('AutoRAG')).toBeInTheDocument();
  });

  it('should render the icon container', () => {
    render(<AutoragHeader />);
    expect(screen.getByTestId('autorag-header-icon-container')).toBeInTheDocument();
  });

  it('should render the icon', () => {
    render(<AutoragHeader />);
    expect(screen.getByTestId('autorag-header-icon')).toBeInTheDocument();
  });
});
