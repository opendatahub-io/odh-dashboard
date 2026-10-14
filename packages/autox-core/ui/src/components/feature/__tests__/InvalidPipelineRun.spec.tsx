import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import InvalidPipelineRun from '../InvalidPipelineRun';

describe('InvalidPipelineRun', () => {
  it('renders the product-specific not-found message', () => {
    render(<InvalidPipelineRun productName="AutoML" />);

    expect(screen.getByRole('heading', { name: 'Run not found' })).toBeInTheDocument();
    expect(screen.getByText('The AutoML pipeline run was not found.')).toBeInTheDocument();
  });

  it('substitutes a different product name', () => {
    render(<InvalidPipelineRun productName="AutoRAG" />);

    expect(screen.getByText('The AutoRAG pipeline run was not found.')).toBeInTheDocument();
  });
});
