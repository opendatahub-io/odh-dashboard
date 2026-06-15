import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MultiSelection, SelectionOptions } from '#~/components/MultiSelection';

const defaultOptions: SelectionOptions[] = [
  { id: 'connection-1', name: 'Connection 1', selected: false },
  { id: 'connection-2', name: 'Connection 2', selected: false },
  { id: 'connection-3', name: 'Connection 3', selected: false },
];

describe('MultiSelection', () => {
  it('should wire combobox aria-activedescendant to option ids per PatternFly typeahead pattern', async () => {
    render(
      <MultiSelection
        id="test-select"
        ariaLabel="Connections"
        value={defaultOptions}
        setValue={jest.fn()}
      />,
    );

    const combobox = screen.getByRole('combobox', { name: 'Connections' });
    expect(combobox).toHaveAttribute('aria-controls', 'test-select-listbox');

    await act(async () => {
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    });

    expect(combobox).toHaveAttribute(
      'aria-activedescendant',
      'select-multi-typeahead-connection-1',
    );
    expect(document.getElementById('select-multi-typeahead-connection-1')).toBeInTheDocument();

    await act(async () => {
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    });

    expect(combobox).toHaveAttribute(
      'aria-activedescendant',
      'select-multi-typeahead-connection-2',
    );
    expect(document.getElementById('select-multi-typeahead-connection-2')).toBeInTheDocument();
  });

  it('should expose a listbox id linked from aria-controls', async () => {
    render(
      <MultiSelection
        id="test-select"
        ariaLabel="Connections"
        value={defaultOptions}
        setValue={jest.fn()}
      />,
    );

    const combobox = screen.getByRole('combobox', { name: 'Connections' });

    await act(async () => {
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    });

    expect(document.getElementById('test-select-listbox')).toBeInTheDocument();
  });

  it('should clear keyboard focus when a selection clears the filter input', async () => {
    render(
      <MultiSelection
        id="test-select"
        ariaLabel="Connections"
        value={defaultOptions}
        setValue={jest.fn()}
      />,
    );

    const combobox = screen.getByRole('combobox', { name: 'Connections' });

    await act(async () => {
      fireEvent.change(combobox, { target: { value: 'Connection 2' } });
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    });

    expect(combobox).toHaveAttribute(
      'aria-activedescendant',
      'select-multi-typeahead-connection-2',
    );

    await act(async () => {
      fireEvent.keyDown(combobox, { key: 'Enter' });
    });

    expect(combobox).not.toHaveAttribute('aria-activedescendant');
    expect(combobox).toHaveValue('');
  });
});
