import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  CollectionsContextProvider,
  useCollectionsContext,
} from '~/app/context/CollectionsContext';
import { COLLECTION_FETCH_LIMIT } from '~/app/utilities/const';

const mockUseCollectionsQuery = jest.fn();

jest.mock('~/app/hooks/collections', () => ({
  useCollectionsQuery: (...args: unknown[]) => mockUseCollectionsQuery(...args),
}));

const ContextConsumer: React.FC = () => {
  const { loaded } = useCollectionsContext();
  return <span data-testid="collections-loaded">{String(loaded)}</span>;
};

describe('CollectionsContextProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCollectionsQuery.mockReturnValue({
      data: { items: [] },
      isSuccess: true,
      error: null,
      refetch: jest.fn(),
    });
  });

  it('should fetch the unfiltered shared collection set', () => {
    render(
      <MemoryRouter initialEntries={['/evaluations?scope=curated&domains=safety']}>
        <CollectionsContextProvider namespace="test-ns">
          <ContextConsumer />
        </CollectionsContextProvider>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('collections-loaded')).toHaveTextContent('true');
    expect(mockUseCollectionsQuery).toHaveBeenCalledWith(
      'test-ns',
      undefined,
      COLLECTION_FETCH_LIMIT,
    );
  });
});
