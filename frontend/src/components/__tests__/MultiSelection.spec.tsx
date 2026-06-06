import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MultiSelection, SelectionOptions } from '#~/components/MultiSelection';

describe('MultiSelection', () => {
  const mockSetValue = jest.fn();

  const defaultOptions: SelectionOptions[] = [
    { id: 'opt-1', name: 'Option One', selected: false },
    { id: 'opt-2', name: 'Option Two', selected: false },
    { id: 'opt-3', name: 'Option Three', selected: true },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with the provided aria-label', () => {
    render(
      <MultiSelection ariaLabel="Notebook select" value={defaultOptions} setValue={mockSetValue} />,
    );

    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('should have aria-controls matching the listbox id', () => {
    render(
      <MultiSelection
        id="test-select"
        ariaLabel="Test select"
        value={defaultOptions}
        setValue={mockSetValue}
      />,
    );

    const combobox = screen.getByRole('combobox');
    const ariaControls = combobox.getAttribute('aria-controls');
    expect(ariaControls).toBe('test-select-listbox');
  });

  it('should generate aria-controls with auto ID when no id prop is provided', () => {
    render(
      <MultiSelection ariaLabel="Test select" value={defaultOptions} setValue={mockSetValue} />,
    );

    const combobox = screen.getByRole('combobox');
    const ariaControls = combobox.getAttribute('aria-controls');
    expect(ariaControls).toBeTruthy();
    expect(ariaControls).toContain('-listbox');
  });

  it('should set aria-activedescendant on arrow key navigation', () => {
    render(
      <MultiSelection
        id="test-select"
        ariaLabel="Test select"
        value={defaultOptions}
        setValue={mockSetValue}
      />,
    );

    const combobox = screen.getByRole('combobox');

    // Open the dropdown and navigate down
    fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    fireEvent.keyDown(combobox, { key: 'ArrowDown' });

    const activeDescendant = combobox.getAttribute('aria-activedescendant');
    expect(activeDescendant).toBeTruthy();
    expect(activeDescendant).toContain('test-select-option-');
  });

  it('should have matching id on SelectOption elements', () => {
    render(
      <MultiSelection
        id="test-select"
        ariaLabel="Test select"
        value={defaultOptions}
        setValue={mockSetValue}
      />,
    );

    const combobox = screen.getByRole('combobox');

    // Open the dropdown
    fireEvent.click(combobox);

    // Check that options have id attributes matching the expected pattern
    const options = screen.getAllByRole('option');
    options.forEach((option) => {
      const optionId = option.getAttribute('id');
      expect(optionId).toBeTruthy();
      expect(optionId).toContain('test-select-option-');
    });
  });

  it('should set aria-activedescendant matching an option id on arrow navigation', () => {
    render(
      <MultiSelection
        id="test-select"
        ariaLabel="Test select"
        value={defaultOptions}
        setValue={mockSetValue}
      />,
    );

    const combobox = screen.getByRole('combobox');

    // Open dropdown and navigate to first option
    fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    fireEvent.keyDown(combobox, { key: 'ArrowDown' });

    const activeDescendant = combobox.getAttribute('aria-activedescendant');
    expect(activeDescendant).toBeTruthy();

    // The aria-activedescendant value should match an actual option's id
    const options = screen.getAllByRole('option');
    const matchingOption = options.find((opt) => opt.getAttribute('id') === activeDescendant);
    expect(matchingOption).toBeTruthy();
  });

  it('should clear aria-activedescendant on Escape', () => {
    render(
      <MultiSelection
        id="test-select"
        ariaLabel="Test select"
        value={defaultOptions}
        setValue={mockSetValue}
      />,
    );

    const combobox = screen.getByRole('combobox');

    // Open and navigate
    fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    expect(combobox.getAttribute('aria-activedescendant')).toBeTruthy();

    // Escape should clear activeItem
    fireEvent.keyDown(combobox, { key: 'Escape' });
    expect(combobox.getAttribute('aria-activedescendant')).toBeNull();
  });

  it('should have listbox id matching aria-controls when using grouped options only', () => {
    const groupedOptions = [
      {
        id: 'group-1',
        name: 'Group One',
        values: [
          { id: 'opt-1', name: 'Option One', selected: false },
          { id: 'opt-2', name: 'Option Two', selected: false },
        ],
      },
    ];

    render(
      <MultiSelection
        id="test-grouped"
        ariaLabel="Test grouped select"
        groupedValues={groupedOptions}
        setValue={mockSetValue}
      />,
    );

    const combobox = screen.getByRole('combobox');
    fireEvent.click(combobox);

    const ariaControls = combobox.getAttribute('aria-controls');
    expect(ariaControls).toBeTruthy();

    const listbox = document.getElementById(ariaControls as string);
    expect(listbox).toBeInTheDocument();
  });

  it('should have listbox id matching aria-controls when dropdown is open', () => {
    render(
      <MultiSelection
        id="test-select"
        ariaLabel="Test select"
        value={defaultOptions}
        setValue={mockSetValue}
      />,
    );

    const combobox = screen.getByRole('combobox');

    // Open the dropdown
    fireEvent.click(combobox);

    const ariaControls = combobox.getAttribute('aria-controls');
    expect(ariaControls).toBeTruthy();
    const listbox = document.getElementById(ariaControls as string);
    expect(listbox).toBeInTheDocument();
  });
});
