import React from 'react';
import { render, screen, renderHook, fireEvent, act } from '@testing-library/react';
import { ProjectsContext } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import { mockProjectK8sResource } from '@odh-dashboard/internal/__mocks__/mockProjectK8sResource';
import ProjectSection, { isValidProjectName, useProjectSection } from '../ProjectSection';

const mockProject = mockProjectK8sResource({
  k8sName: 'test-project',
  displayName: 'Test Project',
});
const MockProjectsProvider = ({ children }: { children: React.ReactNode }) =>
  React.useMemo(
    () => (
      <ProjectsContext.Provider
        value={{
          projects: [mockProject],
          loaded: true,
          preferredProject: null,
          modelServingProjects: [],
          nonActiveProjects: [],
          updatePreferredProject: () => {
            // Mock implementation
          },
          waitForProject: () => Promise.resolve(),
          loadError: undefined,
        }}
      >
        {children}
      </ProjectsContext.Provider>
    ),
    [],
  );
describe('ProjectSection', () => {
  const mockSetProject = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isValidProject', () => {
    it('should return true for valid project', () => {
      expect(isValidProjectName(mockProject.metadata.name)).toBe(true);
    });

    it('should return false for null project', () => {
      expect(isValidProjectName(undefined)).toBe(false);
    });
  });

  describe('useProjectSection hook', () => {
    it('should initialize with undefined by default', () => {
      const { result } = renderHook(() => useProjectSection());
      expect(result.current.projectName).toBeUndefined();
      expect(result.current.initialProjectName).toBeUndefined();
    });

    it('should initialize with provided initial project', () => {
      const { result } = renderHook(() => useProjectSection(mockProject.metadata.name));
      expect(result.current.projectName).toEqual(mockProject.metadata.name);
      expect(result.current.initialProjectName).toEqual(mockProject.metadata.name);
    });

    it('should update project state', () => {
      const { result } = renderHook(() => useProjectSection());

      act(() => {
        result.current.setProjectName(mockProject.metadata.name);
      });

      expect(result.current.projectName).toEqual(mockProject.metadata.name);
    });
  });

  describe('Component without initial project', () => {
    it('should render ProjectSelector when no initial project', () => {
      render(
        <ProjectSection
          initialProjectName={undefined}
          projectName={undefined}
          setProjectName={mockSetProject}
        />,
        {
          wrapper: MockProjectsProvider,
        },
      );
      expect(screen.getByText('Select target project')).toBeInTheDocument();
    });
    it('should call setProject when ProjectSelector calls setSelectedProject', async () => {
      render(
        <ProjectSection
          initialProjectName={undefined}
          projectName={undefined}
          setProjectName={mockSetProject}
        />,
        {
          wrapper: MockProjectsProvider,
        },
      );
      const projectSelector = screen.getByText('Select target project');
      await act(async () => {
        fireEvent.click(projectSelector);
      });
      const option = screen.getByText('Test Project');
      await act(async () => {
        fireEvent.click(option);
      });
      expect(mockSetProject).toHaveBeenCalledWith(mockProject.metadata.name);
    });
  });

  describe('Component with initial project', () => {
    it('should render FormGroup with project name when initial project is provided', () => {
      render(
        <ProjectSection
          initialProjectName={mockProject.metadata.name}
          projectName={mockProject.metadata.name}
          setProjectName={mockSetProject}
        />,
      );
      expect(screen.getByText('test-project')).toBeInTheDocument();
    });
  });
});
