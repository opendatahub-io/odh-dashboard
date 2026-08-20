import React from 'react';
import { act, createEvent, fireEvent, render, screen, within } from '@testing-library/react';
import TypeaheadSelect from '../TypeaheadSelect';
import { MODAL_OVERFLOW_UNLOCK_COUNT_ATTR } from '../../utilities/useModalOverflowUnlock';

const defaultOptions = [
  { content: 'S3', value: 's3' },
  { content: 'URI', value: 'uri' },
  { content: 'OCI', value: 'oci' },
];

describe('TypeaheadSelect', () => {
  it('should wire combobox aria-activedescendant to stable option ids', async () => {
    render(
      <TypeaheadSelect
        id="test-select"
        ariaLabel="Connection type"
        selectOptions={defaultOptions}
        onSelect={jest.fn()}
        isRequired={false}
      />,
    );

    const combobox = screen.getByRole('combobox', { name: 'Connection type' });
    expect(combobox).not.toHaveAttribute('aria-controls');

    await act(async () => {
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    });

    expect(combobox).toHaveAttribute('aria-controls', 'test-select-listbox');
    expect(combobox).toHaveAttribute('aria-activedescendant', 'test-select-option-s-s3');
    expect(document.getElementById('test-select-option-s-s3')).toBeInTheDocument();
    expect(document.getElementById('test-select-listbox')).toBeInTheDocument();

    await act(async () => {
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    });

    expect(combobox).toHaveAttribute('aria-activedescendant', 'test-select-option-s-uuri');
    expect(document.getElementById('test-select-option-s-uuri')).toBeInTheDocument();
  });

  it('should portal options into the modal dialog for screen reader access', async () => {
    const dialogRef = React.createRef<HTMLDivElement>();

    render(
      <div ref={dialogRef} role="dialog" style={{ overflow: 'auto' }}>
        <TypeaheadSelect
          ariaLabel="Connection type"
          selectOptions={defaultOptions}
          onSelect={jest.fn()}
          isRequired={false}
        />
      </div>,
    );

    const dialog = dialogRef.current as HTMLDivElement;
    const combobox = screen.getByRole('combobox', { name: 'Connection type' });

    await act(async () => {
      fireEvent.click(combobox);
    });

    expect(dialog.style.overflow).toBe('visible');
    expect(dialog.getAttribute(MODAL_OVERFLOW_UNLOCK_COUNT_ATTR)).toBe('1');

    const option = within(dialog).getByRole('option', { name: 'S3' });
    expect(option).toBeInTheDocument();
    expect(dialog.contains(option)).toBe(true);
  });

  it('should restore modal overflow when the menu closes', async () => {
    const dialogRef = React.createRef<HTMLDivElement>();

    render(
      <div ref={dialogRef} role="dialog" style={{ overflow: 'auto' }}>
        <TypeaheadSelect
          ariaLabel="Connection type"
          selectOptions={defaultOptions}
          onSelect={jest.fn()}
          isRequired={false}
        />
      </div>,
    );

    const dialog = dialogRef.current as HTMLDivElement;
    const combobox = screen.getByRole('combobox', { name: 'Connection type' });

    await act(async () => {
      fireEvent.click(combobox);
    });
    expect(dialog.style.overflow).toBe('visible');

    await act(async () => {
      fireEvent.keyDown(combobox, { key: 'Escape' });
    });

    expect(dialog.style.overflow).toBe('auto');
    expect(dialog.getAttribute(MODAL_OVERFLOW_UNLOCK_COUNT_ATTR)).toBeNull();
  });

  it('should encode special characters in option element ids', async () => {
    render(
      <TypeaheadSelect
        id="test-select"
        ariaLabel="Connection type"
        selectOptions={[
          { content: 'Core/Pods', value: 'core/pods' },
          { content: 'A B', value: 'a b' },
        ]}
        onSelect={jest.fn()}
        isRequired={false}
      />,
    );

    const combobox = screen.getByRole('combobox', { name: 'Connection type' });

    await act(async () => {
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    });

    expect(combobox).toHaveAttribute('aria-activedescendant', 'test-select-option-s-coreu47upods');
    expect(document.getElementById('test-select-option-s-coreu47upods')).toBeInTheDocument();
  });

  it('should preventDefault on Enter so parent forms do not submit', async () => {
    const onSelect = jest.fn();
    render(
      <form
        onSubmit={(e) => {
          e.preventDefault();
          throw new Error('form should not submit');
        }}
      >
        <TypeaheadSelect
          ariaLabel="Connection type"
          selectOptions={defaultOptions}
          onSelect={onSelect}
          isRequired={false}
        />
      </form>,
    );

    const combobox = screen.getByRole('combobox', { name: 'Connection type' });

    const enterClosed = createEvent.keyDown(combobox, { key: 'Enter' });
    const preventDefaultClosed = jest.spyOn(enterClosed, 'preventDefault');

    await act(async () => {
      fireEvent(combobox, enterClosed);
    });

    expect(preventDefaultClosed).toHaveBeenCalled();
    expect(combobox).toHaveAttribute('aria-expanded', 'true');

    await act(async () => {
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    });

    const enterSelect = createEvent.keyDown(combobox, { key: 'Enter' });
    const preventDefaultSelect = jest.spyOn(enterSelect, 'preventDefault');

    await act(async () => {
      fireEvent(combobox, enterSelect);
    });

    expect(preventDefaultSelect).toHaveBeenCalled();
    expect(onSelect).toHaveBeenCalledWith(expect.anything(), 's3');
  });

  it('should stop Escape propagation and close the menu without relying on modal dismissal', async () => {
    render(
      <TypeaheadSelect
        ariaLabel="Connection type"
        selectOptions={defaultOptions}
        onSelect={jest.fn()}
        isRequired={false}
      />,
    );

    const combobox = screen.getByRole('combobox', { name: 'Connection type' });

    await act(async () => {
      fireEvent.click(combobox);
    });
    expect(combobox).toHaveAttribute('aria-expanded', 'true');

    const escapeEvent = createEvent.keyDown(combobox, { key: 'Escape' });
    const stopPropagation = jest.spyOn(escapeEvent, 'stopPropagation');

    await act(async () => {
      fireEvent(combobox, escapeEvent);
    });

    expect(stopPropagation).toHaveBeenCalled();
    expect(combobox).toHaveAttribute('aria-expanded', 'false');
  });

  it('should keep combobox focus after arrow navigation so Tab can leave the field', async () => {
    render(
      <TypeaheadSelect
        id="test-select"
        ariaLabel="Connection type"
        selectOptions={defaultOptions}
        onSelect={jest.fn()}
        isRequired={false}
      />,
    );

    const combobox = screen.getByRole('combobox', { name: 'Connection type' });

    await act(async () => {
      fireEvent.click(combobox);
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    });

    const firstOption = screen.getByRole('option', { name: 'S3' });
    expect(combobox).toHaveAttribute('aria-activedescendant', 'test-select-option-s-s3');
    expect(document.activeElement).toBe(combobox);

    // Simulate focus drifting into the portaled option before Tab (DaoDao scenario B).
    firstOption.focus();

    await act(async () => {
      fireEvent.keyDown(firstOption, { key: 'Tab' });
      await Promise.resolve();
    });

    expect(combobox).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(combobox);
  });

  it('should close the menu on Tab', async () => {
    const onToggle = jest.fn();
    render(
      <TypeaheadSelect
        ariaLabel="Connection type"
        selectOptions={defaultOptions}
        onSelect={jest.fn()}
        onToggle={onToggle}
        isRequired={false}
      />,
    );

    const combobox = screen.getByRole('combobox', { name: 'Connection type' });

    await act(async () => {
      fireEvent.click(combobox);
    });
    expect(combobox).toHaveAttribute('aria-expanded', 'true');
    onToggle.mockClear();

    await act(async () => {
      fireEvent.keyDown(combobox, { key: 'Tab' });
      await Promise.resolve();
    });

    expect(combobox).toHaveAttribute('aria-expanded', 'false');
    expect(onToggle.mock.calls.filter(([isOpenNow]) => isOpenNow === false)).toHaveLength(1);
  });

  it('should not move focus to the combobox when Tab is pressed on the clear button', async () => {
    render(
      <>
        <TypeaheadSelect
          ariaLabel="Connection type"
          selectOptions={defaultOptions}
          selected="s3"
          allowClear
          onSelect={jest.fn()}
          isRequired={false}
        />
        <button type="button">Next field</button>
      </>,
    );

    const combobox = screen.getByRole('combobox', { name: 'Connection type' });

    await act(async () => {
      fireEvent.click(combobox);
    });
    expect(combobox).toHaveAttribute('aria-expanded', 'true');

    const clearButton = screen.getByRole('button', { name: 'Clear input value' });
    clearButton.focus();
    expect(document.activeElement).toBe(clearButton);

    await act(async () => {
      fireEvent.keyDown(clearButton, { key: 'Tab' });
      await Promise.resolve();
    });

    expect(combobox).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(clearButton);
  });

  it('should give the combobox an accessible name when ariaLabel is omitted', () => {
    render(
      <TypeaheadSelect selectOptions={defaultOptions} onSelect={jest.fn()} isRequired={false} />,
    );

    expect(screen.getByRole('combobox', { name: 'Typeahead menu toggle' })).toBeInTheDocument();
  });

  it('should fall back to toggleProps aria-label for the combobox name', () => {
    render(
      <TypeaheadSelect
        selectOptions={defaultOptions}
        onSelect={jest.fn()}
        toggleProps={{ 'aria-label': 'Storage picker' }}
        isRequired={false}
      />,
    );

    expect(screen.getByRole('combobox', { name: 'Storage picker' })).toBeInTheDocument();
  });

  it('should prefer ariaLabel over toggleProps aria-label for the combobox', () => {
    render(
      <TypeaheadSelect
        selectOptions={defaultOptions}
        onSelect={jest.fn()}
        ariaLabel="Connection type"
        toggleProps={{ 'aria-label': 'Storage picker' }}
        isRequired={false}
      />,
    );

    expect(screen.getByRole('combobox', { name: 'Connection type' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Storage picker' })).not.toBeInTheDocument();
  });

  it('should still apply toggleProps that the typeahead does not own', () => {
    render(
      <TypeaheadSelect
        selectOptions={defaultOptions}
        onSelect={jest.fn()}
        ariaLabel="Connection type"
        toggleProps={{ id: 'notebook-search-input', style: { minWidth: '200px' } }}
        isRequired={false}
      />,
    );

    const toggle = screen.getByTestId('typeahead-menu-toggle');
    expect(toggle).toHaveAttribute('id', 'notebook-search-input');
    expect(toggle).toHaveStyle({ minWidth: '200px' });
    expect(screen.getByRole('combobox', { name: 'Connection type' })).toBeInTheDocument();
  });

  it('should call onToggle(false) once when Tab races with PatternFly close', async () => {
    const onToggle = jest.fn();
    render(
      <TypeaheadSelect
        ariaLabel="Connection type"
        selectOptions={defaultOptions}
        onSelect={jest.fn()}
        onToggle={onToggle}
        isRequired={false}
      />,
    );

    const combobox = screen.getByRole('combobox', { name: 'Connection type' });

    await act(async () => {
      fireEvent.click(combobox);
    });
    onToggle.mockClear();

    await act(async () => {
      fireEvent.keyDown(combobox, { key: 'Tab' });
      fireEvent.keyDown(combobox, { key: 'Escape' });
      await Promise.resolve();
    });

    expect(onToggle.mock.calls.filter(([isOpenNow]) => isOpenNow === false)).toHaveLength(1);
  });

  it('should keep aria-activedescendant aligned with grouped render order', async () => {
    render(
      <TypeaheadSelect
        id="test-select"
        ariaLabel="Persistent storage"
        selectOptions={[
          { content: 'ungrouped-first', value: 'solo' },
          { content: 'grouped-a', value: 'alpha', group: 'Group A' },
          { content: 'grouped-b', value: 'beta', group: 'Group A' },
        ]}
        onSelect={jest.fn()}
        isRequired={false}
      />,
    );

    const combobox = screen.getByRole('combobox', { name: 'Persistent storage' });

    await act(async () => {
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    });

    // Render order: groups first, then ungrouped — first arrow focuses alpha
    expect(combobox).toHaveAttribute('aria-activedescendant', 'test-select-option-s-alpha');
    expect(document.getElementById('test-select-option-s-alpha')).toBeInTheDocument();
  });

  it('should not throw when options shrink under a stale focused index', async () => {
    const { rerender } = render(
      <TypeaheadSelect
        id="test-select"
        ariaLabel="Connection type"
        selectOptions={defaultOptions}
        onSelect={jest.fn()}
        isRequired={false}
      />,
    );

    const combobox = screen.getByRole('combobox', { name: 'Connection type' });

    await act(async () => {
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    });
    await act(async () => {
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    });
    expect(combobox).toHaveAttribute('aria-activedescendant', 'test-select-option-s-uuri');

    rerender(
      <TypeaheadSelect
        id="test-select"
        ariaLabel="Connection type"
        selectOptions={[{ content: 'S3', value: 's3' }]}
        onSelect={jest.fn()}
        isRequired={false}
      />,
    );

    await act(async () => {
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    });

    expect(combobox).not.toHaveAttribute('aria-activedescendant');
  });
});
