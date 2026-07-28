import React from 'react';
import { act, createEvent, fireEvent, render, screen, within } from '@testing-library/react';
import { MultiSelection, SelectionOptions } from '#~/components/MultiSelection';
import { MODAL_OVERFLOW_UNLOCK_COUNT_ATTR } from '#~/utilities/useModalOverflowUnlock';

const defaultOptions: SelectionOptions[] = [
  { id: 'connection-1', name: 'Connection 1', selected: false },
  { id: 'connection-2', name: 'Connection 2', selected: false },
  { id: 'connection-3', name: 'Connection 3', selected: false },
];

describe('MultiSelection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  it('should call setValue when Enter selects a focused option', async () => {
    const setValue = jest.fn();
    render(
      <MultiSelection
        id="test-select"
        ariaLabel="Connections"
        value={defaultOptions}
        setValue={setValue}
      />,
    );

    const combobox = screen.getByRole('combobox', { name: 'Connections' });

    await act(async () => {
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    });

    await act(async () => {
      fireEvent.keyDown(combobox, { key: 'Enter' });
    });

    expect(setValue).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 'connection-1', selected: true })]),
    );
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
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    });

    const enterEvent = createEvent.keyDown(combobox, { key: 'Enter', cancelable: true });
    await act(async () => {
      fireEvent(combobox, enterEvent);
    });

    expect(enterEvent.defaultPrevented).toBe(true);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should wrap ArrowUp from the first option to the last option', async () => {
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

    expect(combobox).toHaveAttribute('aria-activedescendant', 'test-select-option-connection-1');

    await act(async () => {
      fireEvent.keyDown(combobox, { key: 'ArrowUp' });
    });

    expect(combobox).toHaveAttribute('aria-activedescendant', 'test-select-option-connection-3');
  });

  it('should close the menu on Escape and Tab', async () => {
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

    expect(combobox).toHaveAttribute('aria-expanded', 'true');

    await act(async () => {
      fireEvent.keyDown(combobox, { key: 'Escape' });
    });

    expect(combobox).toHaveAttribute('aria-expanded', 'false');
    expect(combobox).not.toHaveAttribute('aria-activedescendant');

    await act(async () => {
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    });

    expect(combobox).toHaveAttribute('aria-expanded', 'true');

    await act(async () => {
      fireEvent.keyDown(combobox, { key: 'Tab' });
    });

    expect(combobox).toHaveAttribute('aria-expanded', 'false');
    expect(combobox).not.toHaveAttribute('aria-activedescendant');
  });

  it('should wrap ArrowDown from the last option to the first option', async () => {
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
    expect(combobox).toHaveAttribute('aria-activedescendant', 'test-select-option-connection-1');

    await act(async () => {
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    });
    expect(combobox).toHaveAttribute('aria-activedescendant', 'test-select-option-connection-2');

    await act(async () => {
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    });
    expect(combobox).toHaveAttribute('aria-activedescendant', 'test-select-option-connection-3');

    await act(async () => {
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    });
    expect(combobox).toHaveAttribute('aria-activedescendant', 'test-select-option-connection-1');
  });

  it('should announce no results found when the menu opens with no options', async () => {
    render(
      <MultiSelection id="test-select" ariaLabel="Connections" value={[]} setValue={jest.fn()} />,
    );

    const combobox = screen.getByRole('combobox', { name: 'Connections' });

    await act(async () => {
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    });

    const liveRegion = document.querySelector('[aria-live="polite"].pf-v6-u-screen-reader');
    expect(liveRegion).toHaveTextContent('No results found');
  });

  it('should skip disabled options when navigating with arrow keys', async () => {
    const optionsWithDisabled: SelectionOptions[] = [
      { id: 'connection-1', name: 'Connection 1', selected: false },
      { id: 'connection-2', name: 'Connection 2', selected: false, isDisabled: true },
      { id: 'connection-3', name: 'Connection 3', selected: false },
    ];

    render(
      <MultiSelection
        id="test-select"
        ariaLabel="Connections"
        value={optionsWithDisabled}
        setValue={jest.fn()}
      />,
    );

    const combobox = screen.getByRole('combobox', { name: 'Connections' });

    await act(async () => {
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    });

    expect(combobox).toHaveAttribute('aria-activedescendant', 'test-select-option-connection-1');

    await act(async () => {
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    });

    expect(combobox).toHaveAttribute('aria-activedescendant', 'test-select-option-connection-3');
  });

  it('should produce distinct aria-activedescendant ids for slash and encoded slash-like ids', async () => {
    const slashOptions: SelectionOptions[] = [
      { id: 'core/pods', name: 'Core Pods', selected: false },
      { id: 'coreu47upods', name: 'Encoded Pods', selected: false },
    ];

    render(
      <MultiSelection
        id="test-select"
        ariaLabel="Resources"
        value={slashOptions}
        setValue={jest.fn()}
      />,
    );

    const combobox = screen.getByRole('combobox', { name: 'Resources' });

    await act(async () => {
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    });

    const slashDescendant = 'test-select-option-coreu47upods';
    const encodedDescendant = 'test-select-option-coreuu47uupods';

    expect(combobox).toHaveAttribute('aria-activedescendant', slashDescendant);
    expect(document.getElementById(slashDescendant)).toBeInTheDocument();
    expect(document.getElementById(encodedDescendant)).toBeInTheDocument();
    expect(slashDescendant).not.toBe(encodedDescendant);

    await act(async () => {
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    });

    expect(combobox).toHaveAttribute('aria-activedescendant', encodedDescendant);
  });

  it('should announce no results found when filtering yields no matches', async () => {
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
      fireEvent.change(combobox, { target: { value: 'nonexistent' } });
    });

    const liveRegion = document.querySelector('[aria-live="polite"].pf-v6-u-screen-reader');
    expect(liveRegion).toHaveTextContent('No results found');
  });

  it('should not persist an unselected creatable option when selecting an existing option', async () => {
    const setValue = jest.fn();
    render(
      <MultiSelection
        id="test-select"
        ariaLabel="Connections"
        value={defaultOptions}
        setValue={setValue}
        isCreatable
      />,
    );

    const combobox = screen.getByRole('combobox', { name: 'Connections' });

    await act(async () => {
      fireEvent.change(combobox, { target: { value: 'Conn' } });
    });

    await act(async () => {
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    });

    await act(async () => {
      fireEvent.keyDown(combobox, { key: 'Enter' });
    });

    expect(setValue).toHaveBeenCalled();
    const persistedOptions = setValue.mock.calls.at(-1)?.[0] as SelectionOptions[];
    expect(persistedOptions.some((option) => option.id === 'Conn')).toBe(false);
    expect(persistedOptions.some((option) => option.id === 'connection-1' && option.selected)).toBe(
      true,
    );
  });

  it('should restore modal overflow when a menu closes', async () => {
    const dialogRef = React.createRef<HTMLDivElement>();

    render(
      <div ref={dialogRef} role="dialog" style={{ overflow: 'auto' }}>
        <MultiSelection
          id="test-select"
          ariaLabel="Connections"
          value={defaultOptions}
          setValue={jest.fn()}
        />
      </div>,
    );

    const dialog = dialogRef.current as HTMLDivElement;
    const combobox = screen.getByRole('combobox', { name: 'Connections' });

    await act(async () => {
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    });

    expect(dialog.style.overflow).toBe('visible');
    expect(dialog.getAttribute(MODAL_OVERFLOW_UNLOCK_COUNT_ATTR)).toBe('1');

    await act(async () => {
      fireEvent.keyDown(combobox, { key: 'Escape' });
    });

    expect(dialog.style.overflow).toBe('auto');
    expect(dialog.getAttribute(MODAL_OVERFLOW_UNLOCK_COUNT_ATTR)).toBeNull();
  });

  it('should portal options into the modal dialog for screen reader access', async () => {
    const dialogRef = React.createRef<HTMLDivElement>();

    render(
      <div ref={dialogRef} role="dialog" style={{ overflow: 'auto' }}>
        <MultiSelection
          id="test-select"
          ariaLabel="Connections"
          value={defaultOptions}
          setValue={jest.fn()}
        />
      </div>,
    );

    const dialog = dialogRef.current as HTMLDivElement;
    const combobox = screen.getByRole('combobox', { name: 'Connections' });

    await act(async () => {
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    });

    expect(within(dialog).getByRole('option', { name: 'Connection 1' })).toBeInTheDocument();
    expect(within(dialog).getByRole('option', { name: 'Connection 2' })).toBeInTheDocument();
  });

  it('should select options when option id is numeric', async () => {
    const setValue = jest.fn();
    const numericOptions: SelectionOptions[] = [
      { id: 1, name: 'One', selected: false },
      { id: 2, name: 'Two', selected: false },
    ];

    render(
      <MultiSelection
        id="test-select"
        ariaLabel="Items"
        value={numericOptions}
        setValue={setValue}
      />,
    );

    const combobox = screen.getByRole('combobox', { name: 'Items' });

    await act(async () => {
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    });

    expect(combobox).toHaveAttribute('aria-activedescendant', 'test-select-option-1');
    expect(document.getElementById('test-select-option-1')).toBeInTheDocument();

    await act(async () => {
      fireEvent.keyDown(combobox, { key: 'Enter' });
    });

    expect(setValue).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 1, selected: true })]),
    );
  });
});
