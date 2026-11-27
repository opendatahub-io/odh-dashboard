import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import {
  useWorkingProject,
  WorkingProjectStatusValue,
} from '@odh-dashboard/ui-core/context/WorkingProjectContext';
import AppRoutes from '~/app/AppRoutes';

jest.unmock('mod-arch-shared');

jest.mock('~/app/pages/AutoragExperimentsPage', () => ({
  __esModule: true,
  default: () => <Page />,
}));
jest.mock('~/app/pages/AutoragConfigurePage', () => ({
  __esModule: true,
  default: () => <Page />,
}));
jest.mock('~/app/pages/AutoragReconfigureLoader', () => ({
  __esModule: true,
  default: () => <Page />,
}));
jest.mock('~/app/pages/AutoragResultsPage', () => ({ __esModule: true, default: () => <Page /> }));

jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core/areas'),
  useIsAreaAvailable: jest.fn(),
}));
jest.mock('@odh-dashboard/ui-core/context/WorkingProjectContext', () => ({
  ...jest.requireActual('@odh-dashboard/ui-core/context/WorkingProjectContext'),
  useWorkingProject: jest.fn(),
}));
jest.mock('~/app/components/common/AutoragHeader/AutoragHeader', () => ({
  __esModule: true,
  default: function MockHeader() {
    return <span>AutoRAG</span>;
  },
}));

const prefix = '/gen-ai-studio/autorag';
let location: ReturnType<typeof useLocation>;
let navigate: ReturnType<typeof useNavigate>;
const Observer = () => {
  location = useLocation();
  navigate = useNavigate();
  return null;
};
const Page = () => {
  const [selected, setSelected] = React.useState(false);
  return <button onClick={() => setSelected(true)}>{selected ? 'Selected' : 'Select run'}</button>;
};
const tree = (path: string) => (
  <MemoryRouter
    initialEntries={[
      {
        pathname: path.split('?')[0],
        search: path.includes('?') ? '?tab=runs' : '',
        hash: '#details',
        state: { run: 'old-run' },
      },
    ]}
  >
    <Observer />
    <Routes>
      <Route path={`${prefix}/*`} element={<AppRoutes />} />
    </Routes>
  </MemoryRouter>
);

describe('AutoragProjectRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(useIsAreaAvailable)
      .mockReturnValue({ status: true } as ReturnType<typeof useIsAreaAvailable>);
    jest.mocked(useWorkingProject).mockReturnValue({
      status: WorkingProjectStatusValue.Listed,
      projects: [{ name: 'project-a' }, { name: 'project-b' }],
      activeProject: { name: 'project-a' },
      selectProject: jest.fn(),
      registerProjectRouteSync: jest.fn(() => jest.fn()),
    });
  });

  it('should honor a valid deep link and select its project once', () => {
    const path = `${prefix}/results/project-b/run-b?tab=runs`;
    const view = render(tree(path));
    view.rerender(tree(path));
    expect(location.pathname).toBe(`${prefix}/results/project-b/run-b`);
    expect(location.search).toBe('?tab=runs');
    expect(location.hash).toBe('#details');
    expect(useWorkingProject().selectProject).toHaveBeenCalledTimes(1);
    expect(useWorkingProject().selectProject).toHaveBeenCalledWith({ name: 'project-b' });
  });

  it.each([
    'experiments/project-a',
    'configure/project-a',
    'reconfigure/project-a/run-a',
    'results/project-a/run-a',
  ])('should clear project-scoped location and page state when switching from %s', (route) => {
    const path = `${prefix}/${route}?tab=runs`;
    const view = render(tree(path));
    fireEvent.click(screen.getByRole('button', { name: 'Select run' }));
    jest
      .mocked(useWorkingProject)
      .mockReturnValue({ ...useWorkingProject(), activeProject: { name: 'project-b' } });
    view.rerender(tree(path));
    expect(location.pathname).toBe(`${prefix}/experiments/project-b`);
    expect(location.search).toBe('');
    expect(location.hash).toBe('');
    expect(location.state).toBeNull();
    expect(screen.getByRole('button', { name: 'Select run' })).toBeInTheDocument();
    expect(useWorkingProject().selectProject).not.toHaveBeenCalled();
  });

  it('should restore the active project on a bare experiments route', () => {
    render(tree(`${prefix}/experiments`));
    expect(location.pathname).toBe(`${prefix}/experiments/project-a`);
  });

  it.each([
    [WorkingProjectStatusValue.Loading, 'Loading'],
    [WorkingProjectStatusValue.ProjectSourceError, 'Error loading components'],
    [WorkingProjectStatusValue.NoProjectSelected, 'Select a project to begin'],
    [WorkingProjectStatusValue.EmptyList, 'No projects'],
    [WorkingProjectStatusValue.ListingUnavailable, 'Error loading components'],
  ])('should not choose a fallback project when status is %s', (status, text) => {
    jest
      .mocked(useWorkingProject)
      .mockReturnValue({ ...useWorkingProject(), status, activeProject: null, projects: [] });
    render(tree(`${prefix}/experiments`));
    expect(screen.getByText(text)).toBeInTheDocument();
    expect(location.pathname).toBe(`${prefix}/experiments`);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should reject a project not supplied by the host', () => {
    render(tree(`${prefix}/results/inaccessible/run-a`));
    expect(screen.getByRole('heading', { name: 'Project not found' })).toBeInTheDocument();
    expect(useWorkingProject().selectProject).not.toHaveBeenCalled();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should wait for delayed projects before resolving a deep link', () => {
    const ready = useWorkingProject();
    jest.mocked(useWorkingProject).mockReturnValue({
      ...ready,
      status: WorkingProjectStatusValue.Loading,
      projects: [],
      activeProject: null,
    });
    const path = `${prefix}/results/project-b/run-b`;
    const view = render(tree(path));
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    jest.mocked(useWorkingProject).mockReturnValue(ready);
    view.rerender(tree(path));
    expect(location.pathname).toBe(path);
    expect(ready.selectProject).toHaveBeenCalledWith({ name: 'project-b' });
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should synchronize a project reached by browser navigation', () => {
    const path = `${prefix}/experiments/project-a`;
    const view = render(tree(path));
    act(() => navigate(`${prefix}/results/project-b/run-b`));
    expect(useWorkingProject().selectProject).toHaveBeenCalledWith({ name: 'project-b' });
    jest
      .mocked(useWorkingProject)
      .mockReturnValue({ ...useWorkingProject(), activeProject: { name: 'project-b' } });
    view.rerender(tree(path));
    act(() => navigate(-1));
    expect(location.pathname).toBe(`${prefix}/experiments/project-a`);
    expect(useWorkingProject().selectProject).toHaveBeenLastCalledWith({ name: 'project-a' });
    expect(useWorkingProject().selectProject).toHaveBeenCalledTimes(2);
  });

  it('should keep synchronization mounted across list, configure, and results navigation', () => {
    const path = `${prefix}/experiments/project-a`;
    const view = render(tree(path));
    act(() => navigate(`${prefix}/configure/project-a`));
    act(() => navigate(`${prefix}/results/project-a/run-a`));
    jest
      .mocked(useWorkingProject)
      .mockReturnValue({ ...useWorkingProject(), activeProject: { name: 'project-b' } });
    view.rerender(tree(path));
    expect(location.pathname).toBe(`${prefix}/experiments/project-b`);
    expect(useWorkingProject().selectProject).not.toHaveBeenCalled();
    jest
      .mocked(useWorkingProject)
      .mockReturnValue({ ...useWorkingProject(), activeProject: { name: 'project-a' } });
    view.rerender(tree(path));
    expect(location.pathname).toBe(`${prefix}/experiments/project-a`);
    expect(useWorkingProject().selectProject).not.toHaveBeenCalled();
  });

  it('should render a host-validated deep link when project listing is restricted', () => {
    jest.mocked(useWorkingProject).mockReturnValue({
      ...useWorkingProject(),
      status: WorkingProjectStatusValue.ListingUnavailable,
      projects: [{ name: 'project-b' }],
      activeProject: null,
    });
    render(tree(`${prefix}/results/project-b/run-b`));
    expect(screen.getByRole('button', { name: 'Select run' })).toBeInTheDocument();
    expect(useWorkingProject().selectProject).toHaveBeenCalledWith({ name: 'project-b' });
  });

  it.each([
    WorkingProjectStatusValue.ListingUnavailable,
    WorkingProjectStatusValue.ProjectSourceError,
    WorkingProjectStatusValue.ProviderAbsent,
  ])('should show a loading error instead of not found when projects are %s', (status) => {
    jest.mocked(useWorkingProject).mockReturnValue({
      ...useWorkingProject(),
      status,
      projects: [],
      activeProject: null,
    });
    const path = `${prefix}/results/unverified-project/run-a`;
    render(tree(path));

    expect(screen.getByRole('heading', { name: 'Error loading components' })).toBeInTheDocument();
    expect(
      screen.getByText('Unable to load the project list. Please try again later.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Project not found' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Select run' })).not.toBeInTheDocument();
    expect(location.pathname).toBe(path);
    expect(useWorkingProject().selectProject).not.toHaveBeenCalled();
  });

  it('should render a restricted-list project after the host validates it', () => {
    const ready = useWorkingProject();
    jest.mocked(useWorkingProject).mockReturnValue({
      ...ready,
      status: WorkingProjectStatusValue.ListingUnavailable,
      projects: [{ name: 'project-a' }],
      activeProject: null,
    });
    const path = `${prefix}/results/project-b/run-b`;
    const view = render(tree(path));
    expect(screen.getByRole('heading', { name: 'Error loading components' })).toBeInTheDocument();

    jest.mocked(useWorkingProject).mockReturnValue({
      ...ready,
      status: WorkingProjectStatusValue.ListingUnavailable,
    });
    view.rerender(tree(path));

    expect(
      screen.queryByRole('heading', { name: 'Error loading components' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select run' })).toBeInTheDocument();
    expect(location.pathname).toBe(path);
    expect(ready.selectProject).toHaveBeenCalledWith({ name: 'project-b' });
  });

  it('should preserve legacy routes when UPS is disabled', () => {
    jest
      .mocked(useIsAreaAvailable)
      .mockReturnValue({ status: false } as ReturnType<typeof useIsAreaAvailable>);
    const path = `${prefix}/results/project-a/run-a?tab=runs`;
    const view = render(tree(path));
    jest
      .mocked(useWorkingProject)
      .mockReturnValue({ ...useWorkingProject(), activeProject: { name: 'project-b' } });
    view.rerender(tree(path));
    expect(location.pathname).toBe(`${prefix}/results/project-a/run-a`);
    expect(location.search).toBe('?tab=runs');
    expect(location.hash).toBe('#details');
    expect(location.state).toEqual({ run: 'old-run' });
    expect(useWorkingProject().selectProject).not.toHaveBeenCalled();
    expect(useWorkingProject().registerProjectRouteSync).not.toHaveBeenCalled();
  });
});
