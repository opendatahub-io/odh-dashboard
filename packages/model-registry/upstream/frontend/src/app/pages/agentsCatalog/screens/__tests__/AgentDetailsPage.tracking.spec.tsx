import '@testing-library/jest-dom';
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useUserInteraction } from '~/concepts/userInteraction';
import { useAgent } from '~/app/hooks/agentsCatalog/useAgent';
import type { Agent } from '~/app/agentsCatalogTypes';
import { AGENT_CATALOG_EVENTS } from '~/app/pages/agentsCatalog/tracking';
import { AGENTS_CATALOG_TITLE } from '~/app/pages/agentsCatalog/const';
import { agentsCatalogUrl } from '~/app/routes/agentsCatalog/agentsCatalog';
import AgentDetailsPage from '~/app/pages/agentsCatalog/screens/AgentDetailsPage';

jest.mock('~/concepts/userInteraction', () => ({
  useUserInteraction: jest.fn(),
}));

jest.mock('~/app/hooks/agentsCatalog/useAgent', () => ({
  useAgent: jest.fn(),
}));

jest.mock('~/app/pages/agentsCatalog/screens/AgentDetailsView', () => ({
  __esModule: true,
  default: () => <div data-testid="agent-details-view" />,
}));

jest.mock('~/app/shared/components/ScrollViewOnMount', () => ({
  __esModule: true,
  default: () => null,
}));

const mockUseUserInteraction = jest.mocked(useUserInteraction);
const mockUseAgent = jest.mocked(useAgent);

const mockTrackSimpleEvent = jest.fn();
const mockTrackLinkEvent = jest.fn();
const mockTrackFormEvent = jest.fn();
const mockTrackPageEvent = jest.fn();

const mockAgent: Agent = {
  id: 'agent-1',
  name: 'agent-one',
  displayName: 'Agent One',
  repositoryUrl: 'https://github.com/example/agent-one',
};

const renderPage = (options?: {
  agent?: Agent | null;
  loaded?: boolean;
  loadError?: Error;
  locationState?: unknown;
}) => {
  const { agent = mockAgent, loaded = true, loadError = undefined, locationState } = options ?? {};

  mockUseAgent.mockReturnValue([agent, loaded, loadError, jest.fn()]);

  return render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: '/ai-hub/agents/catalog/agent-1/overview',
          state: locationState,
        },
      ]}
    >
      <Routes>
        <Route path="/ai-hub/agents/catalog/:agentId/overview" element={<AgentDetailsPage />} />
      </Routes>
    </MemoryRouter>,
  );
};

describe('AgentDetailsPage tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUserInteraction.mockReturnValue({
      trackSimpleEvent: mockTrackSimpleEvent,
      trackLinkEvent: mockTrackLinkEvent,
      trackFormEvent: mockTrackFormEvent,
      trackPageEvent: mockTrackPageEvent,
    });
  });

  it('should fire details viewed on successful load with direct_url entry source', () => {
    renderPage();

    expect(mockTrackSimpleEvent).toHaveBeenCalledWith(AGENT_CATALOG_EVENTS.DETAILS_VIEWED, {
      templateId: 'agent-1',
      templateName: 'Agent One',
      entrySource: 'direct_url',
    });
  });

  it('should include catalog navigation props when entrySource is catalog_card', () => {
    renderPage({
      locationState: {
        entrySource: 'catalog_card',
        positionIndex: 2,
        hasActiveFilters: true,
        countActiveFilters: 1,
        hasSearchQuery: false,
        resultCount: 10,
      },
    });

    expect(mockTrackSimpleEvent).toHaveBeenCalledWith(AGENT_CATALOG_EVENTS.DETAILS_VIEWED, {
      templateId: 'agent-1',
      templateName: 'Agent One',
      entrySource: 'catalog_card',
      positionIndex: 2,
      hasActiveFilters: true,
      countActiveFilters: 1,
      hasSearchQuery: false,
      resultCount: 10,
    });
  });

  it('should fire open github clicked when Open GitHub is clicked', () => {
    renderPage();

    fireEvent.click(screen.getByTestId('agent-github-button'));

    expect(mockTrackLinkEvent).toHaveBeenCalledWith(AGENT_CATALOG_EVENTS.OPEN_GITHUB_CLICKED, {
      href: 'https://github.com/example/agent-one',
      type: 'external',
      section: 'Agent Catalog Details',
      name: 'Agent One',
    });
  });

  it('should fire back to catalog clicked from the breadcrumb', () => {
    renderPage();

    fireEvent.click(screen.getByRole('link', { name: AGENTS_CATALOG_TITLE }));

    expect(mockTrackLinkEvent).toHaveBeenCalledWith(AGENT_CATALOG_EVENTS.BACK_TO_CATALOG_CLICKED, {
      href: agentsCatalogUrl(),
      type: 'internal',
      section: 'Agent Catalog Details',
      name: AGENTS_CATALOG_TITLE,
    });
  });

  it('should fire back to catalog clicked from the not-found empty state', () => {
    renderPage({ agent: null, loaded: true });

    fireEvent.click(screen.getByRole('link', { name: `Return to ${AGENTS_CATALOG_TITLE}` }));

    expect(mockTrackLinkEvent).toHaveBeenCalledWith(AGENT_CATALOG_EVENTS.BACK_TO_CATALOG_CLICKED, {
      href: agentsCatalogUrl(),
      type: 'internal',
      section: 'Agent Catalog Details',
      name: AGENTS_CATALOG_TITLE,
    });
  });
});
