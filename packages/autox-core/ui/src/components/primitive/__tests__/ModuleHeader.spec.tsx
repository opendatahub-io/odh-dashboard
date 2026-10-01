import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import ModuleHeader from '../ModuleHeader';

describe('ModuleHeader', () => {
  it('should render the label text', () => {
    render(<ModuleHeader icon={<svg data-testid="my-icon" />} label="My Module" />);
    expect(screen.getByText('My Module')).toBeInTheDocument();
  });

  it('should render the icon container with the default test id prefix', () => {
    render(<ModuleHeader icon={<svg />} label="My Module" />);
    expect(screen.getByTestId('module-header-icon-container')).toBeInTheDocument();
    expect(screen.getByTestId('module-header-icon')).toBeInTheDocument();
  });

  it('should use a custom test id prefix when provided', () => {
    render(<ModuleHeader icon={<svg />} label="My Module" testIdPrefix="automl-header" />);
    expect(screen.getByTestId('automl-header-icon-container')).toBeInTheDocument();
    expect(screen.getByTestId('automl-header-icon')).toBeInTheDocument();
  });

  it('should preserve a data-testid already set on the icon element', () => {
    render(<ModuleHeader icon={<svg data-testid="my-icon" />} label="My Module" />);
    expect(screen.getByTestId('my-icon')).toBeInTheDocument();
    expect(screen.queryByTestId('module-header-icon')).not.toBeInTheDocument();
  });

  it('should apply the icon sizing class to the icon element', () => {
    render(<ModuleHeader icon={<svg data-testid="my-icon" />} label="My Module" />);
    expect(screen.getByTestId('my-icon')).toHaveClass('autox-module-header__icon');
  });
});
