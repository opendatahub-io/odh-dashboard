import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
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

    expect(combobox).toHaveAttribute('aria-activedescendant', 'test-select-option-connection-1');
    expect(document.getElementById('test-select-option-connection-1')).toBeInTheDocument();

    await act(async () => {
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    });

    expect(combobox).toHaveAttribute('aria-activedescendant', 'test-select-option-connection-2');
    expect(document.getElementById('test-select-option-connection-2')).toBeInTheDocument();
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

    expect(combobox).toHaveAttribute('aria-activedescendant', 'test-select-option-connection-2');

    await act(async () => {
      fireEvent.keyDown(combobox, { key: 'Enter' });
    });

    expect(combobox).not.toHaveAttribute('aria-activedescendant');
    expect(combobox).toHaveValue('');
  });

  it('should prevent default Enter behavior to avoid submitting parent forms', async () => {
    const onSubmit = jest.fn((event) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <MultiSelection
          id="test-select"
          ariaLabel="Connections"
          value={defaultOptions}
          setValue={jest.fn()}
        />
      </form>,
    );

    const combobox = screen.getByRole('combobox', { name: 'Connections' });

    await act(async () => {
      fireEvent.keyDown(combobox, { key: 'Enter' });
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should pass hasCheckbox to regular options when enabled (upstream RHOAIENG-63155)', async () => {
    render(
      <MultiSelection
        id="test-select"
        ariaLabel="Resources"
        value={defaultOptions}
        setValue={jest.fn()}
        hasCheckbox
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('combobox', { name: 'Resources' }));
    });

    screen.getAllByRole('menuitem').forEach((option) => {
      expect(within(option).getByRole('checkbox')).toBeInTheDocument();
    });
  });

  it('should not pass hasCheckbox to creatable options (upstream behavior)', async () => {
    render(
      <MultiSelection
        id="test-select"
        ariaLabel="API groups"
        value={[{ id: 'apps', name: 'apps', selected: false }]}
        setValue={jest.fn()}
        isCreatable
        hasCheckbox
        createOptionMessage={(val) => `Use custom API group "${val}"`}
      />,
    );

    const combobox = screen.getByRole('combobox', { name: 'API groups' });

    await act(async () => {
      fireEvent.change(combobox, { target: { value: 'custom.io' } });
    });

    const createOption = screen.getByRole('option', { name: /Use custom API group "custom.io"/ });
    expect(within(createOption).queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('should key options by id when duplicate names exist (upstream RHOAIENG-63155)', async () => {
    const duplicateNameOptions: SelectionOptions[] = [
      { id: 'core/pods', name: 'pods', selected: false },
      { id: '/pods', name: 'pods', selected: false },
    ];

    render(
      <MultiSelection
        id="test-select"
        ariaLabel="Resource types"
        value={duplicateNameOptions}
        setValue={jest.fn()}
        hasCheckbox
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('combobox', { name: 'Resource types' }));
    });

    expect(screen.getAllByRole('menuitem')).toHaveLength(2);
    expect(document.getElementById('test-select-option-coreu47upods')).toBeInTheDocument();
    expect(document.getElementById('test-select-option-u47upods')).toBeInTheDocument();
  });
});
