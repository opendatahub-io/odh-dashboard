import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import TreeNode from '~/app/topology/tree-view/TreeNode';
import type { TreeNodeData } from '~/app/topology/tree-view/TreeNode';

jest.mock('@patternfly/react-tokens', () => {
  const tokenStub = { var: 'var(--stub)' };
  return {
    // eslint-disable-next-line camelcase
    t_global_icon_color_status_success_default: tokenStub,
    // eslint-disable-next-line camelcase
    t_global_icon_color_status_danger_default: tokenStub,
    // eslint-disable-next-line camelcase
    t_global_icon_color_brand_default: tokenStub,
    // eslint-disable-next-line camelcase
    t_global_icon_color_subtle: tokenStub,
  };
});

jest.mock('@patternfly/react-topology', () => ({
  observer: (component: React.FC) => component,
  isNode: () => true,
}));

const createMockNode = (
  id: string,
  data: TreeNodeData,
): { getId: () => string; getData: () => TreeNodeData } => ({
  getId: () => id,
  getData: () => data,
});

describe('TreeNode', () => {
  it('should render with role="button" and tabIndex for keyboard access', () => {
    const node = createMockNode('step-1', { label: 'Step 1', stepState: 'completed' });
    render(
      <svg>
        <TreeNode element={node as never} />
      </svg>,
    );

    const treeNode = screen.getByTestId('tree-node-step-1');
    expect(treeNode).toHaveAttribute('role', 'button');
    expect(treeNode).toHaveAttribute('tabindex', '0');
  });

  it('should set aria-label with label and step state', () => {
    const node = createMockNode('step-1', { label: 'Preprocessing', stepState: 'active' });
    render(
      <svg>
        <TreeNode element={node as never} />
      </svg>,
    );

    expect(screen.getByTestId('tree-node-step-1')).toHaveAttribute(
      'aria-label',
      'Preprocessing, active',
    );
  });

  it('should not set aria-label when label is empty', () => {
    const node = createMockNode('step-1', { stepState: 'pending' });
    render(
      <svg>
        <TreeNode element={node as never} />
      </svg>,
    );

    expect(screen.getByTestId('tree-node-step-1')).not.toHaveAttribute('aria-label');
  });

  it('should call onSelect when Enter key is pressed', () => {
    const onSelect = jest.fn();
    const node = createMockNode('step-1', { label: 'Step 1', stepState: 'completed' });
    render(
      <svg>
        <TreeNode element={node as never} onSelect={onSelect} />
      </svg>,
    );

    fireEvent.keyDown(screen.getByTestId('tree-node-step-1'), { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('should call onSelect when Space key is pressed', () => {
    const onSelect = jest.fn();
    const node = createMockNode('step-1', { label: 'Step 1', stepState: 'completed' });
    render(
      <svg>
        <TreeNode element={node as never} onSelect={onSelect} />
      </svg>,
    );

    fireEvent.keyDown(screen.getByTestId('tree-node-step-1'), { key: ' ' });
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('should not call onSelect for other keys', () => {
    const onSelect = jest.fn();
    const node = createMockNode('step-1', { label: 'Step 1', stepState: 'completed' });
    render(
      <svg>
        <TreeNode element={node as never} onSelect={onSelect} />
      </svg>,
    );

    fireEvent.keyDown(screen.getByTestId('tree-node-step-1'), { key: 'Tab' });
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('should call onSelect when clicked', () => {
    const onSelect = jest.fn();
    const node = createMockNode('step-1', { label: 'Step 1', stepState: 'completed' });
    render(
      <svg>
        <TreeNode element={node as never} onSelect={onSelect} />
      </svg>,
    );

    fireEvent.click(screen.getByTestId('tree-node-step-1'));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('should render without errors when onSelect is not provided', () => {
    const node = createMockNode('step-1', { label: 'Step 1', stepState: 'completed' });
    render(
      <svg>
        <TreeNode element={node as never} />
      </svg>,
    );

    expect(() => {
      fireEvent.keyDown(screen.getByTestId('tree-node-step-1'), { key: 'Enter' });
      fireEvent.click(screen.getByTestId('tree-node-step-1'));
    }).not.toThrow();
  });
});
