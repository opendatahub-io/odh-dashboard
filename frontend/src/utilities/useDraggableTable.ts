import React from 'react';
import styles from '@patternfly/react-styles/css/components/Table/table';

type UseDraggableTable = {
  tableProps: {
    className: string | undefined;
    tbodyProps: {
      onDragOver: React.DragEventHandler<HTMLTableSectionElement>;
      onDragLeave: React.DragEventHandler<HTMLTableSectionElement>;
      ref: React.MutableRefObject<HTMLTableSectionElement | null>;
    };
  };
  rowProps: {
    onDragStart: React.DragEventHandler<HTMLTableRowElement>;
    onDragEnd: React.DragEventHandler<HTMLTableRowElement>;
    onDrop: React.DragEventHandler<HTMLTableRowElement>;
  };
};

const useDraggableTable = (
  itemOrder: string[],
  setItemOrder: (itemOrder: string[]) => void,
  callbacks?: { onDragStart?: () => void },
): UseDraggableTable => {
  const [draggedItemId, setDraggedItemId] = React.useState('');
  const [draggingToItemIndex, setDraggingToItemIndex] = React.useState(-1);
  const [isDragging, setIsDragging] = React.useState(false);
  const [tempItemOrder, setTempItemOrder] = React.useState<string[]>(itemOrder);
  const bodyRef = React.useRef<HTMLTableSectionElement | null>(null);

  const onDragStart = React.useCallback<UseDraggableTable['rowProps']['onDragStart']>(
    (assignableEvent) => {
      assignableEvent.dataTransfer.effectAllowed = 'move';
      assignableEvent.dataTransfer.setData('text/plain', assignableEvent.currentTarget.id);
      const currentDraggedItemId = assignableEvent.currentTarget.id;

      assignableEvent.currentTarget.classList.add(styles.modifiers.ghostRow);
      assignableEvent.currentTarget.setAttribute('aria-pressed', 'true');

      setDraggedItemId(currentDraggedItemId);
      setIsDragging(true);
      callbacks?.onDragStart?.();
    },
    [callbacks],
  );

  const moveItem = React.useCallback((arr: string[], i1: string, toIndex: number) => {
    const fromIndex = arr.indexOf(i1);
    if (fromIndex === toIndex) {
      return arr;
    }
    const temp = arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, temp[0]);

    return arr;
  }, []);

  const move = React.useCallback((currentItemOrder: string[]) => {
    if (!bodyRef.current) {
      return;
    }
    const ulNode = bodyRef.current;
    const nodes = Array.from(ulNode.children);
    if (nodes.map((node) => node.id).every((id, i) => id === currentItemOrder[i])) {
      return;
    }
    while (ulNode.firstChild) {
      if (ulNode.lastChild) {
        ulNode.removeChild(ulNode.lastChild);
      }
    }

    currentItemOrder.forEach((id) => {
      const node = nodes.find((n) => n.id === id);
      if (node) {
        ulNode.appendChild(node);
      }
    });
  }, []);

  const onDragCancel = React.useCallback(() => {
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
  }, []);

  const isValidDrop = React.useCallback(
    (evt: React.DragEvent<HTMLTableSectionElement | HTMLTableRowElement>) => {
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
    },
    [],
  );

  const onDragLeave = React.useCallback<
    UseDraggableTable['tableProps']['tbodyProps']['onDragLeave']
  >(
    (evt) => {
      if (!isValidDrop(evt)) {
        move(itemOrder);
        setDraggingToItemIndex(-1);
      }
    },
    [isValidDrop, move, itemOrder],
  );

  const onDragOver = React.useCallback<UseDraggableTable['tableProps']['tbodyProps']['onDragOver']>(
    (evt) => {
      evt.preventDefault();
      if (!bodyRef.current) {
        return;
      }

      const curListItem = evt.target instanceof HTMLElement ? evt.target.closest('tr') : null;
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
        const newItemOrder = moveItem([...itemOrder], draggedItemId, newDraggingToItemIndex);
        move(newItemOrder);
        setDraggingToItemIndex(newDraggingToItemIndex);
        setTempItemOrder(newItemOrder);
      }
    },
    [draggedItemId, draggingToItemIndex, itemOrder, move, moveItem],
  );

  const onDrop = React.useCallback<UseDraggableTable['rowProps']['onDrop']>(
    (evt) => {
      if (isValidDrop(evt)) {
        setItemOrder(tempItemOrder);
      } else {
        onDragCancel();
      }
    },
    [isValidDrop, onDragCancel, setItemOrder, tempItemOrder],
  );

  const onDragEnd = React.useCallback<UseDraggableTable['rowProps']['onDrop']>((evt) => {
    const target = evt.currentTarget;
    target.classList.remove(styles.modifiers.ghostRow);
    target.setAttribute('aria-pressed', 'false');
    setDraggedItemId('');
    setDraggingToItemIndex(-1);
    setIsDragging(false);
  }, []);

  return {
    tableProps: {
      className: isDragging ? styles.modifiers.dragOver : undefined,
      tbodyProps: { onDragOver, onDragLeave, ref: bodyRef },
    },
    rowProps: {
      onDragStart,
      onDragEnd,
      onDrop,
    },
  };
};

export default useDraggableTable;
