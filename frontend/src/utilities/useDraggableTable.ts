import * as React from 'react';
import { TbodyProps, TrProps } from '@patternfly/react-table';
import styles from '@patternfly/react-styles/css/components/Table/table';
import useDebounce from '~/utilities/useDebounce';

export type TrDragFunctionsType = {
  onDragStart: React.DragEventHandler<HTMLTableRowElement>;
  onDragEnd: React.DragEventHandler<HTMLTableRowElement>;
  onDrop: React.DragEventHandler<HTMLTableRowElement>;
};

const useDraggableTable = (
  bodyRef: React.RefObject<HTMLTableSectionElement>,
  initialItemOrder: string[],
) => {
  const [draggedItemId, setDraggedItemId] = React.useState('');
  const [draggingToItemIndex, setDraggingToItemIndex] = React.useState(-1);
  const [isDragging, setIsDragging] = React.useState(false);
  const [itemOrder, setItemOrder] = React.useState(initialItemOrder);
  const [tempItemOrder, setTempItemOrder] = React.useState<string[]>([]);

  React.useEffect(() => {
    setItemOrder(initialItemOrder);
  }, [initialItemOrder]);

  const debouncedItemOrder = useDebounce(itemOrder, 5000);

  const onDragStart: TrProps['onDragStart'] = (evt) => {
    evt.dataTransfer.effectAllowed = 'move';
    evt.dataTransfer.setData('text/plain', evt.currentTarget.id);
    const draggedItemId = evt.currentTarget.id;

    evt.currentTarget.classList.add(styles.modifiers.ghostRow);
    evt.currentTarget.setAttribute('aria-pressed', 'true');

    setDraggedItemId(draggedItemId);
    setIsDragging(true);
  };

  const moveItem = (arr: string[], i1: string, toIndex: number) => {
    const fromIndex = arr.indexOf(i1);
    if (fromIndex === toIndex) {
      return arr;
    }
    const temp = arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, temp[0]);

    return arr;
  };

  const move = (itemOrder: string[]) => {
    if (!bodyRef.current) {
      return;
    }
    const ulNode = bodyRef.current;
    const nodes = Array.from(ulNode.children);
    if (nodes.map((node) => node.id).every((id, i) => id === itemOrder[i])) {
      return;
    }
    while (ulNode.firstChild) {
      if (ulNode.lastChild) {
        ulNode.removeChild(ulNode.lastChild);
      }
    }

    itemOrder.forEach((id) => {
      const node = nodes.find((n) => n.id === id);
      if (node) {
        ulNode.appendChild(node);
      }
    });
  };

  const onDragCancel = () => {
    if (!bodyRef.current) {
      return;
    }
    Array.from(bodyRef.current.children).forEach((el) => {
      el.classList.remove(styles.modifiers.ghostRow);
      el.setAttribute('aria-pressed', 'false');
    });
    setDraggedItemId('');
    setDraggingToItemIndex(-1);
    setIsDragging(false);
  };

  const onDragLeave: TbodyProps['onDragLeave'] = (evt) => {
    if (!isValidDrop(evt)) {
      move(itemOrder);
      setDraggingToItemIndex(-1);
    }
  };

  const isValidDrop = (evt: React.DragEvent<HTMLTableSectionElement | HTMLTableRowElement>) => {
    if (!bodyRef.current) {
      return;
    }
    const ulRect = bodyRef.current.getBoundingClientRect();
    return (
      evt.clientX > ulRect.x &&
      evt.clientX < ulRect.x + ulRect.width &&
      evt.clientY > ulRect.y &&
      evt.clientY < ulRect.y + ulRect.height
    );
  };

  const onDrop: TrProps['onDrop'] = (evt) => {
    if (isValidDrop(evt)) {
      setItemOrder(tempItemOrder);
    } else {
      onDragCancel();
    }
  };

  const onDragOver: TbodyProps['onDragOver'] = (evt) => {
    evt.preventDefault();

    if (!bodyRef.current) {
      return;
    }

    const curListItem = (evt.target as HTMLTableSectionElement).closest('tr');
    if (
      !curListItem ||
      !bodyRef.current.contains(curListItem) ||
      curListItem.id === draggedItemId
    ) {
      return;
    }
    const dragId = curListItem.id;
    const newDraggingToItemIndex = Array.from(bodyRef.current.children).findIndex(
      (item) => item.id === dragId,
    );
    if (newDraggingToItemIndex !== draggingToItemIndex) {
      const tempItemOrder = moveItem([...itemOrder], draggedItemId, newDraggingToItemIndex);
      move(tempItemOrder);
      setDraggingToItemIndex(newDraggingToItemIndex);
      setTempItemOrder(tempItemOrder);
    }
  };

  const onDragEnd: TrProps['onDragEnd'] = (evt) => {
    const target = evt.target as HTMLTableRowElement;
    target.classList.remove(styles.modifiers.ghostRow);
    target.setAttribute('aria-pressed', 'false');
    setDraggedItemId('');
    setDraggingToItemIndex(-1);
    setIsDragging(false);
  };

  return {
    isDragging,
    tbodyDragFunctions: {
      onDragOver,
      onDragLeave,
    },
    trDragFunctions: {
      onDragStart,
      onDragEnd,
      onDrop,
    },
    itemOrder: debouncedItemOrder,
  };
};

export default useDraggableTable;
