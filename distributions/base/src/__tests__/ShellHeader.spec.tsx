import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useExtensions } from '@odh-dashboard/plugin-core';
import ShellHeader from '../ShellHeader';

jest.mock('@odh-dashboard/plugin-core', () => ({
  useExtensions: jest.fn(),
  LazyCodeRefComponent: ({ component: Component }: { component: React.ComponentType }) => (
    <Component />
  ),
}));

const ProjectSelector: React.FC = () => <button>Project selector</button>;
const UserMenu: React.FC = () => <button>User menu</button>;

describe('ShellHeader', () => {
  it('should keep leading extensions separate from the right-aligned utility group', () => {
    jest.mocked(useExtensions).mockImplementation(
      (guard) =>
        [
          {
            type: 'app.masthead/toolbar-item',
            uid: 'project-selector',
            pluginName: 'rhaii',
            properties: { id: 'selector', component: ProjectSelector, position: 'leading' },
          },
          {
            type: 'app.masthead/toolbar-item',
            uid: 'user-menu',
            pluginName: 'rhaii',
            properties: { id: 'user-menu', component: UserMenu, position: 'trailing' },
          },
        ].filter((extension) => !guard || guard(extension)) as ReturnType<typeof useExtensions>,
    );
    render(
      <MemoryRouter>
        <ShellHeader />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('masthead-leading-group')).toContainElement(
      screen.getByRole('button', { name: 'Project selector' }),
    );
    expect(screen.getByTestId('masthead-utility-group')).toContainElement(
      screen.getByRole('button', { name: 'User menu' }),
    );
    expect(screen.getByTestId('masthead-leading-group')).not.toContainElement(
      screen.getByRole('button', { name: 'User menu' }),
    );
  });
});
