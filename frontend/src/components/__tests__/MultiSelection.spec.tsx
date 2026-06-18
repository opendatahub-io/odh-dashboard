import React from 'react';
import { act, createEvent, fireEvent, render, screen, within } from '@testing-library/react';
import { MultiSelection, SelectionOptions } from '#~/components/MultiSelection';

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
  });

  it('should reset keyboard focus when clearing all selections', async () => {
    const setValue = jest.fn();
    const selectedOptions = defaultOptions.map((option, index) => ({
      ...option,
      selected: index === 0,
    }));

    render(
      <MultiSelection
        id="test-select"
        ariaLabel="Connections"
        value={selectedOptions}
        setValue={setValue}
      />,
    );

    const combobox = screen.getByRole('combobox', { name: 'Connections' });

    await act(async () => {
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    });

    expect(combobox).toHaveAttribute('aria-activedescendant');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Clear input value' }));
    });

    expect(combobox).not.toHaveAttribute('aria-activedescendant');
    expect(setValue).toHaveBeenCalledWith(
      selectedOptions.map((option) => ({ ...option, selected: false })),
    );
  });

  it('should focus the first option when opening via toggle click', async () => {
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
      fireEvent.click(combobox);
    });

    expect(combobox).toHaveAttribute('aria-expanded', 'true');
    expect(combobox).toHaveAttribute('aria-activedescendant', 'test-select-option-connection-1');
  });

  it('should render grouped option labels for groupedValues consumers', async () => {
    render(
      <MultiSelection
        id="test-select"
        ariaLabel="Metrics"
        groupedValues={[
          {
            id: 'SPD',
            name: 'SPD',
            values: [{ id: 'spd-1', name: 'SPD metric', selected: false }],
          },
          {
            id: 'DIR',
            name: 'DIR',
            values: [{ id: 'dir-1', name: 'DIR metric', selected: false }],
          },
        ]}
        setValue={jest.fn()}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('combobox', { name: 'Metrics' }));
    });

    expect(screen.getByText('SPD')).toBeInTheDocument();
    expect(screen.getByText('DIR')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'SPD metric' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'DIR metric' })).toBeInTheDocument();
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

  it('should produce distinct DOM ids for encoded and literal u47u option ids', async () => {
    const collisionRiskOptions: SelectionOptions[] = [
      { id: 'core/pods', name: 'pods from slash', selected: false },
      { id: 'coreu47upods', name: 'pods from literal', selected: false },
    ];

    render(
      <MultiSelection
        id="test-select"
        ariaLabel="Resource types"
        value={collisionRiskOptions}
        setValue={jest.fn()}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('combobox', { name: 'Resource types' }));
    });

    const slashEncodedId = document.getElementById('test-select-option-coreu47upods');
    const literalEncodedId = document.getElementById('test-select-option-coreuu47uupods');

    expect(slashEncodedId).toBeInTheDocument();
    expect(literalEncodedId).toBeInTheDocument();
    expect(slashEncodedId).not.toBe(literalEncodedId);
  });

  it('should restore modal overflow when a menu closes', async () => {
    const dialogRef = React.createRef<HTMLDivElement>();

    render(
      <div ref={dialogRef} role="dialog" style={{ overflow: 'auto' }}>
        <MultiSelection
          id="select-a"
          ariaLabel="API groups"
          value={defaultOptions}
          setValue={jest.fn()}
        />
      </div>,
    );

    const dialog = dialogRef.current as HTMLDivElement;
    const combobox = screen.getByRole('combobox', { name: 'API groups' });

    await act(async () => {
      fireEvent.click(combobox);
    });
    expect(dialog.style.overflow).toBe('visible');

    await act(async () => {
      fireEvent.keyDown(combobox, { key: 'Escape' });
    });
    expect(dialog.style.overflow).toBe('auto');
    expect(dialog.getAttribute('data-multiselection-overflow-unlock-count')).toBeNull();
  });

  it('should keep modal overflow unlocked when switching between two instances', async () => {
    const dialogRef = React.createRef<HTMLDivElement>();

    render(
      <div ref={dialogRef} role="dialog" style={{ overflow: 'auto' }}>
        <MultiSelection
          id="select-a"
          ariaLabel="API groups"
          value={defaultOptions}
          setValue={jest.fn()}
        />
        <MultiSelection
          id="select-b"
          ariaLabel="Resource types"
          value={defaultOptions}
          setValue={jest.fn()}
        />
      </div>,
    );

    const dialog = dialogRef.current as HTMLDivElement;
    const comboboxA = screen.getByRole('combobox', { name: 'API groups' });
    const comboboxB = screen.getByRole('combobox', { name: 'Resource types' });

    await act(async () => {
      fireEvent.click(comboboxA);
    });
    expect(dialog.style.overflow).toBe('visible');

    // Opening the second combobox closes the first menu (PF outside-click behavior).
    await act(async () => {
      fireEvent.click(comboboxB);
    });
    expect(dialog.style.overflow).toBe('visible');
    expect(dialog.getAttribute('data-multiselection-overflow-unlock-count')).toBe('1');

    await act(async () => {
      fireEvent.keyDown(comboboxB, { key: 'Escape' });
    });
    expect(dialog.style.overflow).toBe('auto');
    expect(dialog.getAttribute('data-multiselection-overflow-unlock-count')).toBeNull();
  });
});
