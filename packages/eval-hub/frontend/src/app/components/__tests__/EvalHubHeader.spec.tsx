import * as React from 'react';
import { render, screen } from '@testing-library/react';
import EvalHubHeader from '../EvalHubHeader';

describe('EvalHubHeader', () => {
  it('should render the provided title', () => {
    render(<EvalHubHeader title="Evaluations" />);
    expect(screen.getByText('Evaluations')).toBeInTheDocument();
  });

  it('should render the icon container', () => {
    const { container } = render(<EvalHubHeader title="Test Title" />);
    const iconContainer = container.querySelector('svg');
    expect(iconContainer).toBeInTheDocument();
  });

  it('should render with a different title', () => {
    render(<EvalHubHeader title="Custom Title" />);
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
  });
});
