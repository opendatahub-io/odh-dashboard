import React from 'react';
import { Flex, FlexItem } from '@patternfly/react-core';
import { GlobalSearchInput } from './FeatureStoreGlobalSearch/GlobalSearchInput';
import { useFeatureStoreSearch } from '../apiHooks/useFeatureStoreSearch';

interface FeatureStorePageTitleProps {
  title: string;
  currentProject?: string;
}

const FeatureStorePageTitle: React.FC<FeatureStorePageTitleProps> = ({ title, currentProject }) => {
  const {
    convertedSearchData,
    isSearching,
    isLoadingMore,
    hasMorePages,
    totalCount,
    handleSearchChange,
    loadMoreResults,
    clearSearch,
  } = useFeatureStoreSearch({
    currentProject,
  });

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
        project={currentProject}
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
    currentProject,
  ]);

  return (
    <div style={{ width: '100%' }}>
      <Flex
        direction={{ default: 'column', md: 'row' }}
        justifyContent={{
          default: 'justifyContentFlexStart',
          md: 'justifyContentSpaceBetween',
        }}
        alignItems={{ default: 'alignItemsStretch', md: 'alignItemsCenter' }}
        rowGap={{ default: 'rowGapMd', md: 'rowGapNone' }}
      >
        <FlexItem flex={{ default: 'flex_1', md: 'flexNone' }}>{title}</FlexItem>
        <FlexItem flex={{ default: 'flex_1', md: 'flexNone' }}>{searchComponent}</FlexItem>
      </Flex>
    </div>
  );
};

export default FeatureStorePageTitle;
