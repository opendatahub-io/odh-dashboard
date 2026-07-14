import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import SimpleSelect from '@odh-dashboard/ui-core/components/SimpleSelect';
import { MultiSelection, SelectionOptions } from '#~/components/MultiSelection';
import { MODAL_OVERFLOW_UNLOCK_COUNT_ATTR } from '#~/utilities/useModalOverflowUnlock';

describe('SimpleSelect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render toggle with default aria-label', () => {
    render(
      <SimpleSelect
        value={undefined}
        options={[
          { key: 'config-map', label: 'Config map' },
          { key: 'secret', label: 'Secret' },
        ]}
        onChange={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Options menu' })).toBeInTheDocument();
  });

  it('should use an associated label when toggleProps.id is set', () => {
    render(
      <>
        <label htmlFor="environment-variable-type-select">Variable type</label>
        <SimpleSelect
          value={undefined}
          toggleProps={{ id: 'environment-variable-type-select' }}
          options={[
            { key: 'config-map', label: 'Config map' },
            { key: 'secret', label: 'Secret' },
          ]}
          onChange={jest.fn()}
        />
      </>,
    );

    expect(screen.getByRole('button', { name: 'Variable type' })).toBeInTheDocument();
  });

  it('should support a custom aria-label', () => {
    render(
      <SimpleSelect
        value={undefined}
        ariaLabel="Environment variable type"
        options={[{ key: 'config-map', label: 'Config map' }]}
        onChange={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Environment variable type' })).toBeInTheDocument();
  });

  it('should preserve toggleProps aria-label override', () => {
    render(
      <SimpleSelect
        value={undefined}
        toggleProps={{ 'aria-label': 'Custom toggle label' }}
        options={[{ key: 'config-map', label: 'Config map' }]}
        onChange={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Custom toggle label' })).toBeInTheDocument();
  });

  it('should restore modal overflow when the menu closes', async () => {
    const dialogRef = React.createRef<HTMLDivElement>();

    render(
      <div ref={dialogRef} role="dialog" style={{ overflow: 'auto' }}>
        <SimpleSelect
          value={undefined}
          options={[
            { key: 'config-map', label: 'Config map' },
            { key: 'secret', label: 'Secret' },
          ]}
          onChange={jest.fn()}
        />
      </div>,
    );

    const dialog = dialogRef.current as HTMLDivElement;
    const toggle = screen.getByRole('button', { name: 'Options menu' });

    await act(async () => {
      fireEvent.click(toggle);
    });
    expect(dialog.style.overflow).toBe('visible');

    await act(async () => {
      fireEvent.keyDown(toggle, { key: 'Escape' });
    });
    expect(dialog.style.overflow).toBe('auto');
    expect(dialog.getAttribute(MODAL_OVERFLOW_UNLOCK_COUNT_ATTR)).toBeNull();
  });

  it('should portal options into the modal dialog for screen reader access', async () => {
    const dialogRef = React.createRef<HTMLDivElement>();

    render(
      <div ref={dialogRef} role="dialog" style={{ overflow: 'auto' }}>
        <SimpleSelect
          value={undefined}
          options={[
            { key: 'config-map', label: 'Config map' },
            { key: 'secret', label: 'Secret' },
          ]}
          onChange={jest.fn()}
        />
      </div>,
    );

    const dialog = dialogRef.current as HTMLDivElement;
    const toggle = screen.getByRole('button', { name: 'Options menu' });

    await act(async () => {
      fireEvent.click(toggle);
    });

    expect(within(dialog).getByRole('option', { name: 'Config map' })).toBeInTheDocument();
    expect(within(dialog).getByRole('option', { name: 'Secret' })).toBeInTheDocument();
  });

  it('should toggle aria-expanded when opening and closing', async () => {
    render(
      <SimpleSelect
        value={undefined}
        options={[
          { key: 'config-map', label: 'Config map' },
          { key: 'secret', label: 'Secret' },
        ]}
        onChange={jest.fn()}
      />,
    );

    const toggle = screen.getByRole('button', { name: 'Options menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await act(async () => {
      fireEvent.click(toggle);
    });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await act(async () => {
      fireEvent.keyDown(toggle, { key: 'Escape' });
    });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('should call onChange when an option is selected', async () => {
    const onChange = jest.fn();

    render(
      <SimpleSelect
        value={undefined}
        options={[
          { key: 'config-map', label: 'Config map' },
          { key: 'secret', label: 'Secret' },
        ]}
        onChange={onChange}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Options menu' }));
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('option', { name: 'Secret' }));
    });

    expect(onChange).toHaveBeenCalledWith('secret', false);
  });

  it('should not select disabled options', async () => {
    const onChange = jest.fn();

    render(
      <SimpleSelect
        value={undefined}
        options={[
          { key: 'config-map', label: 'Config map' },
          { key: 'secret', label: 'Secret', isDisabled: true },
        ]}
        onChange={onChange}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Options menu' }));
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('option', { name: 'Secret' }));
    });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('should pass isPlaceholder when auto-selecting the only option', () => {
    const onChange = jest.fn();

    render(
      <SimpleSelect
        value={undefined}
        options={[{ key: 'placeholder-key', label: 'Placeholder', isPlaceholder: true }]}
        onChange={onChange}
      />,
    );

    expect(onChange).toHaveBeenCalledWith('placeholder-key', true);
  });

  it('should render toggle inside display-contents anchor with data-testid', () => {
    const { container } = render(
      <SimpleSelect
        dataTestId="environment-variable-type-toggle"
        value={undefined}
        options={[{ key: 'config-map', label: 'Config map' }]}
        onChange={jest.fn()}
      />,
    );

    expect(container.querySelector('.odh-simple-select__toggle-anchor')).toBeInTheDocument();
    expect(screen.getByTestId('environment-variable-type-toggle')).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('should share modal overflow ref-count with MultiSelection in the same dialog', async () => {
    const dialogRef = React.createRef<HTMLDivElement>();
    const multiOptions: SelectionOptions[] = [
      { id: 'connection-1', name: 'Connection 1', selected: false },
      { id: 'connection-2', name: 'Connection 2', selected: false },
    ];

    render(
      <div ref={dialogRef} role="dialog" style={{ overflow: 'auto' }}>
        <SimpleSelect
          value={undefined}
          options={[
            { key: 'config-map', label: 'Config map' },
            { key: 'secret', label: 'Secret' },
          ]}
          onChange={jest.fn()}
        />
        <MultiSelection
          id="connections-select"
          ariaLabel="Connections"
          value={multiOptions}
          setValue={jest.fn()}
        />
      </div>,
    );

    const dialog = dialogRef.current as HTMLDivElement;
    const simpleToggle = screen.getByRole('button', { name: 'Options menu' });
    const multiCombobox = screen.getByRole('combobox', { name: 'Connections' });

    await act(async () => {
      fireEvent.click(simpleToggle);
    });
    expect(dialog.getAttribute(MODAL_OVERFLOW_UNLOCK_COUNT_ATTR)).toBe('1');

    await act(async () => {
      fireEvent.keyDown(multiCombobox, { key: 'ArrowDown' });
    });
    expect(dialog.getAttribute(MODAL_OVERFLOW_UNLOCK_COUNT_ATTR)).toBe('2');

    await act(async () => {
      fireEvent.keyDown(simpleToggle, { key: 'Escape' });
    });
    expect(dialog.getAttribute(MODAL_OVERFLOW_UNLOCK_COUNT_ATTR)).toBe('1');

    await act(async () => {
      fireEvent.keyDown(multiCombobox, { key: 'Escape' });
    });
    expect(dialog.getAttribute(MODAL_OVERFLOW_UNLOCK_COUNT_ATTR)).toBeNull();
    expect(dialog.style.overflow).toBe('auto');
  });
});
