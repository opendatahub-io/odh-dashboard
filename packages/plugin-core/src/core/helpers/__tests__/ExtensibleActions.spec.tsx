import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { createMockActionExtension } from './mockExtensions';
import { ExtensibleActions } from '../ExtensibleActions';

describe('ExtensibleActions', () => {
  it('should render nothing for empty actions', () => {
    const { container } = render(<ExtensibleActions actions={[]} />);

    expect(container.innerHTML).toBe('');
  });

  it('should wrap each action in a DropdownItem', async () => {
    const actions = [createMockActionExtension('deploy', 'Deploy')];

    render(<ExtensibleActions actions={actions} />);

    const element = await screen.findByTestId('action-deploy');
    expect(element).toBeInTheDocument();
    expect(element).toHaveClass('pf-v6-c-menu__list-item');
  });

  it('should render multiple actions as DropdownItems', async () => {
    const actions = [
      createMockActionExtension('deploy', 'Deploy'),
      createMockActionExtension('archive', 'Archive'),
    ];

    render(<ExtensibleActions actions={actions} />);

    expect(await screen.findByTestId('action-deploy')).toBeInTheDocument();
    expect(screen.getByTestId('action-archive')).toBeInTheDocument();
  });

  it('should sort actions by group', () => {
    const actions = [
      createMockActionExtension('third', 'Third', { group: '3_late' }),
      createMockActionExtension('first', 'First', { group: '1_early' }),
      createMockActionExtension('second', 'Second', { group: '2_middle' }),
    ];

    const { container } = render(<ExtensibleActions actions={actions} />);

    const items = container.querySelectorAll('[data-testid^="action-"]');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveAttribute('data-testid', 'action-first');
    expect(items[1]).toHaveAttribute('data-testid', 'action-second');
    expect(items[2]).toHaveAttribute('data-testid', 'action-third');
  });

  it('should render lazy component content inside DropdownItem', async () => {
    const actions = [createMockActionExtension('deploy', 'Deploy')];

    render(<ExtensibleActions actions={actions} />);

    const actionContent = await screen.findByTestId('mock-action');
    expect(actionContent).toBeInTheDocument();
    expect(actionContent.closest('[data-testid="action-deploy"]')).toBeInTheDocument();
  });
});
