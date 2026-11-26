import * as React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { KnownLabels, NamespacePhase, type ProjectKind } from '@odh-dashboard/k8s-core';
import {
  ProjectsContext,
  type ProjectsContextType,
} from '@odh-dashboard/ui-core/context/ProjectsContext';
import { WorkingProjectProvider } from '@odh-dashboard/ui-core/context/WorkingProjectContext';
import RhaiiProjectSelector from '../RhaiiProjectSelector';

const project = (name: string, extra: Partial<ProjectKind['metadata']> = {}, unknown = false) => ({
  apiVersion: 'v1',
  kind: 'Namespace',
  metadata: { name, ...extra },
  status: { phase: NamespacePhase.Active },
  ...(unknown && { aiClassificationUnknown: true }),
});

describe('RhaiiProjectSelector', () => {
  it('should keep projects with unknown AI classification under AI projects only, without the badge', () => {
    const projects: ProjectKind[] = [
      project('ai', { labels: { [KnownLabels.DASHBOARD_RESOURCE]: 'true' } }),
      project('unread', {}, true),
      project('plain'),
    ];
    const value: ProjectsContextType = {
      projects,
      modelServingProjects: projects,
      nonActiveProjects: [],
      preferredProject: null,
      updatePreferredProject: () => undefined,
      waitForProject: () => Promise.resolve(),
      loaded: true,
      loadError: undefined,
    };
    render(
      <ProjectsContext.Provider value={value}>
        <WorkingProjectProvider
          projects={projects.map(({ metadata }) => ({ name: metadata.name }))}
          activeProject={null}
          onProjectChange={jest.fn()}
        >
          <RhaiiProjectSelector />
        </WorkingProjectProvider>
      </ProjectsContext.Provider>,
    );

    fireEvent.click(screen.getByTestId('working-project-selector'));
    expect(screen.getByRole('button', { name: 'Project type' })).toHaveTextContent(
      'AI projects only',
    );
    expect(
      within(screen.getByTestId('working-project-option-ai')).getByTestId('ai-project-label'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('working-project-option-unread')).queryByTestId('ai-project-label'),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('working-project-option-plain')).not.toBeInTheDocument();
  });

  it('should keep names listed during a discovery outage under AI projects only', () => {
    const value: ProjectsContextType = {
      projects: [],
      modelServingProjects: [],
      nonActiveProjects: [],
      preferredProject: null,
      updatePreferredProject: () => undefined,
      waitForProject: () => Promise.resolve(),
      loaded: true,
      loadError: undefined,
    };
    render(
      <ProjectsContext.Provider value={value}>
        <WorkingProjectProvider
          status="listing-unavailable"
          projects={[{ name: 'listed-only' }]}
          activeProject={null}
          onProjectChange={jest.fn()}
        >
          <RhaiiProjectSelector />
        </WorkingProjectProvider>
      </ProjectsContext.Provider>,
    );

    fireEvent.click(screen.getByTestId('working-project-selector'));
    expect(screen.getByRole('button', { name: 'Project type' })).toHaveTextContent(
      'AI projects only',
    );
    expect(screen.getByTestId('working-project-option-listed-only')).toBeInTheDocument();
  });
});
