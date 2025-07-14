import * as React from 'react';
import { act } from 'react';
import useDraggableTable from '#~/utilities/useDraggableTable';
import { testHook } from '#~/__tests__/unit/testUtils/hooks';

const setItemOrder = jest.fn();

const generateRowsWithItems = (itemOrder: string[]) => {
  const tbody = document.createElement('tbody');
  itemOrder.forEach((itemId) => {
    const row = document.createElement('tr');
    row.id = itemId;
    tbody.appendChild(row);
  });
  document.body.appendChild(tbody);
  return tbody;
};

describe('useDraggableTable', () => {
  it('should update state and classes on drag actions', () => {
    const itemOrder = ['item1', 'item2', 'item3'];
    const renderResult = testHook(useDraggableTable)(itemOrder, setItemOrder);

    // Initial state assertions
    expect(renderResult).hookToHaveUpdateCount(1);
    expect(renderResult.result.current.tableProps.tbodyProps.ref.current).toBe(null);
    expect(renderResult.result.current.tableProps.className).toBe(undefined);

    // Simulate drag start event
    const bodyRef = generateRowsWithItems(itemOrder);
    renderResult.result.current.tableProps.tbodyProps.ref.current = bodyRef;

    const { onDragStart } = renderResult.result.current.rowProps;
    const dragStartEvent = {
      dataTransfer: { effectAllowed: 'none', setData: jest.fn() },
      currentTarget: {
        id: 'item3',
        classList: { add: jest.fn() },
        setAttribute: jest.fn(),
      },
    } as unknown as React.DragEvent<HTMLTableRowElement>;

    act(() => {
      onDragStart(dragStartEvent);
    });

    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult.result.current.tableProps.className).toBe('pf-m-drag-over');
    expect(dragStartEvent.dataTransfer.setData).toHaveBeenCalledWith('text/plain', 'item3');
    expect(dragStartEvent.currentTarget.classList.add).toHaveBeenCalledWith('pf-m-ghost-row');
    expect(dragStartEvent.currentTarget.setAttribute).toHaveBeenCalledWith('aria-pressed', 'true');

    // Simulate drag over
    let { onDragOver } = renderResult.result.current.tableProps.tbodyProps;
    const dragOverEvent = {
      preventDefault: jest.fn(),
      target: bodyRef.children[1],
    } as unknown as React.DragEvent<HTMLTableSectionElement>;

    act(() => {
      onDragOver(dragOverEvent);
    });

    expect(renderResult).hookToHaveUpdateCount(3);
    expect(renderResult.result.current.tableProps.className).toBe('pf-m-drag-over');
    expect(renderResult.result.current.tableProps.tbodyProps.ref.current).toStrictEqual(
      generateRowsWithItems(['item1', 'item3', 'item2']),
    );

    // Simulate drag leaving drop zone
    const { onDragLeave } = renderResult.result.current.tableProps.tbodyProps;
    act(() => {
      onDragLeave({} as unknown as React.DragEvent<HTMLTableSectionElement>);
    });

    expect(renderResult).hookToHaveUpdateCount(4);
    expect(renderResult.result.current.tableProps.tbodyProps.ref.current).toStrictEqual(
      generateRowsWithItems(['item1', 'item2', 'item3']),
    );
    expect(renderResult.result.current.tableProps.className).toBe('pf-m-drag-over');

    // Simulate drag over
    onDragOver = renderResult.result.current.tableProps.tbodyProps.onDragOver;
    const dragOverEvent2 = {
      preventDefault: jest.fn(),
      target: bodyRef.children[0],
    } as unknown as React.DragEvent<HTMLTableSectionElement>;

    act(() => {
      onDragOver(dragOverEvent2);
    });

    expect(renderResult).hookToHaveUpdateCount(5);
    expect(renderResult.result.current.tableProps.className).toBe('pf-m-drag-over');
    expect(renderResult.result.current.tableProps.tbodyProps.ref.current).toStrictEqual(
      generateRowsWithItems(['item3', 'item1', 'item2']),
    );

    // Simulate drop event
    const { onDrop } = renderResult.result.current.rowProps;
    bodyRef.getBoundingClientRect = jest.fn().mockReturnValue({
      x: 40,
      y: 40,
      width: 20,
      height: 20,
    } as DOMRect);

    act(() => {
      onDrop({
        clientX: 45,
        clientY: 45,
      } as unknown as React.DragEvent<HTMLTableRowElement>);
    });
    expect(renderResult).hookToHaveUpdateCount(5);
    expect(setItemOrder).toHaveBeenCalledWith(['item3', 'item1', 'item2']);

    // Simulate drag end
    const { onDragEnd } = renderResult.result.current.rowProps;
    const dragEndEvent = {
      currentTarget: {
        id: 'item3',
        classList: { remove: jest.fn() },
        setAttribute: jest.fn(),
      },
    } as unknown as React.DragEvent<HTMLTableRowElement>;

    act(() => {
      onDragEnd(dragEndEvent);
    });

    expect(renderResult).hookToHaveUpdateCount(6);
    expect(renderResult.result.current.tableProps.className).toBe(undefined);
    expect(dragEndEvent.currentTarget.classList.remove).toHaveBeenCalledWith('pf-m-ghost-row');
    expect(dragEndEvent.currentTarget.setAttribute).toHaveBeenCalledWith('aria-pressed', 'false');
    expect(renderResult.result.current.tableProps.tbodyProps.ref.current).toStrictEqual(
      generateRowsWithItems(['item3', 'item1', 'item2']),
    );
  });
});
