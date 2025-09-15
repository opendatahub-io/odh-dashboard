import React from 'react';
import { Flex, FlexItem } from '@patternfly/react-core';
import { GlobalSearchInput } from './FeatureStoreGlobalSearch/GlobalSearchInput';
import { useFeatureStoreSearch } from '../apiHooks/useFeatureStoreSearch';

interface FeatureStorePageTitleProps {
  title?: string;
  breadcrumb?: React.ReactNode;
  isDetailsPage?: boolean;
}

const FeatureStorePageTitle: React.FC<FeatureStorePageTitleProps> = ({
  title,
  breadcrumb,
  isDetailsPage,
}) => {
  const {
    convertedSearchData,
    isSearching,
    isLoadingMore,
    hasMorePages,
    totalCount,
    handleSearchChange,
    loadMoreResults,
    clearSearch,
  } = useFeatureStoreSearch();

  const searchComponent = React.useMemo(() => {
    return (
      <GlobalSearchInput
        data={convertedSearchData}
        placeholder="Search resources by name or description."
        ariaLabel="Search resources by name or description."
        isLoading={isSearching}
        isLoadingMore={isLoadingMore}
        hasMorePages={hasMorePages}
        totalCount={totalCount}
        onSearchChange={handleSearchChange}
        onLoadMore={loadMoreResults}
        onClear={clearSearch}
        isDetailsPage={isDetailsPage}
      />
    );
  }, [
    convertedSearchData,
    isSearching,
    isLoadingMore,
    hasMorePages,
    totalCount,
    handleSearchChange,
    loadMoreResults,
    clearSearch,
    isDetailsPage,
  ]);

  return (
    <div style={{ width: '100%' }}>
      <Flex
        direction={{ default: 'column', md: 'row' }}
        justifyContent={{ default: 'justifyContentSpaceBetween' }}
        alignItems={{ default: 'alignItemsStretch', md: 'alignItemsCenter' }}
        rowGap={{ default: 'rowGapMd', md: 'rowGapNone' }}
      >
        {title && <FlexItem flex={{ default: 'flex_1', md: 'flexNone' }}>{title}</FlexItem>}
        {breadcrumb && (
          <FlexItem flex={{ default: 'flex_1', md: 'flexNone' }}>{breadcrumb}</FlexItem>
        )}
        <FlexItem flex={{ default: 'flex_1', md: 'flexNone' }}>{searchComponent}</FlexItem>
      </Flex>
    </div>
  );
};

export default FeatureStorePageTitle;
