import { renderHook, act } from '@testing-library/react';
import useModalState from '~/app/Chatbot/mcp/hooks/useModalState';

interface TestItem {
  id: string;
  name: string;
}

describe('useModalState', () => {
  it('should initialize with closed state and no selected item', () => {
    const { result } = renderHook(() => useModalState<TestItem>());

    expect(result.current.isOpen).toBe(false);
    expect(result.current.selectedItem).toBeNull();
  });

  it('should open modal with selected item', () => {
    const { result } = renderHook(() => useModalState<TestItem>());
    const testItem: TestItem = { id: '1', name: 'Test Server' };

    act(() => {
      result.current.openModal(testItem);
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.selectedItem).toEqual(testItem);
  });

  it('should close modal and clear selected item', () => {
    const { result } = renderHook(() => useModalState<TestItem>());
    const testItem: TestItem = { id: '1', name: 'Test Server' };

    act(() => {
      result.current.openModal(testItem);
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.selectedItem).toEqual(testItem);

    act(() => {
      result.current.closeModal();
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.selectedItem).toBeNull();
  });

  it('should replace selected item when opening with new item', () => {
    const { result } = renderHook(() => useModalState<TestItem>());
    const firstItem: TestItem = { id: '1', name: 'First Server' };
    const secondItem: TestItem = { id: '2', name: 'Second Server' };

    act(() => {
      result.current.openModal(firstItem);
    });

    expect(result.current.selectedItem).toEqual(firstItem);

    act(() => {
      result.current.openModal(secondItem);
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.selectedItem).toEqual(secondItem);
  });

  it('should maintain referential stability of functions', () => {
    const { result, rerender } = renderHook(() => useModalState<TestItem>());

    const initialOpenModal = result.current.openModal;
    const initialCloseModal = result.current.closeModal;

    rerender();

    expect(result.current.openModal).toBe(initialOpenModal);
    expect(result.current.closeModal).toBe(initialCloseModal);
  });
});
