import React from 'react';
import { render, screen } from '@testing-library/react';
import FeatureStoreLineageComponent from '../FeatureStoreLineageComponent';
import useFeatureStoreLineage from '../../../apiHooks/useFeatureStoreLineage';
import useFeatureViewLineage from '../../../apiHooks/useFeatureViewLineage';

jest.mock('@odh-dashboard/internal/components/lineage/Lineage', () => ({
  Lineage: ({ data, loading }: { data: { nodes: unknown[] }; loading: boolean }) => (
    <div data-testid="lineage-mock">
      {loading ? 'loading' : 'loaded'}-{data.nodes.length}
    </div>
  ),
}));

jest.mock('@odh-dashboard/internal/components/lineage/factories', () => ({
  createLineageComponentFactory: jest.fn(() => jest.fn()),
}));

jest.mock('@odh-dashboard/internal/components/lineage/context/LineageCenterContext', () => ({
  useLineageCenter: () => ({
    triggerCenter: jest.fn(),
    forceCenter: false,
  }),
}));

jest.mock('../node/FeatureStoreLineageNode', () => () => null);
jest.mock('../node/FeatureStoreLineageNodePopover', () => () => null);
jest.mock('../../../components/FeatureStoreLineageToolbar', () => () => null);

jest.mock('../../../apiHooks/useFeatureStoreLineage');
jest.mock('../../../apiHooks/useFeatureViewLineage');

jest.mock('../utils', () => ({
  applyLineageFilters: jest.fn((data) => data),
}));

jest.mock('../../../utils/lineageDataConverter', () => ({
  convertFeatureStoreLineageToVisualizationData: jest.fn(() => ({
    nodes: [{ id: 'store-node' }],
    edges: [],
  })),
  convertFeatureViewLineageToVisualizationData: jest.fn(() => ({
    nodes: [{ id: 'view-node' }],
    edges: [],
  })),
}));

const mockedUseFeatureStoreLineage = useFeatureStoreLineage as jest.MockedFunction<
  typeof useFeatureStoreLineage
>;
const mockedUseFeatureViewLineage = useFeatureViewLineage as jest.MockedFunction<
  typeof useFeatureViewLineage
>;

describe('FeatureStoreLineageComponent', () => {
  beforeEach(() => {
    mockedUseFeatureStoreLineage.mockReturnValue({
      data: { objects: {}, relationships: [] } as never,
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });
    mockedUseFeatureViewLineage.mockReturnValue({
      data: { relationships: [] } as never,
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });
  });

  it('renders empty state when project is missing', () => {
    render(<FeatureStoreLineageComponent />);
    expect(screen.getByTestId('empty-state-title')).toBeInTheDocument();
  });

  it('renders lineage using feature store lineage hook when project is provided', () => {
    render(<FeatureStoreLineageComponent project="demo-project" />);
    expect(mockedUseFeatureStoreLineage).toHaveBeenCalledWith('demo-project');
    expect(screen.getByTestId('lineage-mock')).toHaveTextContent('loaded-1');
  });

  it('uses feature view lineage hook when featureViewName is provided', () => {
    render(<FeatureStoreLineageComponent project="demo-project" featureViewName="fv-a" />);
    expect(mockedUseFeatureViewLineage).toHaveBeenCalledWith('demo-project', 'fv-a');
    expect(screen.getByTestId('lineage-mock')).toBeInTheDocument();
  });
});
