import * as React from 'react';
import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateVariant,
  Gallery,
  GalleryItem,
  MenuToggle,
  Pagination,
  SearchInput,
  Select,
  SelectList,
  SelectOption,
  Spinner,
  StackItem,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { ExclamationCircleIcon, FilterIcon, SearchIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import type { MenuToggleElement } from '@patternfly/react-core';
import { mockCuratedBenchmarkSuiteCollections } from '~/app/mockBenchmarkSuiteCollections';
import { useCollectionsQuery, useDeleteCollectionMutation } from '~/app/hooks/collections';
import { useNotification } from '~/app/hooks/useNotification';
import { evaluationBenchmarkSuitesRoute } from '~/app/routes';
import BenchmarkSuiteCard from '~/app/components/BenchmarkSuiteCard';
import type { BenchmarkSuiteCardAction } from '~/app/components/BenchmarkSuiteCard';
import CreateBenchmarkSuiteCard from '~/app/components/CreateBenchmarkSuiteCard';
import DeleteConfirmationModal from '~/app/components/DeleteConfirmationModal';
import type { Collection, CollectionFilterParams, CollectionScope } from '~/app/types';
import { formatCategory, getCollectionCategoryValues } from '~/app/components/benchmarkUtils';
import { COLLECTION_FETCH_LIMIT } from '~/app/utilities/const';
import './BenchmarkSuitesGallery.scss';

// TODO: Remove this curated mock fallback once the curated collections API is available.
const DEFAULT_PAGE_SIZE = 6;
const PAGE_SIZE_OPTIONS = [6, 12, 24];
// These are the collection fields that can provide values for the filter dropdowns.
type CollectionFilterField = 'domains' | 'ai_entities' | 'industries';

type CollectionFilterOptions = {
  categories: string[];
  evaluatesTypes: string[];
  industries: string[];
};

const EMPTY_COLLECTION_FILTER_OPTIONS: CollectionFilterOptions = {
  categories: [],
  evaluatesTypes: [],
  industries: [],
};

const mergeFilterOptions = (previous: string[], next: string[]): string[] =>
  [...new Set([...previous, ...next])].toSorted();

const areStringArraysEqual = (first: string[], second: string[]): boolean =>
  first.length === second.length && first.every((value, index) => value === second[index]);

type CollectionFilterSelectProps = {
  categoryName: string;
  allLabel: string;
  allOptionLabel?: string;
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
  isDisabled?: boolean;
  testId: string;
};

const CollectionFilterSelect: React.FC<CollectionFilterSelectProps> = ({
  categoryName,
  allLabel,
  allOptionLabel = allLabel,
  options,
  selected,
  onSelect,
  isDisabled = false,
  testId,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Select
      isOpen={isOpen}
      selected={selected}
      onSelect={(_event, value) => {
        if (typeof value === 'string') {
          onSelect(value);
        }
        setIsOpen(false);
      }}
      onOpenChange={setIsOpen}
      toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
        <MenuToggle
          ref={toggleRef}
          icon={<FilterIcon />}
          isExpanded={isOpen}
          isDisabled={isDisabled}
          onClick={() => setIsOpen((open) => !open)}
          aria-label={`${categoryName} filter`}
          data-testid={testId}
        >
          {selected ? formatCategory(selected) : allLabel}
        </MenuToggle>
      )}
      data-testid={`${testId}-select`}
    >
      <SelectList>
        <SelectOption value="" isSelected={!selected} data-testid={`${testId}-option-all`}>
          {allOptionLabel}
        </SelectOption>
        {options.map((option) => (
          <SelectOption
            key={option}
            value={option}
            isSelected={selected === option}
            data-testid={`${testId}-option-${option}`}
          >
            {formatCategory(option)}
          </SelectOption>
        ))}
      </SelectList>
    </Select>
  );
};

/**
 * Reads the values for a filter from one collection. Category is the canonical value; domains are
 * used as a fallback for responses that do not provide category.
 */
const getCollectionFieldValues = (
  collection: Collection,
  field: CollectionFilterField,
): string[] => {
  if (field === 'domains') {
    return getCollectionCategoryValues(collection);
  }

  return collection[field] ?? [];
};

/**
 * Builds a dropdown's options from all values returned by the collections. Set removes duplicates,
 * and sorting keeps the menu order stable between renders.
 */
const getAvailableFilterOptions = (
  collections: Collection[],
  field: CollectionFilterField,
): string[] =>
  [
    ...new Set(collections.flatMap((collection) => getCollectionFieldValues(collection, field))),
  ].toSorted();

type BenchmarkSuitesGalleryProps = {
  namespace: string;
  maxVisibleCollections?: number;
  showSummary?: boolean;
  showCreateSuiteCard?: boolean;
  showFilters?: boolean;
  showEvaluatesFilter?: boolean;
  showPagination?: boolean;
  showContextualActions?: boolean;
  scope?: CollectionScope;
  queryFilters?: CollectionFilterParams;
  primaryActionLabel?: string;
  primaryActionRoute?: (collection: Collection) => string;
  primaryActionState?: unknown;
  // TODO: Remove this temporary switch once curated collections use the API.
  useMockFallback?: boolean;
  createSuiteRoute?: string;
  onCreateSuite?: () => void;
  onPrimaryAction: (collection: Collection) => void;
  onDuplicateCollection: (collection: Collection) => void;
  onSelectCollection: (collection: Collection) => void;
};

const BenchmarkSuitesGallery: React.FC<BenchmarkSuitesGalleryProps> = ({
  namespace,
  maxVisibleCollections,
  showSummary = false,
  showCreateSuiteCard = true,
  showFilters = false,
  showEvaluatesFilter = true,
  showPagination = false,
  showContextualActions = true,
  scope = 'tenant',
  queryFilters,
  primaryActionLabel = 'Run benchmark suite',
  primaryActionRoute,
  primaryActionState,
  useMockFallback = false,
  createSuiteRoute,
  onCreateSuite,
  onPrimaryAction,
  onDuplicateCollection,
  onSelectCollection,
}) => {
  const [nameFilter, setNameFilter] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState('');
  const [evaluatesFilter, setEvaluatesFilter] = React.useState('');
  const [industryFilter, setIndustryFilter] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(DEFAULT_PAGE_SIZE);
  const [collectionToDelete, setCollectionToDelete] = React.useState<Collection | null>(null);
  const notification = useNotification();
  const queryFiltersKey = React.useMemo(
    () =>
      [
        queryFilters?.domains?.join(',') ?? '',
        queryFilters?.industries?.join(',') ?? '',
        queryFilters?.aiEntities?.join(',') ?? '',
      ].join('|'),
    [queryFilters],
  );
  const [filterOptions, setFilterOptions] = React.useState(EMPTY_COLLECTION_FILTER_OPTIONS);
  const filterOptionsKey = `${namespace}|${scope}|${queryFiltersKey}`;
  const previousFilterOptionsKey = React.useRef(filterOptionsKey);
  const isClientSideFiltering =
    showPagination &&
    Boolean(nameFilter.trim() || categoryFilter || evaluatesFilter || industryFilter);
  const queryLimit = showPagination
    ? isClientSideFiltering
      ? COLLECTION_FETCH_LIMIT
      : pageSize
    : maxVisibleCollections;
  const queryOffset = showPagination && !isClientSideFiltering ? (page - 1) * pageSize : undefined;
  // Keep route-level filters such as the curated agent/model selection on the API request.
  // User-selected gallery filters are applied locally against the full fetched collection set so
  // the gallery does not depend on classification query parameters supported by the backend.
  const { data, isLoading, isFetching, error, refetch } = useCollectionsQuery(
    namespace,
    scope,
    queryLimit,
    scope === 'curated' ? 'curation_order' : undefined,
    queryFilters,
    queryOffset,
  );
  const {
    isPending: isDeleting,
    mutateAsync: deleteCollection,
    reset: resetDeleteMutation,
  } = useDeleteCollectionMutation(namespace);
  const apiItems = data?.items;
  const apiCollections = React.useMemo(() => apiItems ?? [], [apiItems]);
  const hasApiCollections = apiCollections.length > 0;
  const mockAiEntity = queryFilters?.aiEntities?.[0];
  const mockCollections = React.useMemo(
    () =>
      scope === 'curated' && (mockAiEntity === 'agent' || mockAiEntity === 'model')
        ? mockCuratedBenchmarkSuiteCollections(mockAiEntity)
        : [],
    [mockAiEntity, scope],
  );
  // When mock fallback is enabled, keep the gallery usable while the backing API is unavailable.
  // Real-API entry points disable this fallback so they still show the error state.
  const shouldShowLoadError = Boolean(error) && !useMockFallback;
  // TODO: Remove the mock fallback and this switch once the collections API is the source of
  // truth for every benchmark suite gallery.
  const isUsingMockCollections = useMockFallback && !isLoading && Boolean(error);
  const collections = React.useMemo(() => {
    if (shouldShowLoadError || isLoading) {
      return [];
    }
    if (isUsingMockCollections) {
      return mockCollections;
    }
    return apiCollections;
  }, [apiCollections, isLoading, isUsingMockCollections, mockCollections, shouldShowLoadError]);
  const sourceCollections = React.useMemo(
    () => (maxVisibleCollections ? collections.slice(0, maxVisibleCollections) : collections),
    [collections, maxVisibleCollections],
  );
  const totalCount = hasApiCollections
    ? (data?.total_count ?? collections.length)
    : collections.length;

  // All filter dropdowns use the same helper so their options stay in sync with the collection
  // fields returned by the API or the temporary mock fallback.
  const availableCategories = React.useMemo(
    () => getAvailableFilterOptions(sourceCollections, 'domains'),
    [sourceCollections],
  );
  const availableEvaluatesTypes = React.useMemo(
    () => getAvailableFilterOptions(sourceCollections, 'ai_entities'),
    [sourceCollections],
  );
  const availableIndustries = React.useMemo(
    () => getAvailableFilterOptions(sourceCollections, 'industries'),
    [sourceCollections],
  );
  React.useEffect(() => {
    setFilterOptions((previous) => {
      const next = {
        categories: mergeFilterOptions(previous.categories, availableCategories),
        evaluatesTypes: mergeFilterOptions(previous.evaluatesTypes, availableEvaluatesTypes),
        industries: mergeFilterOptions(previous.industries, availableIndustries),
      };

      if (
        areStringArraysEqual(previous.categories, next.categories) &&
        areStringArraysEqual(previous.evaluatesTypes, next.evaluatesTypes) &&
        areStringArraysEqual(previous.industries, next.industries)
      ) {
        return previous;
      }

      return next;
    });
  }, [availableCategories, availableEvaluatesTypes, availableIndustries]);

  React.useEffect(() => {
    if (previousFilterOptionsKey.current === filterOptionsKey) {
      return;
    }
    previousFilterOptionsKey.current = filterOptionsKey;
    setFilterOptions(EMPTY_COLLECTION_FILTER_OPTIONS);
  }, [filterOptionsKey]);

  const categoryOptions = React.useMemo(
    () => mergeFilterOptions(filterOptions.categories, availableCategories),
    [availableCategories, filterOptions.categories],
  );
  const evaluatesOptions = React.useMemo(
    () => mergeFilterOptions(filterOptions.evaluatesTypes, availableEvaluatesTypes),
    [availableEvaluatesTypes, filterOptions.evaluatesTypes],
  );
  const industryOptions = React.useMemo(
    () => mergeFilterOptions(filterOptions.industries, availableIndustries),
    [availableIndustries, filterOptions.industries],
  );

  const filteredCollections = React.useMemo(() => {
    const normalizedNameFilter = nameFilter.trim().toLowerCase();

    return sourceCollections.filter((collection) => {
      if (normalizedNameFilter && !collection.name.toLowerCase().includes(normalizedNameFilter)) {
        return false;
      }
      if (
        categoryFilter &&
        !getCollectionFieldValues(collection, 'domains').includes(categoryFilter)
      ) {
        return false;
      }
      if (
        evaluatesFilter &&
        !getCollectionFieldValues(collection, 'ai_entities').includes(evaluatesFilter)
      ) {
        return false;
      }
      if (
        industryFilter &&
        !getCollectionFieldValues(collection, 'industries').includes(industryFilter)
      ) {
        return false;
      }
      return true;
    });
  }, [categoryFilter, evaluatesFilter, industryFilter, nameFilter, sourceCollections]);

  // Mock data, name searches, and classification-filtered results are loaded in full, so they
  // need local slicing. Otherwise, API responses are already limited to the requested page.
  const shouldUseClientSidePagination = isUsingMockCollections || isClientSideFiltering;
  const visibleCollections = showPagination
    ? shouldUseClientSidePagination
      ? filteredCollections.slice((page - 1) * pageSize, page * pageSize)
      : filteredCollections.slice(0, pageSize)
    : sourceCollections;
  // TODO: Remove the mock count branch when mock collections are no longer needed and always use
  // the API total_count for pagination.
  const filteredCollectionCount = showPagination
    ? shouldUseClientSidePagination
      ? filteredCollections.length
      : (data?.total_count ?? filteredCollections.length)
    : totalCount;
  const hasActiveFilters = Boolean(
    nameFilter || categoryFilter || evaluatesFilter || industryFilter,
  );
  const areFiltersDisabled =
    shouldShowLoadError || (!isLoading && sourceCollections.length === 0 && !hasActiveFilters);
  const isRefreshing = isFetching && !isLoading;

  React.useEffect(() => {
    setPage(1);
  }, [
    categoryFilter,
    evaluatesFilter,
    industryFilter,
    maxVisibleCollections,
    nameFilter,
    namespace,
  ]);

  React.useEffect(() => {
    setPage(1);
    setNameFilter('');
    setCategoryFilter('');
    setEvaluatesFilter('');
    setIndustryFilter('');
  }, [queryFiltersKey, scope]);

  const handleDeleteSelect = React.useCallback(
    (collection: Collection) => {
      resetDeleteMutation();
      setCollectionToDelete(collection);
    },
    [resetDeleteMutation],
  );

  const handleDeleteConfirm = React.useCallback(async () => {
    if (!collectionToDelete) {
      return;
    }
    try {
      await deleteCollection(collectionToDelete.resource.id);
      notification.success(
        'Benchmark suite deleted',
        `"${collectionToDelete.name}" has been deleted.`,
      );
      setCollectionToDelete(null);
    } catch (deleteError) {
      const message =
        deleteError instanceof Error ? deleteError.message : 'Unable to delete benchmark suite.';
      notification.error('Unable to delete benchmark suite', message);
      setCollectionToDelete(null);
    }
  }, [collectionToDelete, deleteCollection, notification]);

  const handleDeleteClose = React.useCallback(() => {
    resetDeleteMutation();
    setCollectionToDelete(null);
  }, [resetDeleteMutation]);

  const contextualActions: BenchmarkSuiteCardAction[] = [
    // TODO: Reconsider enabling Edit if users request it.
    // Product guidance is to create a new version and keep the original suite
    // to avoid confusion when comparing results. Until that flow is defined,
    // keep Edit disabled and use Duplicate to create a new suite.
    // {
    //   id: 'edit',
    //   label: 'Edit',
    //   onSelect: () => {},
    // },
    {
      id: 'duplicate',
      label: 'Duplicate',
      onSelect: onDuplicateCollection,
    },
    {
      id: 'delete',
      label: 'Delete',
      isDanger: true,
      onSelect: handleDeleteSelect,
    },
  ];

  return (
    <>
      {showFilters && (
        <Toolbar data-testid="benchmark-suites-filter-toolbar">
          <ToolbarContent>
            <ToolbarItem>
              <SearchInput
                aria-label="Filter by name"
                placeholder="Filter by name"
                value={nameFilter}
                isDisabled={areFiltersDisabled}
                onChange={(_event, value) => setNameFilter(value)}
                onClear={() => setNameFilter('')}
                data-testid="benchmark-suites-name-filter"
              />
            </ToolbarItem>
            {categoryOptions.length > 0 && (
              <ToolbarItem>
                <CollectionFilterSelect
                  categoryName="Category"
                  allLabel="All categories"
                  allOptionLabel="All categories"
                  options={categoryOptions}
                  selected={categoryFilter}
                  onSelect={setCategoryFilter}
                  isDisabled={areFiltersDisabled}
                  testId="benchmark-suites-category-filter"
                />
              </ToolbarItem>
            )}
            {showEvaluatesFilter && evaluatesOptions.length > 0 && (
              <ToolbarItem>
                <CollectionFilterSelect
                  categoryName="Evaluates"
                  allLabel="Evaluates"
                  allOptionLabel="All asset types"
                  options={evaluatesOptions}
                  selected={evaluatesFilter}
                  onSelect={setEvaluatesFilter}
                  isDisabled={areFiltersDisabled}
                  testId="benchmark-suites-evaluates-filter"
                />
              </ToolbarItem>
            )}
            {industryOptions.length > 0 && (
              <ToolbarItem>
                <CollectionFilterSelect
                  categoryName="Industry"
                  allLabel="All industries"
                  options={industryOptions}
                  selected={industryFilter}
                  onSelect={setIndustryFilter}
                  isDisabled={areFiltersDisabled}
                  testId="benchmark-suites-industry-filter"
                />
              </ToolbarItem>
            )}
            {showPagination && (
              <ToolbarItem align={{ default: 'alignEnd' }} variant="pagination">
                <Pagination
                  itemCount={filteredCollectionCount}
                  perPage={pageSize}
                  page={page}
                  onSetPage={(_event, newPage) => setPage(newPage)}
                  onPerPageSelect={(_event, newPageSize) => {
                    setPageSize(newPageSize);
                    setPage(1);
                  }}
                  perPageOptions={PAGE_SIZE_OPTIONS.map((size) => ({
                    title: String(size),
                    value: size,
                  }))}
                  variant="top"
                  widgetId="benchmark-suites-pagination-top"
                  data-testid="benchmark-suites-pagination-top"
                  menuAppendTo="inline"
                />
              </ToolbarItem>
            )}
          </ToolbarContent>
        </Toolbar>
      )}
      {shouldShowLoadError ? (
        <Bullseye
          className="evalhub-benchmark-suite-gallery__error-state"
          data-testid="benchmark-suites-load-error"
        >
          <EmptyState
            headingLevel="h2"
            icon={ExclamationCircleIcon}
            status="danger"
            titleText="Unable to load benchmark suites"
            variant={EmptyStateVariant.lg}
          >
            <EmptyStateBody>
              We could not load the benchmark suites right now. Please try again later.
            </EmptyStateBody>
            <EmptyStateFooter>
              <EmptyStateActions>
                <Button variant="primary" onClick={() => void refetch()}>
                  Try again
                </Button>
              </EmptyStateActions>
            </EmptyStateFooter>
          </EmptyState>
        </Bullseye>
      ) : isLoading ? (
        <Bullseye data-testid="benchmark-suites-loading">
          <Spinner aria-label="Loading benchmark suites" />
        </Bullseye>
      ) : (showFilters || showPagination) && filteredCollections.length === 0 ? (
        <Bullseye data-testid="benchmark-suites-empty-state">
          <EmptyState variant={EmptyStateVariant.sm} icon={SearchIcon}>
            <Title headingLevel="h2" size="lg">
              No benchmark suites found
            </Title>
            <EmptyStateBody>
              {hasActiveFilters
                ? 'No benchmark suites match the current filters.'
                : 'No benchmark suites are available.'}
            </EmptyStateBody>
          </EmptyState>
        </Bullseye>
      ) : (
        <div className="evalhub-benchmark-suite-gallery__container">
          <Gallery
            hasGutter
            className="evalhub-benchmark-suite-gallery"
            data-testid="benchmark-suites-gallery"
          >
            {showCreateSuiteCard && (
              <GalleryItem>
                <CreateBenchmarkSuiteCard
                  createSuiteRoute={createSuiteRoute}
                  onCreateSuite={onCreateSuite}
                />
              </GalleryItem>
            )}
            {visibleCollections.map((collection) => (
              <GalleryItem key={collection.resource.id}>
                <BenchmarkSuiteCard
                  collection={collection}
                  primaryAction={{
                    label: primaryActionLabel,
                    href: primaryActionRoute?.(collection),
                    state: primaryActionState,
                    onClick: () => onPrimaryAction(collection),
                  }}
                  contextualActions={showContextualActions ? contextualActions : undefined}
                  onSelect={onSelectCollection}
                />
              </GalleryItem>
            ))}
          </Gallery>
          {isRefreshing && (
            <Bullseye
              className="evalhub-benchmark-suite-gallery__refresh-loading"
              data-testid="benchmark-suites-refresh-loading"
            >
              <Spinner aria-label="Refreshing benchmark suites" />
            </Bullseye>
          )}
        </div>
      )}
      {showSummary && !isLoading && !shouldShowLoadError && totalCount > 0 && (
        <StackItem className="evalhub-evaluate-tab__summary" data-testid="benchmark-suites-summary">
          <Link to={evaluationBenchmarkSuitesRoute(namespace)}>Go to All my benchmark suites</Link>
        </StackItem>
      )}
      {collectionToDelete && (
        <DeleteConfirmationModal
          title="Delete benchmark suite?"
          body={
            <>
              The <strong>{collectionToDelete.name}</strong> benchmark suite will be permanently
              deleted.
            </>
          }
          onClose={handleDeleteClose}
          onConfirm={handleDeleteConfirm}
          isSubmitting={isDeleting}
          ariaLabel="Delete benchmark suite?"
          dataTestId="benchmark-suite-delete-modal"
          confirmTestId="benchmark-suite-delete-confirm"
          cancelTestId="benchmark-suite-delete-cancel"
        />
      )}
    </>
  );
};

export default BenchmarkSuitesGallery;
