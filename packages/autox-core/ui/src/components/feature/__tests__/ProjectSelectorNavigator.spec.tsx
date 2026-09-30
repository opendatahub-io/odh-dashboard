import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProjectSelectorNavigator from '../ProjectSelectorNavigator';
import { useNamespaceSelectorWithPersistence } from '../../../hooks/common/useNamespaceSelectorWithPersistence';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));
jest.mock('../../../hooks/common/useNamespaceSelectorWithPersistence');

jest.mock('@odh-dashboard/ui-core/components/projectSelector/ProjectSelector', () => ({
  __esModule: true,
  default: ({
    namespace,
    namespacesOverride,
    onSelection,
  }: {
    namespace: string;
    namespacesOverride: { name: string }[];
    onSelection: (name: string) => void;
  }) => (
    <div>
      <span data-testid="selected-namespace">{namespace}</span>
      {namespacesOverride.map(({ name }) => (
        <button key={name} onClick={() => onSelection(name)}>
          {name}
        </button>
      ))}
      <button onClick={() => onSelection('')}>Clear</button>
    </div>
  ),
}));

const mockUseNamespaceSelectorWithPersistence = jest.mocked(useNamespaceSelectorWithPersistence);

describe('ProjectSelectorNavigator', () => {
  const namespace = { name: 'project-a', displayName: 'Project A' };

  beforeEach(() => {
    mockNavigate.mockClear();
    mockUseNamespaceSelectorWithPersistence.mockReturnValue({
      namespaces: [namespace],
      preferredNamespace: undefined,
      namespacesLoaded: true,
      namespacesLoadError: undefined,
      updatePreferredNamespace: jest.fn(),
      clearStoredNamespace: jest.fn(),
    } as ReturnType<typeof useNamespaceSelectorWithPersistence>);
  });

  it('should update the preferred namespace and navigate for a selected project', () => {
    const updatePreferredNamespace = jest.fn();
    mockUseNamespaceSelectorWithPersistence.mockReturnValue({
      namespaces: [namespace],
      preferredNamespace: undefined,
      namespacesLoaded: true,
      namespacesLoadError: undefined,
      updatePreferredNamespace,
      clearStoredNamespace: jest.fn(),
    } as ReturnType<typeof useNamespaceSelectorWithPersistence>);
    const onProjectSelected = jest.fn();

    render(
      <MemoryRouter>
        <ProjectSelectorNavigator
          getRedirectPath={(selectedNamespace) => `/experiments/${selectedNamespace}`}
          onProjectSelected={onProjectSelected}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'project-a' }));

    expect(updatePreferredNamespace).toHaveBeenCalledWith(namespace);
    expect(onProjectSelected).toHaveBeenCalledWith('project-a');
    expect(mockNavigate).toHaveBeenCalledWith('/experiments/project-a');
  });

  it('should report but not navigate or update preferred namespace when clearing selection', () => {
    const updatePreferredNamespace = jest.fn();
    mockUseNamespaceSelectorWithPersistence.mockReturnValue({
      namespaces: [namespace],
      preferredNamespace: undefined,
      namespacesLoaded: true,
      namespacesLoadError: undefined,
      updatePreferredNamespace,
      clearStoredNamespace: jest.fn(),
    } as ReturnType<typeof useNamespaceSelectorWithPersistence>);
    const getRedirectPath = jest.fn(() => '/experiments/');
    const onProjectSelected = jest.fn();

    render(
      <MemoryRouter>
        <ProjectSelectorNavigator
          getRedirectPath={getRedirectPath}
          onProjectSelected={onProjectSelected}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

    expect(onProjectSelected).toHaveBeenCalledWith('');
    expect(updatePreferredNamespace).not.toHaveBeenCalled();
    expect(getRedirectPath).not.toHaveBeenCalled();
  });
});
