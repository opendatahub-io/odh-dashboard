import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { Extension, LoadedExtension } from '@openshift/dynamic-plugin-sdk';
import type { ActionProperties } from '../../../extension-points/actions';
import { ExtensibleActions } from '../ExtensibleActions';

type TestActionExtension = Extension<'test.header/action', ActionProperties>;

const MockActionComponent: React.FC = () => <span data-testid="mock-action">Action</span>;

const createMockAction = (
  id: string,
  label: string,
  group?: string,
): LoadedExtension<TestActionExtension> =>
  ({
    type: 'test.header/action',
    properties: {
      id,
      label,
      component: () => Promise.resolve({ default: MockActionComponent }),
      group,
    },
    uid: `uid-${id}`,
    pluginID: 'test-plugin',
    pluginName: 'test-plugin',
  } as unknown as LoadedExtension<TestActionExtension>);

describe('ExtensibleActions', () => {
  it('should render nothing for empty actions', () => {
    const { container } = render(<ExtensibleActions actions={[]} />);

    expect(container.innerHTML).toBe('');
  });

  it('should wrap each action in a DropdownItem', async () => {
    const actions = [createMockAction('deploy', 'Deploy')];

    render(<ExtensibleActions actions={actions} />);

    expect(await screen.findByTestId('action-deploy')).toBeInTheDocument();
    expect(screen.getByTestId('action-deploy').className).toContain('pf-v6-c-menu__list-item');
  });

  it('should render multiple actions as DropdownItems', async () => {
    const actions = [createMockAction('deploy', 'Deploy'), createMockAction('archive', 'Archive')];

    render(<ExtensibleActions actions={actions} />);

    expect(await screen.findByTestId('action-deploy')).toBeInTheDocument();
    expect(screen.getByTestId('action-archive')).toBeInTheDocument();
  });

  it('should sort actions by group', () => {
    const actions = [
      createMockAction('third', 'Third', '3_late'),
      createMockAction('first', 'First', '1_early'),
      createMockAction('second', 'Second', '2_middle'),
    ];

    const { container } = render(<ExtensibleActions actions={actions} />);

    const items = container.querySelectorAll('[data-testid^="action-"]');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveAttribute('data-testid', 'action-first');
    expect(items[1]).toHaveAttribute('data-testid', 'action-second');
    expect(items[2]).toHaveAttribute('data-testid', 'action-third');
  });

  it('should render lazy component content inside DropdownItem', async () => {
    const actions = [createMockAction('deploy', 'Deploy')];

    render(<ExtensibleActions actions={actions} />);

    const actionContent = await screen.findByTestId('mock-action');
    expect(actionContent).toBeInTheDocument();
    expect(actionContent.closest('[data-testid="action-deploy"]')).toBeInTheDocument();
  });
});
