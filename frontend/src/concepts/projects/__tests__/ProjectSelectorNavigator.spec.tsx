import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProjectsContext } from '#~/concepts/projects/ProjectsContext';
import ProjectSelectorNavigator from '#~/concepts/projects/ProjectSelectorNavigator';

const mockUseParams = jest.fn();
const mockUseSearchParams = jest.fn();

const updatePreferredProjectMock = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => mockUseParams(),
  useSearchParams: () => mockUseSearchParams(),
}));

jest.mock('#~/concepts/projects/ProjectSelector', () => {
  function MockProjectSelector(props: {
    namespace: string;
    onSelection: (projectName: string) => void;
    getSelectionHref?: (projectName: string) => string | undefined;
  }) {
    return (
      <div>
        <div data-testid="namespace-value">{props.namespace}</div>
        <a href={props.getSelectionHref?.('beta')} data-testid="project-link">
          project link
        </a>
        <button
          type="button"
          data-testid="select-project"
          onClick={() => props.onSelection('beta')}
        >
          select project
        </button>
        <button
          type="button"
          data-testid="select-current-project"
          onClick={() => props.onSelection(props.namespace)}
        >
          select current project
        </button>
      </div>
    );
  }
  return MockProjectSelector;
});

const renderComponent = (onProjectChange?: (projectName: string) => void) =>
  render(
    <ProjectsContext.Provider
      value={{
        projects: [{ metadata: { name: 'beta' } } as never],
        modelServingProjects: [],
        nonActiveProjects: [],
        preferredProject: null,
        updatePreferredProject: updatePreferredProjectMock,
        loaded: true,
        loadError: undefined,
        waitForProject: () => Promise.resolve(),
      }}
    >
      <ProjectSelectorNavigator
        getRedirectPath={(namespace) => `/projects/${namespace}`}
        onProjectChange={onProjectChange}
      />
    </ProjectsContext.Provider>,
  );

describe('ProjectSelectorNavigator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({ namespace: 'alpha' });
    mockUseSearchParams.mockReturnValue([new URLSearchParams('ns=gamma')]);
  });

  it('should use path namespace when available', () => {
    renderComponent();
    expect(screen.getByTestId('namespace-value')).toHaveTextContent('alpha');
  });

  it('should use query namespace when path namespace is not set', () => {
    mockUseParams.mockReturnValue({ namespace: undefined });
    render(
      <ProjectsContext.Provider
        value={{
          projects: [{ metadata: { name: 'beta' } } as never],
          modelServingProjects: [],
          nonActiveProjects: [],
          preferredProject: null,
          updatePreferredProject: updatePreferredProjectMock,
          loaded: true,
          loadError: undefined,
          waitForProject: () => Promise.resolve(),
        }}
      >
        <ProjectSelectorNavigator
          queryParamNamespace="ns"
          getRedirectPath={(namespace) => `/projects/${namespace}`}
        />
      </ProjectsContext.Provider>,
    );
    expect(screen.getByTestId('namespace-value')).toHaveTextContent('gamma');
  });

  it('should update preferred project on selection', () => {
    renderComponent();
    fireEvent.click(screen.getByTestId('select-project'));

    expect(updatePreferredProjectMock).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { name: 'beta' } }),
    );
  });

  it('should provide href-capable selection links', () => {
    renderComponent();
    expect(screen.getByTestId('project-link')).toHaveAttribute('href', '/projects/beta');
  });

  it('should call onProjectChange when a different project is selected', () => {
    const onProjectChangeMock = jest.fn();
    renderComponent(onProjectChangeMock);

    fireEvent.click(screen.getByTestId('select-project'));

    expect(onProjectChangeMock).toHaveBeenCalledWith('beta');
  });

  it('should not call onProjectChange when current project is reselected', () => {
    const onProjectChangeMock = jest.fn();
    renderComponent(onProjectChangeMock);

    fireEvent.click(screen.getByTestId('select-current-project'));

    expect(onProjectChangeMock).not.toHaveBeenCalled();
  });

  it('should not fail when onProjectChange is not provided', () => {
    renderComponent();
    expect(() => fireEvent.click(screen.getByTestId('select-project'))).not.toThrow();
  });
});
