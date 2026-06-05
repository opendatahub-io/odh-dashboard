import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SimpleSelect from '#~/components/SimpleSelect';

describe('SimpleSelect', () => {
  const mockOnChange = jest.fn();

  const defaultOptions = [
    { key: 'opt-1', label: 'Option One' },
    { key: 'opt-2', label: 'Option Two' },
    { key: 'opt-3', label: 'Option Three' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with default aria-label', () => {
    render(<SimpleSelect options={defaultOptions} onChange={mockOnChange} />);

    const toggle = screen.getByRole('button', { name: 'Options menu' });
    expect(toggle).toBeInTheDocument();
  });

  it('should render with custom aria-label', () => {
    render(
      <SimpleSelect
        options={defaultOptions}
        onChange={mockOnChange}
        ariaLabel="Variable type"
      />,
    );

    const toggle = screen.getByRole('button', { name: 'Variable type' });
    expect(toggle).toBeInTheDocument();
  });

  it('should allow toggleProps to override aria-label', () => {
    render(
      <SimpleSelect
        options={defaultOptions}
        onChange={mockOnChange}
        ariaLabel="Default label"
        toggleProps={{ 'aria-label': 'Override label' }}
      />,
    );

    const toggle = screen.getByRole('button', { name: 'Override label' });
    expect(toggle).toBeInTheDocument();
  });

  it('should show options when toggle is clicked', () => {
    render(
      <SimpleSelect
        options={defaultOptions}
        onChange={mockOnChange}
        ariaLabel="Test select"
        autoSelectOnlyOption={false}
      />,
    );

    const toggle = screen.getByRole('button', { name: 'Test select' });
    fireEvent.click(toggle);

    defaultOptions.forEach((option) => {
      expect(screen.getByText(option.label)).toBeInTheDocument();
    });
  });

  it('should have isExpanded reflected in aria-expanded', () => {
    render(
      <SimpleSelect
        options={defaultOptions}
        onChange={mockOnChange}
        ariaLabel="Test select"
        autoSelectOnlyOption={false}
      />,
    );

    const toggle = screen.getByRole('button', { name: 'Test select' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });
});
