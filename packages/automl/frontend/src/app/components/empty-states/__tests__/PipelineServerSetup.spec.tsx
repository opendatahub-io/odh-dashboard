import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import PipelineServerSetup from '~/app/components/empty-states/PipelineServerSetup';

jest.mock('@odh-dashboard/autox-core/ui/components/feature', () => ({
  PipelineServerSetup: ({
    config,
  }: {
    config: { productName: string; detailsRoute: (namespace?: string) => string };
  }) => (
    <div>
      <span data-testid="product-name">{config.productName}</span>
      <span data-testid="details-route">{config.detailsRoute('test-project')}</span>
    </div>
  ),
}));

describe('AutoML PipelineServerSetup', () => {
  it('should inject AutoML text and the pipeline details route into the shared feature', () => {
    render(
      <MemoryRouter>
        <PipelineServerSetup namespace="test-project" />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('product-name')).toHaveTextContent('AutoML');
    expect(screen.getByTestId('details-route')).toHaveTextContent(
      '/develop-train/pipelines/definitions/test-project',
    );
  });
});
