import React, { act } from 'react';
import { render, screen, renderHook, fireEvent } from '@testing-library/react';
import { ProjectsContext } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import { mockProjectK8sResource } from '@odh-dashboard/internal/__mocks__/mockProjectK8sResource';
import ProjectSection, { isValidProject, useProjectSection } from '../ProjectSection';

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
      expect(isValidProject(mockProject)).toBe(true);
    });

    it('should return false for null project', () => {
      expect(isValidProject(null)).toBe(false);
    });
  });

  describe('useProjectSection hook', () => {
    it('should initialize with null by default', () => {
      const { result } = renderHook(() => useProjectSection());
      expect(result.current.project).toBeNull();
      expect(result.current.initialProject).toBeUndefined();
    });

    it('should initialize with provided initial project', () => {
      const { result } = renderHook(() => useProjectSection(mockProject));
      expect(result.current.project).toEqual(mockProject);
      expect(result.current.initialProject).toEqual(mockProject);
    });

    it('should update project state', () => {
      const { result } = renderHook(() => useProjectSection());

      act(() => {
        result.current.setProject(mockProject);
      });

      expect(result.current.project).toEqual(mockProject);
    });
  });

  describe('Component without initial project', () => {
    it('should render ProjectSelector when no initial project', () => {
      render(<ProjectSection initialProject={null} project={null} setProject={mockSetProject} />);
      expect(screen.getByText('Select target project')).toBeInTheDocument();
    });

    it('should render ProjectSelector when initial project is undefined', () => {
      render(
        <ProjectSection initialProject={undefined} project={null} setProject={mockSetProject} />,
      );
      expect(screen.getByText('Select target project')).toBeInTheDocument();
    });
    it('should call setProject when ProjectSelector calls setSelectedProject', async () => {
      render(<ProjectSection initialProject={null} project={null} setProject={mockSetProject} />, {
        wrapper: MockProjectsProvider,
      });
      const projectSelector = screen.getByText('Select target project');
      await act(async () => {
        fireEvent.click(projectSelector);
      });
      const option = screen.getByText('Test Project');
      await act(async () => {
        fireEvent.click(option);
      });
      expect(mockSetProject).toHaveBeenCalledWith(mockProject);
    });
  });

  describe('Component with initial project', () => {
    it('should render FormGroup with project name when initial project is provided', () => {
      render(
        <ProjectSection
          initialProject={mockProject}
          project={mockProject}
          setProject={mockSetProject}
        />,
      );
      expect(screen.getByText('test-project')).toBeInTheDocument();
    });
  });
});
