import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import SimpleSelect from '#~/components/SimpleSelect';
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

  it('should not select aria-disabled options', async () => {
    const onChange = jest.fn();

    render(
      <SimpleSelect
        value={undefined}
        options={[
          { key: 'config-map', label: 'Config map' },
          { key: 'secret', label: 'Secret', isAriaDisabled: true },
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
});
