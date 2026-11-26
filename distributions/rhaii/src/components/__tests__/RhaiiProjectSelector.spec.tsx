import * as React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { KnownLabels, NamespacePhase, type ProjectKind } from '@odh-dashboard/k8s-core';
import { WorkingProjectProvider } from '@odh-dashboard/ui-core/context/WorkingProjectContext';
import RhaiiProjectSelector from '../RhaiiProjectSelector';
import { KnownProjectsContext } from '../../context/KnownProjectsContext';

const project = (
  name: string,
  extra: Partial<ProjectKind['metadata']> = {},
  unknown = false,
): ProjectKind => ({
  apiVersion: 'v1',
  kind: 'Namespace',
  metadata: { name, ...extra },
  status: { phase: NamespacePhase.Active },
  ...(unknown && { aiClassificationUnknown: true }),
});
const aiLabels: Partial<ProjectKind['metadata']> = {
  labels: { [KnownLabels.DASHBOARD_RESOURCE]: 'true' },
};

const renderSelector = (known: ProjectKind[], offered: string[]) =>
  render(
    <KnownProjectsContext.Provider value={known}>
      <WorkingProjectProvider
        status="listing-unavailable"
        projects={offered.map((name) => ({ name }))}
        activeProject={null}
        onProjectChange={jest.fn()}
      >
        <RhaiiProjectSelector />
      </WorkingProjectProvider>
    </KnownProjectsContext.Provider>,
  );

describe('RhaiiProjectSelector', () => {
  it('should keep projects with unknown AI classification under AI projects only, without the badge', () => {
    renderSelector(
      [project('ai', aiLabels), project('unread', {}, true), project('plain')],
      ['ai', 'unread', 'plain'],
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

  it('should classify names listed during a discovery outage by their label', () => {
    // Unverified entries from the fallback list: not browsable yet, but their
    // AI label is known.
    const unverified = { canView: false, actionsUnverified: true };
    renderSelector(
      [
        Object.assign(project('listed-ai', aiLabels), unverified),
        Object.assign(project('listed-plain'), unverified),
      ],
      ['listed-ai', 'listed-plain', 'typed-only'],
    );

    fireEvent.click(screen.getByTestId('working-project-selector'));
    expect(
      within(screen.getByTestId('working-project-option-listed-ai')).getByTestId(
        'ai-project-label',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('working-project-option-listed-plain')).not.toBeInTheDocument();
    // A name with no data at all has an unknown classification, so it stays.
    expect(screen.getByTestId('working-project-option-typed-only')).toBeInTheDocument();
  });
});
