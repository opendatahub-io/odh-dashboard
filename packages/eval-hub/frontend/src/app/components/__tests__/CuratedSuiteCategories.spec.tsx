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
    expect(screen.getByText('Browse curated benchmark suites')).toBeInTheDocument();
    expect(
      screen.getByText('Pick a category and customize a suite for your own collection.'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('curated-suite-category-card-agents')).toBeInTheDocument();
    expect(screen.getByTestId('curated-suite-category-card-models')).toBeInTheDocument();
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
    expect(screen.getByTestId('curated-suite-category-card-agents')).toHaveAttribute(
      'href',
      '/evaluation/test-project/collections/agent',
    );
  });
});
