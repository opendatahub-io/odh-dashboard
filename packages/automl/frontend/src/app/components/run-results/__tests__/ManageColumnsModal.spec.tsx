import '@testing-library/jest-dom';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import type { ColumnManagementModalColumn } from '@patternfly/react-component-groups';
import ManageColumnsModal from '~/app/components/run-results/ManageColumnsModal';

let capturedOnDrop: ((event: unknown, newItems: { id: string }[]) => void) | undefined;

jest.mock('@patternfly/react-drag-drop', () => ({
  DragDropSort: ({
    items,
    onDrop,
  }: {
    items: { id: string; content: React.ReactNode }[];
    onDrop: (event: unknown, newItems: { id: string }[]) => void;
  }) => {
    capturedOnDrop = onDrop;
    return (
      <>
        {items.map((item) => (
          <div key={item.id}>{item.content}</div>
        ))}
      </>
    );
  },
  Droppable: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DraggableObject: {},
}));

const columns: ColumnManagementModalColumn[] = [
  { key: 'col-a', title: 'Column A', isShownByDefault: true, isShown: true },
  { key: 'col-b', title: 'Column B', isShownByDefault: true, isShown: true },
  { key: 'col-c', title: 'Column C', isShownByDefault: true, isShown: true },
];

describe('ManageColumnsModal', () => {
  beforeEach(() => {
    capturedOnDrop = undefined;
    jest.clearAllMocks();
  });

  it('should detect reorder-only changes and enable the Save button', () => {
    const applyColumns = jest.fn();

    render(
      <ManageColumnsModal
        isOpen
        onClose={jest.fn()}
        appliedColumns={columns}
        defaultColumns={columns}
        applyColumns={applyColumns}
      />,
    );

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    // Simulate a drag-drop reorder: swap col-a and col-c
    expect(capturedOnDrop).toBeDefined();
    act(() => {
      capturedOnDrop!(null, [{ id: 'col-c' }, { id: 'col-b' }, { id: 'col-a' }]);
    });

    expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(applyColumns).toHaveBeenCalledTimes(1);
    const savedColumns = applyColumns.mock.calls[0][0];
    expect(savedColumns.map((c: ColumnManagementModalColumn) => c.key)).toEqual([
      'col-c',
      'col-b',
      'col-a',
    ]);
  });

  it('should not detect changes when order is unchanged', () => {
    render(
      <ManageColumnsModal
        isOpen
        onClose={jest.fn()}
        appliedColumns={columns}
        defaultColumns={columns}
        applyColumns={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    // "Drop" in the same order
    act(() => {
      capturedOnDrop!(null, [{ id: 'col-a' }, { id: 'col-b' }, { id: 'col-c' }]);
    });

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });
});
