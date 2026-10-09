import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CuratedSuiteCategories from '~/app/components/CuratedSuiteCategories';

const renderSection = () =>
  render(
    <MemoryRouter>
      <CuratedSuiteCategories namespace="test-project" />
    </MemoryRouter>,
  );

describe('CuratedSuiteCategories', () => {
  it('should render supported curated suite category cards', () => {
    renderSection();

    expect(screen.getByTestId('curated-suite-categories')).toBeInTheDocument();
    expect(screen.queryByTestId('curated-suite-categories-logo')).not.toBeInTheDocument();
    expect(screen.getByText('Red Hat validated benchmark suites')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Explore benchmark suites validated by Red Hat for evaluating models and agents.',
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
});
