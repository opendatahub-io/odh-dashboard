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
  it('should render all curated suite category cards', () => {
    renderSection();

    expect(screen.getByTestId('curated-suite-categories')).toBeInTheDocument();
    expect(screen.getByText('Red Hat curated suites to save as your own')).toBeInTheDocument();
    expect(screen.getByTestId('curated-suite-category-card-agents')).toBeInTheDocument();
    expect(screen.getByTestId('curated-suite-category-card-models')).toBeInTheDocument();
    expect(screen.getByTestId('curated-suite-category-card-traces')).toBeInTheDocument();
    expect(screen.getByTestId('curated-suite-category-card-guardrails')).toBeInTheDocument();
    expect(screen.getByTestId('curated-suite-category-card-agent-tools')).toBeInTheDocument();
    expect(screen.getByTestId('curated-suite-category-card-agent-skills')).toBeInTheDocument();
  });

  it('should link category cards to curated collection filters', () => {
    renderSection();

    expect(screen.getByTestId('curated-suite-category-card-models')).toHaveAttribute(
      'href',
      '/evaluation/test-project/create/collections?scope=curated&ai_entities=model',
    );
    expect(screen.getByTestId('curated-suite-category-card-agent-tools')).toHaveAttribute(
      'href',
      '/evaluation/test-project/create/collections?scope=curated&domains=agent_tools',
    );
  });
});
