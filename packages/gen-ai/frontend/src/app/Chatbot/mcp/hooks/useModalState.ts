import * as React from 'react';

export interface UseModalStateReturn<T> {
  isOpen: boolean;
  selectedItem: T | null;
  openModal: (item: T) => void;
  closeModal: () => void;
}

/**
 * Generic hook for managing modal state with a selected item.
 * Useful for modals that need to display information about a specific item.
 *
 * @template T - The type of item that can be selected for the modal
 * @returns Object containing modal state and control functions
 */
const useModalState = <T>(): UseModalStateReturn<T> => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<T | null>(null);

  const openModal = React.useCallback((item: T) => {
    setSelectedItem(item);
    setIsOpen(true);
  }, []);

  const closeModal = React.useCallback(() => {
    setIsOpen(false);
    setSelectedItem(null);
  }, []);

  return {
    isOpen,
    selectedItem,
    openModal,
    closeModal,
  };
};

export default useModalState;
