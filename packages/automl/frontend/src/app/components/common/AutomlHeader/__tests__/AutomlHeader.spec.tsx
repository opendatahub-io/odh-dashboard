import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import AutomlHeader from '~/app/components/common/AutomlHeader/AutomlHeader';

describe('AutomlHeader', () => {
  it('should render AutoML text', () => {
    render(<AutomlHeader />);
    expect(screen.getByText('AutoML')).toBeInTheDocument();
  });

  it('should render the icon container', () => {
    render(<AutomlHeader />);
    expect(screen.getByTestId('automl-header-icon-container')).toBeInTheDocument();
  });

  it('should render the icon', () => {
    render(<AutomlHeader />);
    expect(screen.getByTestId('automl-header-icon')).toBeInTheDocument();
  });
});
