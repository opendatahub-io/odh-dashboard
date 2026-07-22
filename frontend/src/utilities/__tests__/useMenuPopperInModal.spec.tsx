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
});
