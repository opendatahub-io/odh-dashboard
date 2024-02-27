import React from 'react';
import { act } from '@testing-library/react';
import useDraggableTable from '~/utilities/useDraggableTable';
import { testHook } from '~/__tests__/unit/testUtils/hooks';

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useRef: jest.fn(() => ({
    current: null,
  })),
  useState: jest.fn((initialValue) => [initialValue, jest.fn()]),
}));

const setItemOrder = jest.fn();
const setDraggedItemId = jest.fn();
const setDraggingToItemIndex = jest.fn();

const itemOrder = ['item1', 'item2', 'item3'];

describe('initializeState', () => {
  it('should initialize state and return tableProps and rowProps with correct event handlers', () => {
    const renderResult = testHook(useDraggableTable)(itemOrder, setItemOrder);

    expect(renderResult).hookToStrictEqual({
      rowProps: {
        onDragEnd: expect.any(Function),
        onDragStart: expect.any(Function),
        onDrop: expect.any(Function),
      },
      tableProps: {
        className: undefined,
        tbodyProps: {
          onDragLeave: expect.any(Function),
          onDragOver: expect.any(Function),
          ref: { current: null },
        },
      },
    });
    expect(renderResult).hookToHaveUpdateCount(1);
  });
});
describe('dragStart', () => {
  it('should handle drag start behaviour correctly and setDraggedItemId accurately', () => {
    (React.useState as jest.Mock).mockImplementationOnce(() => ['', setDraggedItemId]);
    const renderResult = testHook(useDraggableTable)(itemOrder, setItemOrder);
    const { rowProps } = renderResult.result.current;
    const { onDragStart } = rowProps;

    const dragStartEvent = {
      dataTransfer: { effectAllowed: 'none', setData: jest.fn() },
      currentTarget: {
        id: 'item1',
        classList: { add: jest.fn() },
        setAttribute: jest.fn(),
      },
    } as unknown as React.DragEvent<HTMLTableRowElement>;

    expect(renderResult).hookToStrictEqual({
      rowProps: {
        onDragEnd: expect.any(Function),
        onDragStart: expect.any(Function),
        onDrop: expect.any(Function),
      },
      tableProps: {
        className: undefined,
        tbodyProps: {
          onDragLeave: expect.any(Function),
          onDragOver: expect.any(Function),
          ref: { current: null },
        },
      },
    });

    act(() => {
      onDragStart(dragStartEvent);
    });

    expect(renderResult).hookToHaveUpdateCount(1);
    expect(dragStartEvent.dataTransfer.effectAllowed).toBe('move');
    expect(dragStartEvent.dataTransfer.setData).toHaveBeenCalledWith('text/plain', 'item1');
    expect(dragStartEvent.currentTarget.classList.add).toHaveBeenCalledWith('pf-m-ghost-row');
    expect(dragStartEvent.currentTarget.setAttribute).toHaveBeenCalledWith('aria-pressed', 'true');
    expect(setDraggedItemId).toHaveBeenNthCalledWith(1, 'item1');
  });
});
describe('onDragEnd', () => {
  it('should handle drag end behaviour correctly', () => {
    const renderResult = testHook(useDraggableTable)(itemOrder, setItemOrder);
    const { rowProps } = renderResult.result.current;
    const { onDragEnd } = rowProps;

    expect(renderResult).hookToStrictEqual({
      rowProps: {
        onDragEnd: expect.any(Function),
        onDragStart: expect.any(Function),
        onDrop: expect.any(Function),
      },
      tableProps: {
        className: undefined,
        tbodyProps: {
          onDragLeave: expect.any(Function),
          onDragOver: expect.any(Function),
          ref: { current: null },
        },
      },
    });

    const dragEndEvent = {
      target: {
        id: 'item1',
        classList: { remove: jest.fn() },
        setAttribute: jest.fn(),
      },
    } as unknown as React.DragEvent<HTMLTableRowElement>;

    act(() => {
      onDragEnd(dragEndEvent);
    });
    expect(renderResult).hookToHaveUpdateCount(1);
    expect((dragEndEvent.target as HTMLTableRowElement).classList.remove).toHaveBeenCalled();
    expect((dragEndEvent.target as HTMLTableRowElement).setAttribute).toHaveBeenCalledWith(
      'aria-pressed',
      'false',
    );
  });
});
describe('onDrop', () => {
  const dropEvent = {
    preventDefault: jest.fn(),
    clientX: 45,
    clientY: 45,
    target: document.createElement('tr'),
  } as unknown as React.DragEvent<HTMLTableRowElement>;

  it('should hand drop behaviour correctly with valid event', () => {
    const tbodyElement = document.createElement('tbody');

    const refObj = { current: tbodyElement };
    const useRefSpy = jest.spyOn(React, 'useRef').mockReturnValue(refObj);
    const renderResult = testHook(useDraggableTable)(itemOrder, setItemOrder);

    const { rowProps } = renderResult.result.current;
    const { onDrop } = rowProps;

    expect(renderResult).hookToStrictEqual({
      rowProps: {
        onDragEnd: expect.any(Function),
        onDragStart: expect.any(Function),
        onDrop: expect.any(Function),
      },
      tableProps: {
        className: undefined,
        tbodyProps: {
          onDragLeave: expect.any(Function),
          onDragOver: expect.any(Function),
          ref: { current: tbodyElement },
        },
      },
    });

    jest.spyOn(refObj.current, 'getBoundingClientRect').mockImplementation(
      () =>
        ({
          x: 40,
          y: 40,
          width: 20,
          height: 20,
        } as DOMRect),
    );

    act(() => {
      onDrop(dropEvent);
    });

    expect(renderResult).hookToHaveUpdateCount(1);
    expect(setItemOrder).toHaveBeenCalledWith(itemOrder);

    useRefSpy.mockRestore();
  });
  it('should hand drop behaviour correctly with invalid event', () => {
    const refObj = { current: null };
    const useRefSpy = jest.spyOn(React, 'useRef').mockReturnValue(refObj);
    const renderResult = testHook(useDraggableTable)(itemOrder, setItemOrder);

    const { rowProps } = renderResult.result.current;
    const { onDrop } = rowProps;

    expect(renderResult).hookToStrictEqual({
      rowProps: {
        onDragEnd: expect.any(Function),
        onDragStart: expect.any(Function),
        onDrop: expect.any(Function),
      },
      tableProps: {
        className: undefined,
        tbodyProps: {
          onDragLeave: expect.any(Function),
          onDragOver: expect.any(Function),
          ref: { current: null },
        },
      },
    });

    act(() => {
      onDrop(dropEvent);
    });

    expect(renderResult).hookToHaveUpdateCount(1);

    useRefSpy.mockRestore();
  });
  it('should hand drop behaviour correctly with invalid event and incorrect tbody element', () => {
    const tbodyElement = document.createElement('tbody');
    const rowElement = document.createElement('tr');

    rowElement.id = 'item3';
    tbodyElement.appendChild(rowElement);
    document.body.appendChild(tbodyElement);

    const refObj = { current: tbodyElement };
    const useRefSpy = jest.spyOn(React, 'useRef').mockReturnValue(refObj);
    const renderResult = testHook(useDraggableTable)(itemOrder, setItemOrder);

    const { rowProps } = renderResult.result.current;
    const { onDrop } = rowProps;

    expect(renderResult).hookToStrictEqual({
      rowProps: {
        onDragEnd: expect.any(Function),
        onDragStart: expect.any(Function),
        onDrop: expect.any(Function),
      },
      tableProps: {
        className: undefined,
        tbodyProps: {
          onDragLeave: expect.any(Function),
          onDragOver: expect.any(Function),
          ref: { current: tbodyElement },
        },
      },
    });
    // Spy on classList.remove and setAttribute
    const classListRemoveSpy = jest.spyOn(rowElement.classList, 'remove');
    const setAttributeSpy = jest.spyOn(rowElement, 'setAttribute');

    act(() => {
      onDrop(dropEvent);
    });

    expect(renderResult).hookToHaveUpdateCount(1);
    expect(classListRemoveSpy).toHaveBeenCalledWith('pf-m-ghost-row');
    expect(setAttributeSpy).toHaveBeenCalledWith('aria-pressed', 'false');

    useRefSpy.mockRestore();
  });
});
describe('onDragLeave', () => {
  const dragLeaveEvent = {
    preventDefault: jest.fn(),
    clientX: 50,
    clientY: 50,
    target: document.createElement('tr'),
  } as unknown as React.DragEvent<HTMLTableSectionElement>;

  it('should handle drag leave behaviour correctly with invalid event', () => {
    const refObj = { current: null };
    const useRefSpy = jest.spyOn(React, 'useRef').mockReturnValue(refObj);

    const renderResult = testHook(useDraggableTable)(itemOrder, setItemOrder);

    const { tableProps } = renderResult.result.current;
    const { onDragLeave } = tableProps.tbodyProps;

    expect(renderResult).hookToStrictEqual({
      rowProps: {
        onDragEnd: expect.any(Function),
        onDragStart: expect.any(Function),
        onDrop: expect.any(Function),
      },
      tableProps: {
        className: undefined,
        tbodyProps: {
          onDragLeave: expect.any(Function),
          onDragOver: expect.any(Function),
          ref: { current: null },
        },
      },
    });
    expect(renderResult).hookToHaveUpdateCount(1);

    act(() => {
      onDragLeave(dragLeaveEvent);
    });

    useRefSpy.mockRestore();
  });

  it('should remove the last child if ulNode has children', () => {
    const tbodyElement = document.createElement('tbody');
    const row1 = document.createElement('tr');
    const row2 = document.createElement('tr');
    const row3 = document.createElement('tr');

    row1.id = 'item1';
    row2.id = 'item2';
    row3.id = 'item3';

    tbodyElement.appendChild(row1);
    tbodyElement.appendChild(row2);
    tbodyElement.appendChild(row3);

    const refObj = { current: tbodyElement };
    const useRefSpy = jest.spyOn(React, 'useRef').mockReturnValue(refObj);

    const renderResult = testHook(useDraggableTable)(['item4'], setItemOrder);

    const { tableProps } = renderResult.result.current;
    const { onDragLeave } = tableProps.tbodyProps;

    act(() => {
      onDragLeave(dragLeaveEvent);
    });

    useRefSpy.mockRestore();
  });

  it('should remove the last child if ulNode has children with same ID', () => {
    const tbodyElement = document.createElement('tbody');
    const row1 = document.createElement('tr');
    const row2 = document.createElement('tr');
    const row3 = document.createElement('tr');

    row1.id = 'item1';
    row2.id = 'item2';
    row3.id = 'item4';

    tbodyElement.appendChild(row1);
    tbodyElement.appendChild(row2);
    tbodyElement.appendChild(row3);

    const refObj = { current: tbodyElement };
    const useRefSpy = jest.spyOn(React, 'useRef').mockReturnValue(refObj);
    const renderResult = testHook(useDraggableTable)(itemOrder, setItemOrder);
    const { tableProps } = renderResult.result.current;
    const { onDragLeave } = tableProps.tbodyProps;

    act(() => {
      onDragLeave(dragLeaveEvent);
    });

    useRefSpy.mockRestore();
  });

  it('should remove the last child if ulNode has children with same ID', () => {
    const tbodyElement = document.createElement('tbody');
    const row1 = document.createElement('tr');
    const row2 = document.createElement('tr');
    const row3 = document.createElement('tr');

    row1.id = 'item1';
    row2.id = 'item2';
    row3.id = 'item3';

    tbodyElement.appendChild(row1);
    tbodyElement.appendChild(row2);
    tbodyElement.appendChild(row3);

    const refObj = { current: tbodyElement };
    const useRefSpy = jest.spyOn(React, 'useRef').mockReturnValue(refObj);

    const renderResult = testHook(useDraggableTable)(itemOrder, setItemOrder);

    const { tableProps } = renderResult.result.current;
    const { onDragLeave } = tableProps.tbodyProps;

    act(() => {
      onDragLeave(dragLeaveEvent);
    });

    useRefSpy.mockRestore();
  });
});
describe('onDragOver', () => {
  it('should handle dragover behaviour correctly with different item id', () => {
    const tbodyElement = document.createElement('tbody');
    const rowElement = document.createElement('tr');

    rowElement.id = 'item1';
    tbodyElement.appendChild(rowElement);
    document.body.appendChild(tbodyElement);

    const refObj = { current: tbodyElement };
    const useRefSpy = jest.spyOn(React, 'useRef').mockReturnValue(refObj);

    (React.useState as jest.Mock).mockImplementationOnce(() => ['item2', setDraggedItemId]);
    (React.useState as jest.Mock).mockImplementationOnce(() => [1, setDraggingToItemIndex]);

    const renderResult = testHook(useDraggableTable)(itemOrder, setItemOrder);

    const { tableProps } = renderResult.result.current;
    const { onDragOver } = tableProps.tbodyProps;

    act(() => {
      onDragOver({
        preventDefault: jest.fn(),
        clientX: 50,
        clientY: 50,
        target: rowElement,
      } as unknown as React.DragEvent<HTMLTableSectionElement>);
    });

    expect(useRefSpy).toHaveBeenCalled();
    expect(tableProps.tbodyProps.ref).toBe(refObj);

    useRefSpy.mockRestore();
  });
  it('should handle dragover behaviour correctly with same item id', () => {
    const tbodyElement = document.createElement('tbody');
    const rowElement = document.createElement('tr');

    rowElement.id = 'item3';
    tbodyElement.appendChild(rowElement);
    document.body.appendChild(tbodyElement);

    const refObj = { current: tbodyElement };
    const useRefSpy = jest.spyOn(React, 'useRef').mockReturnValue(refObj);

    (React.useState as jest.Mock).mockImplementationOnce(() => ['item1', setDraggedItemId]);
    (React.useState as jest.Mock).mockImplementationOnce(() => [1, setDraggingToItemIndex]);

    const renderResult = testHook(useDraggableTable)(itemOrder, setItemOrder);

    const { tableProps } = renderResult.result.current;
    const { onDragOver } = tableProps.tbodyProps;

    act(() => {
      onDragOver({
        preventDefault: jest.fn(),
        clientX: 50,
        clientY: 50,
        target: rowElement,
      } as unknown as React.DragEvent<HTMLTableSectionElement>);
    });

    expect(useRefSpy).toHaveBeenCalled();
    expect(tableProps.tbodyProps.ref).toBe(refObj);

    useRefSpy.mockRestore();
  });
  it('should handle dragover behaviour correctly when bodyRef is null', async () => {
    const refObj = { current: null };
    const useRefSpy = jest.spyOn(React, 'useRef').mockReturnValue(refObj);

    const hookResult = testHook(useDraggableTable)(itemOrder, setItemOrder).result.current;

    const { tableProps } = hookResult;
    const { onDragOver } = tableProps.tbodyProps;

    const rowElement = document.createElement('tr');
    rowElement.id = 'item1';

    act(() => {
      onDragOver({
        preventDefault: jest.fn(),
        clientX: 50,
        clientY: 50,
        target: rowElement,
      } as unknown as React.DragEvent<HTMLTableSectionElement>);
    });
    useRefSpy.mockRestore();
  });
  it('should handle drag and drop behavior correctly with invalid element', async () => {
    const refObj = { current: document.createElement('tbody') };
    const useRefSpy = jest.spyOn(React, 'useRef').mockReturnValue(refObj);

    const hookResult = testHook(useDraggableTable)(itemOrder, setItemOrder).result.current;

    const { tableProps } = hookResult;
    const { onDragOver } = tableProps.tbodyProps;

    const inValidElement = document.createElement('td');
    inValidElement.id = 'item1';
    refObj.current.appendChild(inValidElement);

    act(() => {
      onDragOver({
        preventDefault: jest.fn(),
        clientX: 50,
        clientY: 50,
        target: inValidElement,
      } as unknown as React.DragEvent<HTMLTableSectionElement>);
    });

    expect(useRefSpy).toHaveBeenCalled();
    expect(tableProps.tbodyProps.ref).toBe(refObj);

    useRefSpy.mockRestore();
  });
});
