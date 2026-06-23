/* eslint-disable camelcase */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Drawer, DrawerContent } from '@patternfly/react-core';
import PlaygroundDrawerPanel from '~/app/components/run-results/PlaygroundDrawerPanel';
import type { AutoragPattern, ResponsesTemplate } from '~/app/types/autoragPattern';
import type { PlaygroundPatternInfo } from '~/app/components/run-results/PlaygroundDrawerPanel';
import {
  AutoragResultsContext,
  type AutoragResultsContextProps,
} from '~/app/context/AutoragResultsContext';

jest.mock('~/app/components/EmbeddedPlayground', () => {
  const MockPlayground: React.FC = () => (
    <div data-testid="mock-embedded-playground">Playground</div>
  );
  return { __esModule: true, default: MockPlayground };
});

const mockTemplate: ResponsesTemplate = {
  model: 'test-model',
  stream: true,
  store: false,
  input: [
    {
      type: 'message',
      role: 'user',
      content: [{ type: 'input_text', text: '<user_query_placeholder>' }],
    },
  ],
  metadata: { autorag_run_id: 'run-1', rag_pattern_name: 'pattern_a' },
  instructions: 'Be helpful.',
  tools: [
    {
      type: 'file_search',
      vector_store_ids: ['vs-1'],
      max_num_results: 5,
      ranking_options: {
        search_mode: 'hybrid',
        ranker_strategy: 'rrf',
        ranker_k: 60,
        ranker_alpha: 0.5,
      },
    },
  ],
  tool_choice: { type: 'file_search' },
  include: ['file_search_call.results'],
};

const mockPatternInfo: PlaygroundPatternInfo = {
  patternName: 'pattern_a',
  modelId: 'test-model',
  optimizedMetricName: 'Accuracy',
  optimizedMetricValue: 0.95,
  chunkMethod: 'semantic',
};

const mockPatterns: Record<string, AutoragPattern> = {
  pattern_a: {
    settings: { responses_template: mockTemplate } as AutoragPattern['settings'],
    scores: {},
  } as AutoragPattern,
  pattern_b: {
    settings: { responses_template: mockTemplate } as AutoragPattern['settings'],
    scores: {},
  } as AutoragPattern,
  pattern_no_template: {
    settings: {} as AutoragPattern['settings'],
    scores: {},
  } as AutoragPattern,
};

const mockContextValue: AutoragResultsContextProps = {
  patterns: mockPatterns,
  parameters: { ogx_secret_name: 'test-secret' },
};

const defaultProps = {
  namespace: 'test-ns',
  secretName: 'test-secret',
  responsesTemplate: mockTemplate,
  patternInfo: mockPatternInfo,
  patterns: mockPatterns,
  onClose: jest.fn(),
  onSelectPattern: jest.fn(),
  onViewCode: jest.fn(),
};

const renderInDrawer = (props = defaultProps) =>
  render(
    <AutoragResultsContext.Provider value={mockContextValue}>
      <Drawer isExpanded>
        <DrawerContent panelContent={<PlaygroundDrawerPanel {...props} />}>
          <div>Main content</div>
        </DrawerContent>
      </Drawer>
    </AutoragResultsContext.Provider>,
  );

describe('PlaygroundDrawerPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the drawer panel', () => {
    renderInDrawer();

    expect(screen.getByTestId('playground-drawer-panel')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    renderInDrawer();

    fireEvent.click(screen.getByTestId('playground-drawer-close'));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onViewCode when View Code button is clicked', () => {
    renderInDrawer();

    fireEvent.click(screen.getByTestId('playground-view-code-button'));
    expect(defaultProps.onViewCode).toHaveBeenCalledWith('pattern_a');
  });

  it('should render the pattern select toggle', () => {
    renderInDrawer();

    expect(screen.getByTestId('playground-pattern-select')).toBeInTheDocument();
  });

  it('should format numeric metric values to 2 decimal places', () => {
    renderInDrawer();

    expect(screen.getByText('0.95')).toBeInTheDocument();
  });

  it('should display string metric values as-is', () => {
    renderInDrawer({
      ...defaultProps,
      patternInfo: { ...mockPatternInfo, optimizedMetricValue: 'N/A' },
    });

    expect(screen.getByText('N/A')).toBeInTheDocument();
  });
});
