import React from 'react';
import { act, render, renderHook, screen } from '@testing-library/react';
import {
  useMenuPopperInModal,
  resolveSelectPopperAppendTo,
  MODAL_OVERFLOW_UNLOCK_COUNT_ATTR,
} from '#~/utilities/useModalOverflowUnlock';

describe('useMenuPopperInModal', () => {
  it('should unlock dialog overflow while open', () => {
    const anchorRef = React.createRef<HTMLInputElement>();

    const Harness: React.FC<{ open: boolean }> = ({ open }) => {
      useMenuPopperInModal(open, anchorRef);
      return (
        <div role="dialog" style={{ overflow: 'auto' }} data-testid="dialog">
          <input ref={anchorRef} aria-label="anchor" />
        </div>
      );
    };

    const { getByTestId, rerender } = render(<Harness open />);
    const dialog = getByTestId('dialog');
    expect(dialog.style.overflow).toBe('visible');
    expect(dialog.getAttribute(MODAL_OVERFLOW_UNLOCK_COUNT_ATTR)).toBe('1');

    rerender(<Harness open={false} />);
    expect(dialog.style.overflow).toBe('auto');
    expect(dialog.getAttribute(MODAL_OVERFLOW_UNLOCK_COUNT_ATTR)).toBeNull();
  });

  it('should auto-resolve appendTo into the nearest dialog', () => {
    const anchorRef = React.createRef<HTMLInputElement>();

    const { result } = renderHook(() => useMenuPopperInModal(true, anchorRef));

    render(
      <div role="dialog" data-testid="dialog">
        <input ref={anchorRef} aria-label="anchor" />
      </div>,
    );

    const { appendTo } = result.current;
    expect(typeof appendTo).toBe('function');
    if (typeof appendTo === 'function') {
      expect(appendTo()).toBe(screen.getByTestId('dialog'));
    }
  });

  it('should respect an explicit appendTo override', () => {
    const anchorRef = React.createRef<HTMLInputElement>();
    const customTarget = document.createElement('div');

    const { result } = renderHook(() =>
      useMenuPopperInModal(false, anchorRef, { appendTo: customTarget }),
    );

    expect(result.current.appendTo).toBe(customTarget);
  });

  it('should treat appendTo inline as an explicit override', () => {
    const anchorRef = React.createRef<HTMLInputElement>();

    const { result } = renderHook(() =>
      useMenuPopperInModal(false, anchorRef, { appendTo: 'inline' }),
    );

    expect(result.current.appendTo).toBe('inline');
  });

  it('should match resolveSelectPopperAppendTo outside a dialog', () => {
    const anchor = document.createElement('input');
    document.body.appendChild(anchor);
    try {
      expect(resolveSelectPopperAppendTo(anchor)).toBe(document.body);
    } finally {
      document.body.removeChild(anchor);
    }
  });

  it('should preserve other popper props when merging appendTo', () => {
    const anchorRef = React.createRef<HTMLInputElement>();

    const { result } = renderHook(() =>
      useMenuPopperInModal(false, anchorRef, {
        appendTo: undefined,
        maxWidth: 'trigger',
      } as { appendTo?: undefined; maxWidth: 'trigger' }),
    );

    expect(result.current).toEqual(
      expect.objectContaining({
        maxWidth: 'trigger',
        appendTo: expect.any(Function),
      }),
    );
  });

  it('should update unlock when open flips via renderHook', () => {
    const anchorRef = React.createRef<HTMLInputElement>();

    render(
      <div role="dialog" style={{ overflow: 'scroll' }} data-testid="dialog">
        <input ref={anchorRef} aria-label="anchor" />
      </div>,
    );

    const { rerender } = renderHook(({ isOpen }) => useMenuPopperInModal(isOpen, anchorRef), {
      initialProps: { isOpen: true },
    });

    const dialog = screen.getByTestId('dialog');
    expect(dialog.style.overflow).toBe('visible');

    act(() => {
      rerender({ isOpen: false });
    });

    expect(dialog.style.overflow).toBe('scroll');
  });

  it('should stop Escape propagation and call onEscapeClose while open', () => {
    const anchorRef = React.createRef<HTMLInputElement>();
    const onEscapeClose = jest.fn();
    const modalEscapeListener = jest.fn();

    const anchor = document.createElement('input');
    document.body.appendChild(anchor);
    // Assign after append so the ref is live for the capture listener.
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    (anchorRef as React.MutableRefObject<HTMLInputElement | null>).current = anchor;
    document.body.addEventListener('keydown', modalEscapeListener);

    renderHook(() => useMenuPopperInModal(true, anchorRef, undefined, { onEscapeClose }));

    act(() => {
      anchor.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
    });

    expect(onEscapeClose).toHaveBeenCalledTimes(1);
    expect(modalEscapeListener).not.toHaveBeenCalled();

    document.body.removeEventListener('keydown', modalEscapeListener);
    document.body.removeChild(anchor);
  });

  it('should not handle Escape when closed', () => {
    const anchorRef = React.createRef<HTMLInputElement>();
    const onEscapeClose = jest.fn();

    renderHook(() => useMenuPopperInModal(false, anchorRef, undefined, { onEscapeClose }));

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
    });

    expect(onEscapeClose).not.toHaveBeenCalled();
  });

  it('should not intercept Escape when onEscapeClose is omitted', () => {
    const anchorRef = React.createRef<HTMLInputElement>();
    const modalEscapeListener = jest.fn();

    const menu = document.createElement('div');
    document.body.appendChild(menu);
    document.body.addEventListener('keydown', modalEscapeListener);

    renderHook(() => useMenuPopperInModal(true, anchorRef));

    act(() => {
      menu.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
    });

    expect(modalEscapeListener).toHaveBeenCalledTimes(1);

    document.body.removeEventListener('keydown', modalEscapeListener);
    document.body.removeChild(menu);
  });

  it('should ignore Escape when the event target is outside this menu', () => {
    const anchorRef = React.createRef<HTMLInputElement>();
    const onEscapeClose = jest.fn();

    const anchor = document.createElement('input');
    const other = document.createElement('button');
    document.body.appendChild(anchor);
    document.body.appendChild(other);
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    (anchorRef as React.MutableRefObject<HTMLInputElement | null>).current = anchor;

    renderHook(() => useMenuPopperInModal(true, anchorRef, undefined, { onEscapeClose }));

    act(() => {
      other.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
    });

    expect(onEscapeClose).not.toHaveBeenCalled();

    document.body.removeChild(anchor);
    document.body.removeChild(other);
  });

  it('should handle Escape from a portaled listbox referenced by aria-controls', () => {
    const anchorRef = React.createRef<HTMLDivElement>();
    const onEscapeClose = jest.fn();

    const anchor = document.createElement('div');
    const toggle = document.createElement('button');
    toggle.setAttribute('aria-controls', 'test-listbox');
    anchor.appendChild(toggle);
    const listbox = document.createElement('div');
    listbox.id = 'test-listbox';
    const option = document.createElement('div');
    listbox.appendChild(option);
    document.body.appendChild(anchor);
    document.body.appendChild(listbox);
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    (anchorRef as React.MutableRefObject<HTMLDivElement | null>).current = anchor;

    renderHook(() => useMenuPopperInModal(true, anchorRef, undefined, { onEscapeClose }));

    act(() => {
      option.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
    });

    expect(onEscapeClose).toHaveBeenCalledTimes(1);

    document.body.removeChild(anchor);
    document.body.removeChild(listbox);
  });
});
