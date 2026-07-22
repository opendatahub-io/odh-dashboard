import React from 'react';
import { act, createEvent, fireEvent, render, screen, within } from '@testing-library/react';
import TypeaheadSelect from '@odh-dashboard/ui-core/components/TypeaheadSelect';
import { MODAL_OVERFLOW_UNLOCK_COUNT_ATTR } from '#~/utilities/useModalOverflowUnlock';

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
    expect(combobox).toHaveAttribute('aria-controls', 'test-select-listbox');

    await act(async () => {
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    });

    expect(combobox).toHaveAttribute('aria-activedescendant', 'test-select-option-s3');
    expect(document.getElementById('test-select-option-s3')).toBeInTheDocument();
    expect(document.getElementById('test-select-listbox')).toBeInTheDocument();

    await act(async () => {
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    });

    expect(combobox).toHaveAttribute('aria-activedescendant', 'test-select-option-uuri');
    expect(document.getElementById('test-select-option-uuri')).toBeInTheDocument();
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

    expect(combobox).toHaveAttribute('aria-activedescendant', 'test-select-option-coreu47upods');
    expect(document.getElementById('test-select-option-coreu47upods')).toBeInTheDocument();
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

  it('should close the menu on Tab', async () => {
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

    await act(async () => {
      fireEvent.keyDown(combobox, { key: 'Tab' });
    });

    expect(combobox).toHaveAttribute('aria-expanded', 'false');
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
    expect(combobox).toHaveAttribute('aria-activedescendant', 'test-select-option-alpha');
    expect(document.getElementById('test-select-option-alpha')).toBeInTheDocument();
  });
});
