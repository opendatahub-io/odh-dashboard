/* eslint-disable camelcase */
import * as React from 'react';
import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { setupTrackingTest } from '~/__tests__/unit/testUtils/setupTrackingTest';
import CuratedSuiteCategories from '~/app/components/CuratedSuiteCategories';

import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';

const { mockTrackEvent, render } = setupTrackingTest();

const renderSection = () =>
  render(
    <MemoryRouter>
      <CuratedSuiteCategories namespace="test-project" />
    </MemoryRouter>,
  );

describe('CuratedSuiteCategories', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render supported curated suite category cards', () => {
    renderSection();

    expect(screen.getByTestId('curated-suite-categories')).toBeInTheDocument();
    expect(screen.queryByTestId('curated-suite-categories-logo')).not.toBeInTheDocument();
    expect(screen.getByText('Red Hat validated collections')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Explore collections validated by Red Hat for evaluating models and agents.',
      ),
    ).toBeInTheDocument();
    // TEMP: Keep model-only behavior until EvalHub supports more evaluation_targets; restore this code when support is added.
    /*
    expect(screen.getByTestId('curated-suite-category-card-agents')).toBeInTheDocument();
    */
    expect(screen.getByTestId('curated-suite-category-card-models')).toBeInTheDocument();
    expect(screen.queryByTestId('curated-suite-category-card-agents')).not.toBeInTheDocument();
    // TEMP: Keep model-only behavior until EvalHub supports more evaluation_targets; restore this code when support is added.
    /*
    expect(screen.getByTestId('curated-suite-category-card-agents')).toHaveAttribute(
      'href',
      '/evaluation/test-project/collections/agent',
    );
    */
    expect(screen.queryByTestId('curated-suite-category-card-agents')).not.toBeInTheDocument();
    expect(screen.queryByTestId('curated-suite-category-card-traces')).not.toBeInTheDocument();
    expect(screen.queryByTestId('curated-suite-category-card-guardrails')).not.toBeInTheDocument();
    expect(screen.queryByTestId('curated-suite-category-card-agent-tools')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('curated-suite-category-card-agent-skills'),
    ).not.toBeInTheDocument();
  });

  it('should link category cards to the matching curated benchmark suites page', () => {
    renderSection();

    expect(screen.getByTestId('curated-suite-category-card-models')).toHaveAttribute(
      'href',
      '/evaluation/test-project/collections/model',
    );
    // TEMP: Keep model-only behavior until EvalHub supports more evaluation_targets; restore this code when support is added.
    /*
    expect(screen.getByTestId('curated-suite-category-card-agents')).toHaveAttribute(
      'href',
      '/evaluation/test-project/collections/agent',
    );
    */
    expect(screen.queryByTestId('curated-suite-category-card-agents')).not.toBeInTheDocument();
  });

  it('should track selecting a curated suite category', () => {
    renderSection();

    screen.getByTestId('curated-suite-category-card-models').click();

    expect(mockTrackEvent).toHaveBeenCalledWith(
      EVAL_HUB_EVENTS.COLLECTION_CATEGORY_SELECTED,
      {
        event_source: 'evalhub_ui',
        collection_type: 'unknown',
        provider_type: 'unknown',
        categoryId: 'models',
        evaluationTarget: 'model',
        surface: 'my_benchmark_suites',
      },
      expect.objectContaining({ pageContextPolicy: expect.any(Function) }),
    );
  });
});
