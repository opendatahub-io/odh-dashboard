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

  it('should render each action component directly', async () => {
    const actions = [createMockActionExtension('deploy', 'Deploy')];

    render(<ExtensibleActions actions={actions} />);

    const element = await screen.findByTestId('mock-action');
    expect(element).toBeInTheDocument();
  });

  it('should render multiple action components', async () => {
    const actions = [
      createMockActionExtension('deploy', 'Deploy'),
      createMockActionExtension('archive', 'Archive'),
    ];

    render(<ExtensibleActions actions={actions} />);

    const elements = await screen.findAllByTestId('mock-action');
    expect(elements).toHaveLength(2);
  });

  it('should sort actions by group', async () => {
    const MockFirst: React.FC = () => React.createElement('span', { 'data-testid': 'first' });
    const MockSecond: React.FC = () => React.createElement('span', { 'data-testid': 'second' });
    const MockThird: React.FC = () => React.createElement('span', { 'data-testid': 'third' });

    const actions = [
      createMockActionExtension('third', 'Third', {
        group: '3_late',
        component: () => Promise.resolve({ default: MockThird }),
      }),
      createMockActionExtension('first', 'First', {
        group: '1_early',
        component: () => Promise.resolve({ default: MockFirst }),
      }),
      createMockActionExtension('second', 'Second', {
        group: '2_middle',
        component: () => Promise.resolve({ default: MockSecond }),
      }),
    ];

    const { container } = render(<ExtensibleActions actions={actions} />);

    await screen.findByTestId('first');
    const testIds = Array.from(container.querySelectorAll('[data-testid]')).map((el) =>
      el.getAttribute('data-testid'),
    );
    expect(testIds).toEqual(['first', 'second', 'third']);
  });

  it('should filter actions by group when group prop is set', async () => {
    const actions = [
      createMockActionExtension('deploy', 'Deploy', { group: 'page-a' }),
      createMockActionExtension('archive', 'Archive', { group: 'page-b' }),
    ];

    render(<ExtensibleActions actions={actions} group="page-a" />);

    const elements = await screen.findAllByTestId('mock-action');
    expect(elements).toHaveLength(1);
  });
});
