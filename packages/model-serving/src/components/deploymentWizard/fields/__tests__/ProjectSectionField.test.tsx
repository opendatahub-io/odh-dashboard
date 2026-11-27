import React from 'react';
import { render, screen, renderHook, fireEvent, act } from '@testing-library/react';
import { ProjectsContext } from '@odh-dashboard/ui-core';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import ProjectSection, {
  isValidProjectName,
  useDeploymentTargetProjects,
  useProjectSection,
} from '../ProjectSection';

const mockProject = mockProjectK8sResource({
  k8sName: 'test-project',
  displayName: 'Test Project',
});
const MockProjectsProvider = ({ children }: { children: React.ReactNode }) => {
  const contextValue = React.useMemo(
    () => ({
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
    }),
    [],
  );

  return <ProjectsContext.Provider value={contextValue}>{children}</ProjectsContext.Provider>;
};
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

  describe('deployment targets', () => {
    const deployer = mockProjectK8sResource({ k8sName: 'deployer', displayName: 'Deployer' });
    const viewer = mockProjectK8sResource({ k8sName: 'viewer', displayName: 'Viewer' });
    const updatePreferredProject = jest.fn();
    const TargetsProvider = ({ children }: { children: React.ReactNode }) => {
      const value = React.useMemo(
        () => ({
          projects: [deployer, viewer],
          deploymentTargetProjects: [deployer],
          loaded: true,
          preferredProject: null,
          modelServingProjects: [deployer, viewer],
          nonActiveProjects: [],
          updatePreferredProject,
          waitForProject: () => Promise.resolve(),
          loadError: undefined,
        }),
        [],
      );
      return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
    };

    it('should offer only deploy-capable projects in the selector', async () => {
      render(
        <ProjectSection
          initialProjectName={undefined}
          projectName={undefined}
          setProjectName={mockSetProject}
        />,
        { wrapper: TargetsProvider },
      );
      await act(async () => {
        fireEvent.click(screen.getByText('Select target project'));
      });
      expect(screen.getByText('Deployer')).toBeInTheDocument();
      expect(screen.queryByText('Viewer')).not.toBeInTheDocument();
    });

    it('should not adopt a view-only project as the preferred target', () => {
      const { result } = renderHook(() => useProjectSection(), { wrapper: TargetsProvider });
      act(() => {
        result.current.setProjectName('viewer');
      });
      expect(updatePreferredProject).not.toHaveBeenCalled();
      act(() => {
        result.current.setProjectName('deployer');
      });
      expect(updatePreferredProject).toHaveBeenCalledWith(deployer);
    });

    it('should not adopt a deploy-only target as the working project', () => {
      const deployOnly = mockProjectK8sResource({ k8sName: 'deploy-only' });
      const DeployOnlyProvider = ({ children }: { children: React.ReactNode }) => {
        const value = React.useMemo(
          () => ({
            projects: [viewer],
            deploymentTargetProjects: [deployOnly],
            loaded: true,
            preferredProject: null,
            modelServingProjects: [viewer],
            nonActiveProjects: [],
            updatePreferredProject,
            waitForProject: () => Promise.resolve(),
            loadError: undefined,
          }),
          [],
        );
        return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
      };
      const { result } = renderHook(() => useProjectSection(), { wrapper: DeployOnlyProvider });
      act(() => {
        result.current.setProjectName('deploy-only');
      });
      expect(result.current.projectName).toBe('deploy-only');
      expect(updatePreferredProject).not.toHaveBeenCalled();
    });

    it('should resolve targets to every project when the host sets none', () => {
      const { result } = renderHook(() => useDeploymentTargetProjects(), {
        wrapper: MockProjectsProvider,
      });
      expect(result.current).toEqual([mockProject]);
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
      expect(screen.getByTestId('project-name')).toBeInTheDocument();
      expect(screen.getByTestId('project-name')).toHaveValue(mockProject.metadata.name);
      expect(screen.getByTestId('project-name')).toHaveAttribute('id', 'project-name');
    });
  });
});
