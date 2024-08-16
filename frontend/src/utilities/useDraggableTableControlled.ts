import React from 'react';
import styles from '@patternfly/react-styles/css/components/Table/table';

export type Row<T> = {
  data: T;
  id: string;
};

export type RowProps = {
  onDragStart: React.DragEventHandler<HTMLTableRowElement>;
  onDragEnd: React.DragEventHandler<HTMLTableRowElement>;
  onDrop: React.DragEventHandler<HTMLTableRowElement>;
  id: string;
};

type DraggableTableControlled<T> = {
  tableProps: {
    className: string | undefined;
    tbodyProps: {
      onDragOver: React.DragEventHandler<HTMLTableSectionElement>;
      onDragLeave: React.DragEventHandler<HTMLTableSectionElement>;
      ref: React.MutableRefObject<HTMLTableSectionElement | null>;
    };
  };
  rowsToRender: {
    data: T;
    rowProps: RowProps;
  }[];
};

const useDraggableTableControlled = <T>(
  savedItemOrder: T[],
  setSavedItemOrder: (itemOrder: T[]) => void,
): DraggableTableControlled<T> => {
  const [draggedItemId, setDraggedItemId] = React.useState('');
  const [draggingToItemIndex, setDraggingToItemIndex] = React.useState(-1);
  const [isDragging, setIsDragging] = React.useState(false);
  const bodyRef = React.useRef<HTMLTableSectionElement | null>(null);

  const [tempItemOrder, setTempItemOrder] = React.useState<Row<T>[]>([]);

  React.useEffect(() => {
    setTempItemOrder(savedItemOrder.map((r, i) => ({ data: r, id: String(i) })));
  }, [savedItemOrder]);

  const onDragStart = React.useCallback<React.DragEventHandler<HTMLTableRowElement>>(
    (assignableEvent) => {
      assignableEvent.dataTransfer.effectAllowed = 'move';
      assignableEvent.dataTransfer.setData('text/plain', assignableEvent.currentTarget.id);
      const currentDraggedItemId = assignableEvent.currentTarget.id;

      assignableEvent.currentTarget.classList.add(styles.modifiers.ghostRow);
      assignableEvent.currentTarget.setAttribute('aria-pressed', 'true');

      setDraggedItemId(currentDraggedItemId);
      setIsDragging(true);
    },
    [],
  );

  const moveItem = React.useCallback((arr: Row<T>[], id: string, toIndex: number) => {
    const fromIndex = arr.findIndex((row) => row.id === id);
    if (fromIndex === toIndex) {
      return arr;
    }
    const temp = arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, temp[0]);

    return arr;
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
    DraggableTableControlled<T>['tableProps']['tbodyProps']['onDragLeave']
  >(
    (evt) => {
      if (!isValidDrop(evt)) {
        // move(itemOrder);
        setDraggingToItemIndex(-1);
      }
    },
    [isValidDrop],
  );

  const onDragOver = React.useCallback<
    DraggableTableControlled<T>['tableProps']['tbodyProps']['onDragOver']
  >(
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
        const newItemOrder = moveItem([...tempItemOrder], draggedItemId, newDraggingToItemIndex);
        setDraggingToItemIndex(newDraggingToItemIndex);
        setTempItemOrder(newItemOrder);
      }
    },
    [draggedItemId, draggingToItemIndex, tempItemOrder, moveItem],
  );

  const onDrop = React.useCallback<React.DragEventHandler<HTMLTableRowElement>>(
    (evt) => {
      if (isValidDrop(evt)) {
        setSavedItemOrder(tempItemOrder.map((i) => i.data));
      } else {
        onDragCancel();
      }
    },
    [isValidDrop, onDragCancel, setSavedItemOrder, tempItemOrder],
  );

  const onDragEnd = React.useCallback<React.DragEventHandler<HTMLTableRowElement>>((evt) => {
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
    rowsToRender: tempItemOrder.map((i) => ({
      data: i.data,
      rowProps: { id: i.id, onDragStart, onDragEnd, onDrop },
    })),
  };
};

export default useDraggableTableControlled;
