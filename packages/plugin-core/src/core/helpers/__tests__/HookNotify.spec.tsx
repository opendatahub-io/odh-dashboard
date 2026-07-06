import React from 'react';
import { render } from '@testing-library/react';
import { HookNotify } from '../HookNotify';

describe('HookNotify', () => {
  it('should call onNotify with the initial hook value', () => {
    const mockOnNotify = jest.fn();
    const mockUseHook = jest.fn(() => 'initialValue');

    render(<HookNotify useHook={mockUseHook} onNotify={mockOnNotify} />);

    expect(mockUseHook).toHaveBeenCalledTimes(1);
    expect(mockOnNotify).toHaveBeenCalledTimes(1);
    expect(mockOnNotify).toHaveBeenCalledWith('initialValue');
  });

  it('should call onUnmount when the component unmounts', () => {
    const mockOnNotify = jest.fn();
    const mockOnUnmount = jest.fn();
    const mockUseHook = jest.fn(() => 'initialValue');

    const { unmount } = render(
      <HookNotify useHook={mockUseHook} onNotify={mockOnNotify} onUnmount={mockOnUnmount} />,
    );

    unmount();

    expect(mockOnUnmount).toHaveBeenCalledTimes(1);
  });

  it('should call onNotify when the hook value changes', () => {
    const mockOnNotify = jest.fn();
    let hookValue = 'firstValue';
    const mockUseHook = jest.fn(() => hookValue);

    const { rerender } = render(<HookNotify useHook={mockUseHook} onNotify={mockOnNotify} />);

    expect(mockOnNotify).toHaveBeenCalledTimes(1);
    expect(mockOnNotify).toHaveBeenCalledWith('firstValue');

    // Change the hook value and rerender
    hookValue = 'secondValue';
    rerender(<HookNotify useHook={mockUseHook} onNotify={mockOnNotify} />);

    expect(mockUseHook).toHaveBeenCalledTimes(2);
    expect(mockOnNotify).toHaveBeenCalledTimes(2);
    expect(mockOnNotify).toHaveBeenLastCalledWith('secondValue');
  });
});
