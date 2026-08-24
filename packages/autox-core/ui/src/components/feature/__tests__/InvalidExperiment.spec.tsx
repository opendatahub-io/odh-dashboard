import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import InvalidExperiment from '../InvalidExperiment';

describe('InvalidExperiment', () => {
  it('renders the product-specific not-found message', () => {
    render(<InvalidExperiment productName="AutoML" />);

    expect(screen.getByRole('heading', { name: 'Experiment not found' })).toBeInTheDocument();
    expect(screen.getByText('The AutoML experiment was not found.')).toBeInTheDocument();
  });

  it('substitutes a different product name', () => {
    render(<InvalidExperiment productName="AutoRAG" />);

    expect(screen.getByText('The AutoRAG experiment was not found.')).toBeInTheDocument();
  });
});
