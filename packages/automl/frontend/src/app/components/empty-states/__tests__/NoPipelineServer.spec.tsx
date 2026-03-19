import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import NoPipelineServer from '~/app/components/empty-states/NoPipelineServer';

describe('NoPipelineServer', () => {
  it('should render title', () => {
    render(<NoPipelineServer />);

    expect(
      screen.getByRole('heading', { name: 'No Pipeline Server in this namespace' }),
    ).toBeInTheDocument();
  });

  it('should render body text without namespace when namespace is not provided', () => {
    render(<NoPipelineServer />);

    expect(
      screen.getByText(
        'No Data Science Pipelines (DSPipelineApplication) was found. Install Data Science Pipelines in your project to use AutoML experiments.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/or select a different project/)).not.toBeInTheDocument();
  });

  it('should render body text with namespace when namespace is provided', () => {
    render(<NoPipelineServer namespace="my-project" />);

    expect(
      screen.getByText(
        /No Data Science Pipelines \(DSPipelineApplication\) was found in namespace/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('my-project')).toBeInTheDocument();
    expect(
      screen.getByText(/Install Data Science Pipelines in your project to use AutoML experiments/),
    ).toBeInTheDocument();
    expect(screen.getByText(/or select a different project/)).toBeInTheDocument();
  });
});
