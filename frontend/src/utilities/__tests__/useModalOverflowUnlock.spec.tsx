import React from 'react';
import { act, render, renderHook } from '@testing-library/react';
import {
  MODAL_OVERFLOW_UNLOCK_COUNT_ATTR,
  resolveSelectPopperAppendTo,
  useModalOverflowUnlock,
} from '#~/utilities/useModalOverflowUnlock';

type HarnessProps = {
  openA: boolean;
  openB?: boolean;
  inDialog?: boolean;
};

const HookHarness: React.FC<HarnessProps> = ({ openA, openB = false, inDialog = true }) => {
  const anchorARef = React.useRef<HTMLInputElement>(null);
  const anchorBRef = React.useRef<HTMLInputElement>(null);

  useModalOverflowUnlock(openA, anchorARef);
  useModalOverflowUnlock(openB, anchorBRef);

  const fields = (
    <>
      <input ref={anchorARef} aria-label="anchor-a" />
      <input ref={anchorBRef} aria-label="anchor-b" />
    </>
  );

  if (!inDialog) {
    return fields;
  }

  return (
    <div role="dialog" style={{ overflow: 'auto' }} data-testid="dialog">
      {fields}
    </div>
  );
};

describe('useModalOverflowUnlock', () => {
  it('should unlock dialog overflow while open and restore on close', () => {
    const { getByTestId, rerender } = render(<HookHarness openA />);
    const dialog = getByTestId('dialog');

    expect(dialog.style.overflow).toBe('visible');
    expect(dialog.getAttribute(MODAL_OVERFLOW_UNLOCK_COUNT_ATTR)).toBe('1');

    rerender(<HookHarness openA={false} />);

    expect(dialog.style.overflow).toBe('auto');
    expect(dialog.getAttribute(MODAL_OVERFLOW_UNLOCK_COUNT_ATTR)).toBeNull();
  });

  it('should ref-count when multiple instances share a dialog', () => {
    const { getByTestId, rerender } = render(<HookHarness openA />);
    const dialog = getByTestId('dialog');

    expect(dialog.getAttribute(MODAL_OVERFLOW_UNLOCK_COUNT_ATTR)).toBe('1');

    rerender(<HookHarness openA openB />);

    expect(dialog.getAttribute(MODAL_OVERFLOW_UNLOCK_COUNT_ATTR)).toBe('2');
    expect(dialog.style.overflow).toBe('visible');

    rerender(<HookHarness openA={false} openB />);

    expect(dialog.getAttribute(MODAL_OVERFLOW_UNLOCK_COUNT_ATTR)).toBe('1');
    expect(dialog.style.overflow).toBe('visible');

    rerender(<HookHarness openA={false} openB={false} />);

    expect(dialog.getAttribute(MODAL_OVERFLOW_UNLOCK_COUNT_ATTR)).toBeNull();
    expect(dialog.style.overflow).toBe('auto');
  });

  it('should not mutate DOM when anchor is outside a dialog', () => {
    render(<HookHarness openA inDialog={false} />);

    expect(document.querySelector(`[${MODAL_OVERFLOW_UNLOCK_COUNT_ATTR}]`)).toBeNull();
  });

  it('should restore overflow on unmount while open', () => {
    const dialogRef = React.createRef<HTMLDivElement>();
    const anchorRef = React.createRef<HTMLInputElement>();

    const TestUnmount: React.FC = () => {
      useModalOverflowUnlock(true, anchorRef);
      return (
        <div ref={dialogRef} role="dialog" style={{ overflow: 'auto' }}>
          <input ref={anchorRef} aria-label="anchor" />
        </div>
      );
    };

    const { unmount } = render(<TestUnmount />);
    const dialog = dialogRef.current as HTMLDivElement;
    expect(dialog.style.overflow).toBe('visible');

    unmount();

    expect(dialog.style.overflow).toBe('auto');
    expect(dialog.getAttribute(MODAL_OVERFLOW_UNLOCK_COUNT_ATTR)).toBeNull();
  });

  it('should support renderHook with a stable anchor ref', () => {
    const anchorRef = React.createRef<HTMLInputElement>();

    render(
      <div role="dialog" style={{ overflow: 'scroll' }} data-testid="dialog">
        <input ref={anchorRef} aria-label="anchor" />
      </div>,
    );

    const { rerender } = renderHook(({ isOpen }) => useModalOverflowUnlock(isOpen, anchorRef), {
      initialProps: { isOpen: true },
    });

    const dialog = document.querySelector('[data-testid="dialog"]') as HTMLDivElement;
    expect(dialog.style.overflow).toBe('visible');

    act(() => {
      rerender({ isOpen: false });
    });

    expect(dialog.style.overflow).toBe('scroll');
  });

  it('should portal into document.body when anchor is outside a dialog', () => {
    const anchor = document.createElement('input');
    document.body.appendChild(anchor);
    try {
      expect(resolveSelectPopperAppendTo(anchor)).toBe(document.body);
    } finally {
      document.body.removeChild(anchor);
    }
  });

  it('should portal into the nearest dialog when anchor is inside one', () => {
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    const anchor = document.createElement('input');
    dialog.appendChild(anchor);
    document.body.appendChild(dialog);
    try {
      expect(resolveSelectPopperAppendTo(anchor)).toBe(dialog);
    } finally {
      document.body.removeChild(dialog);
    }
  });
});
