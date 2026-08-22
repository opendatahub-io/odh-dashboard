import React from 'react';
import { render, screen } from '@testing-library/react';
import FeatureStoreLineageLegend from '../FeatureStoreLineageLegend';
import { LINEAGE_OBJECT_TYPE_LEGEND } from '../../utils/featureStoreObjects';

describe('FeatureStoreLineageLegend', () => {
  it('renders all four object type labels', () => {
    render(<FeatureStoreLineageLegend />);

    LINEAGE_OBJECT_TYPE_LEGEND.forEach(({ label, type }) => {
      expect(screen.getByText(label)).toBeInTheDocument();
      expect(screen.getByTestId(`feature-store-lineage-legend-${type}`)).toBeInTheDocument();
    });
  });

  it('exposes list semantics for legend items', () => {
    render(<FeatureStoreLineageLegend />);

    expect(screen.getByRole('list', { name: 'Lineage object type legend' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(LINEAGE_OBJECT_TYPE_LEGEND.length);
  });
});
