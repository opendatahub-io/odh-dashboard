import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import PipelineServerNotReady from '~/app/components/empty-states/PipelineServerNotReady';

describe('PipelineServerNotReady', () => {
  it('should render title', () => {
    render(<PipelineServerNotReady />);

    expect(
      screen.getByRole('heading', { name: 'Pipeline Server is not ready' }),
    ).toBeInTheDocument();
  });

  it('should render body text without namespace when namespace is not provided', () => {
    render(<PipelineServerNotReady />);

    expect(
      screen.getByText(
        'Data Science Pipelines exists but is not ready yet. Check that the APIServer component is running in your project.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/or select a different project/)).not.toBeInTheDocument();
  });

  it('should render body text with namespace when namespace is provided', () => {
    render(<PipelineServerNotReady namespace="my-project" />);

    expect(screen.getByText(/Data Science Pipelines exists in namespace/)).toBeInTheDocument();
    expect(screen.getByText('my-project')).toBeInTheDocument();
    expect(screen.getByText(/Check that the APIServer component is running/)).toBeInTheDocument();
    expect(screen.getByText(/or select a different project/)).toBeInTheDocument();
  });
});
