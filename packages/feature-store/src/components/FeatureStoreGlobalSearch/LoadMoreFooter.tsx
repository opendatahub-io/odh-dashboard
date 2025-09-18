import React from 'react';
import { MenuItem, Button, Flex, FlexItem, Badge } from '@patternfly/react-core';

interface LoadMoreFooterProps {
  hasMorePages: boolean;
  isLoading: boolean;
  currentCount: number;
  totalCount: number;
  onLoadMore: () => Promise<void>;
}

const LoadMoreFooter: React.FC<LoadMoreFooterProps> = ({
  hasMorePages,
  isLoading,
  currentCount,
  totalCount,
  onLoadMore,
}) => {
  if (!hasMorePages) {
    return null;
  }

  const handleLoadMore = () => {
    onLoadMore().catch((error) => {
      console.error('Load more failed:', error);
    });
  };

  return (
    <MenuItem component="div">
      <div
        style={{
          textAlign: 'center',
          padding: '1rem',
          width: '100%',
        }}
      >
        <Flex
          spaceItems={{ default: 'spaceItemsSm' }}
          justifyContent={{ default: 'justifyContentCenter' }}
          alignItems={{ default: 'alignItemsCenter' }}
        >
          <FlexItem>
            <Button variant="link" isLoading={isLoading} onClick={handleLoadMore} size="sm">
              Load more results
            </Button>
          </FlexItem>
          {!isLoading && (
            <FlexItem>
              <Badge isRead>{`Showing ${currentCount}/${totalCount}`}</Badge>
            </FlexItem>
          )}
        </Flex>
      </div>
    </MenuItem>
  );
};

export default LoadMoreFooter;
