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
  Pagination,
  SearchInput,
  Spinner,
  StackItem,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarFilter,
  ToolbarGroup,
  ToolbarItem,
  ToolbarToggleGroup,
} from '@patternfly/react-core';
import { ExclamationCircleIcon, FilterIcon, SearchIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import { mockCuratedBenchmarkSuiteCollections } from '~/app/mockBenchmarkSuiteCollections';
import { useCollectionsQuery, useDeleteCollectionMutation } from '~/app/hooks/collections';
import { useNotification } from '~/app/hooks/useNotification';
import { evaluationBenchmarkSuitesRoute } from '~/app/routes';
import BenchmarkSuiteCard, { isPopularCollection } from '~/app/components/BenchmarkSuiteCard';
import type { BenchmarkSuiteCardAction } from '~/app/components/BenchmarkSuiteCard';
import CreateBenchmarkSuiteCard from '~/app/components/CreateBenchmarkSuiteCard';
import DeleteConfirmationModal from '~/app/components/DeleteConfirmationModal';
import SearchableMultiSelectFilter from '~/app/components/SearchableMultiSelectFilter';
import type { Collection, CollectionFilterParams, CollectionScope } from '~/app/types';
import { formatCategory } from '~/app/components/benchmarkUtils';
import { COLLECTION_FETCH_LIMIT } from '~/app/utilities/const';
import './BenchmarkSuitesGallery.scss';

// TODO: Remove this curated mock fallback once the curated collections API is available.
const DEFAULT_PAGE_SIZE = 8;
const PAGE_SIZE_OPTIONS = [8, 16, 32];
// These are the collection fields that can provide values for the filter dropdowns.
type CollectionFilterField =
  'domains' | 'evaluation_targets' | 'industries' | 'tags' | 'tasks' | 'modalities';

type CollectionFilterOptions = {
  domains: string[];
  evaluatesTypes: string[];
  industries: string[];
  tags: string[];
  tasks: string[];
  modalities: string[];
};

const EMPTY_COLLECTION_FILTER_OPTIONS: CollectionFilterOptions = {
  domains: [],
  evaluatesTypes: [],
  industries: [],
  tags: [],
  tasks: [],
  modalities: [],
};

const mergeFilterOptions = (previous: string[], next: string[]): string[] =>
  [...new Set([...previous, ...next])].toSorted();

const areStringArraysEqual = (first: string[], second: string[]): boolean =>
  first.length === second.length && first.every((value, index) => value === second[index]);

const toggleFilterValue = (selected: string[], value: string): string[] =>
  selected.includes(value)
    ? selected.filter((selectedValue) => selectedValue !== value)
    : [...selected, value];

/** Reads the values for a filter from one collection. */
const getCollectionFieldValues = (collection: Collection, field: CollectionFilterField): string[] =>
  collection[field] ?? [];

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

const hasCuratedIndex = (collection: Collection): boolean =>
  typeof collection.curation_order === 'number' &&
  Number.isFinite(collection.curation_order) &&
  collection.curation_order > 0;

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
  // System collections without a curation order are not part of the curated gallery.
  requireCuratedIndex?: boolean;
  primaryActionLabel?: string;
  primaryActionRoute?: (collection: Collection) => string;
  primaryActionState?: unknown;
  primaryActionVariant?: 'primary' | 'secondary' | 'tertiary';
  dropdownActionLabel?: string;
  dropdownActionRoute?: (collection: Collection) => string;
  dropdownActionState?: unknown;
  // TODO: Remove this temporary switch once curated collections use the API.
  useMockFallback?: boolean;
  createSuiteRoute?: string;
  onCreateSuite?: () => void;
  onPrimaryAction: (collection: Collection) => void;
  onDropdownAction?: (collection: Collection) => void;
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
  requireCuratedIndex = false,
  primaryActionLabel = 'Run benchmark suite',
  primaryActionRoute,
  primaryActionState,
  primaryActionVariant = 'secondary',
  dropdownActionLabel,
  dropdownActionRoute,
  dropdownActionState,
  useMockFallback = false,
  createSuiteRoute,
  onCreateSuite,
  onPrimaryAction,
  onDropdownAction,
  onDuplicateCollection,
  onSelectCollection,
}) => {
  const [nameFilter, setNameFilter] = React.useState('');
  const [domainFilter, setDomainFilter] = React.useState<string[]>([]);
  const [evaluatesFilter, setEvaluatesFilter] = React.useState<string[]>([]);
  const [industryFilter, setIndustryFilter] = React.useState<string[]>([]);
  const [tagFilter, setTagFilter] = React.useState<string[]>([]);
  const [taskFilter, setTaskFilter] = React.useState<string[]>([]);
  const [modalityFilter, setModalityFilter] = React.useState<string[]>([]);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(DEFAULT_PAGE_SIZE);
  const [collectionToDelete, setCollectionToDelete] = React.useState<Collection | null>(null);
  const notification = useNotification();
  const clearFilters = React.useCallback(() => {
    setNameFilter('');
    setDomainFilter([]);
    setEvaluatesFilter([]);
    setIndustryFilter([]);
    setTagFilter([]);
    setTaskFilter([]);
    setModalityFilter([]);
  }, []);
  const queryFiltersKey = React.useMemo(
    () =>
      [
        queryFilters?.domains?.join(',') ?? '',
        queryFilters?.industries?.join(',') ?? '',
        queryFilters?.evaluationTargets?.join(',') ?? '',
      ].join('|'),
    [queryFilters],
  );
  const [filterOptions, setFilterOptions] = React.useState(EMPTY_COLLECTION_FILTER_OPTIONS);
  const filterOptionsKey = `${namespace}|${scope}|${queryFiltersKey}`;
  const previousFilterOptionsKey = React.useRef(filterOptionsKey);
  const isClientSideFiltering =
    showPagination &&
    Boolean(
      nameFilter.trim() ||
      domainFilter.length > 0 ||
      evaluatesFilter.length > 0 ||
      industryFilter.length > 0 ||
      tagFilter.length > 0 ||
      taskFilter.length > 0 ||
      modalityFilter.length > 0,
    );
  const queryLimit = showPagination
    ? requireCuratedIndex || isClientSideFiltering
      ? COLLECTION_FETCH_LIMIT
      : pageSize
    : maxVisibleCollections;
  const queryOffset =
    showPagination && !isClientSideFiltering && !requireCuratedIndex
      ? (page - 1) * pageSize
      : undefined;
  // Keep route-level filters such as the curated agent/model selection on the API request.
  // User-selected gallery filters are applied locally against the fetched collection set. When a
  // filter is active, that set is intentionally capped at COLLECTION_FETCH_LIMIT until filtering
  // and filter-option discovery move fully to the API.
  const { data, isLoading, isFetching, error, refetch } = useCollectionsQuery(
    namespace,
    scope,
    queryLimit,
    requireCuratedIndex ? 'curation_order' : undefined,
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
  const mockEvaluationTarget = queryFilters?.evaluationTargets?.[0];
  const mockCollections = React.useMemo(
    () =>
      requireCuratedIndex
        ? mockCuratedBenchmarkSuiteCollections(
            mockEvaluationTarget === 'agent' || mockEvaluationTarget === 'model'
              ? mockEvaluationTarget
              : undefined,
          )
        : [],
    [mockEvaluationTarget, requireCuratedIndex],
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
    const availableCollections = isUsingMockCollections ? mockCollections : apiCollections;
    return requireCuratedIndex
      ? availableCollections.filter(hasCuratedIndex)
      : availableCollections;
  }, [
    apiCollections,
    isLoading,
    isUsingMockCollections,
    mockCollections,
    requireCuratedIndex,
    shouldShowLoadError,
  ]);
  const sourceCollections = React.useMemo(
    () => (maxVisibleCollections ? collections.slice(0, maxVisibleCollections) : collections),
    [collections, maxVisibleCollections],
  );
  const totalCount = hasApiCollections
    ? (data?.total_count ?? collections.length)
    : collections.length;

  // All filter dropdowns use the same helper so their options stay in sync with the collection
  // fields returned by the API or the temporary mock fallback.
  const availableDomains = React.useMemo(
    () => getAvailableFilterOptions(sourceCollections, 'domains'),
    [sourceCollections],
  );
  const availableEvaluatesTypes = React.useMemo(
    () => getAvailableFilterOptions(sourceCollections, 'evaluation_targets'),
    [sourceCollections],
  );
  const availableIndustries = React.useMemo(
    () => getAvailableFilterOptions(sourceCollections, 'industries'),
    [sourceCollections],
  );
  const availableTags = React.useMemo(
    () => getAvailableFilterOptions(sourceCollections, 'tags'),
    [sourceCollections],
  );
  const availableTasks = React.useMemo(
    () => getAvailableFilterOptions(sourceCollections, 'tasks'),
    [sourceCollections],
  );
  const availableModalities = React.useMemo(
    () => getAvailableFilterOptions(sourceCollections, 'modalities'),
    [sourceCollections],
  );
  React.useEffect(() => {
    setFilterOptions((previous) => {
      const next = {
        domains: mergeFilterOptions(previous.domains, availableDomains),
        evaluatesTypes: mergeFilterOptions(previous.evaluatesTypes, availableEvaluatesTypes),
        industries: mergeFilterOptions(previous.industries, availableIndustries),
        tags: mergeFilterOptions(previous.tags, availableTags),
        tasks: mergeFilterOptions(previous.tasks, availableTasks),
        modalities: mergeFilterOptions(previous.modalities, availableModalities),
      };

      if (
        areStringArraysEqual(previous.domains, next.domains) &&
        areStringArraysEqual(previous.evaluatesTypes, next.evaluatesTypes) &&
        areStringArraysEqual(previous.industries, next.industries) &&
        areStringArraysEqual(previous.tags, next.tags) &&
        areStringArraysEqual(previous.tasks, next.tasks) &&
        areStringArraysEqual(previous.modalities, next.modalities)
      ) {
        return previous;
      }

      return next;
    });
  }, [
    availableDomains,
    availableEvaluatesTypes,
    availableIndustries,
    availableModalities,
    availableTags,
    availableTasks,
  ]);

  React.useEffect(() => {
    if (previousFilterOptionsKey.current === filterOptionsKey) {
      return;
    }
    previousFilterOptionsKey.current = filterOptionsKey;
    setFilterOptions(EMPTY_COLLECTION_FILTER_OPTIONS);
  }, [filterOptionsKey]);

  const evaluatesOptions = React.useMemo(
    () => mergeFilterOptions(filterOptions.evaluatesTypes, availableEvaluatesTypes),
    [availableEvaluatesTypes, filterOptions.evaluatesTypes],
  );
  const industryOptions = React.useMemo(
    () => mergeFilterOptions(filterOptions.industries, availableIndustries),
    [availableIndustries, filterOptions.industries],
  );
  const domainOptions = React.useMemo(
    () => mergeFilterOptions(filterOptions.domains, availableDomains),
    [availableDomains, filterOptions.domains],
  );
  const tagOptions = React.useMemo(
    () => mergeFilterOptions(filterOptions.tags, availableTags),
    [availableTags, filterOptions.tags],
  );
  const taskOptions = React.useMemo(
    () => mergeFilterOptions(filterOptions.tasks, availableTasks),
    [availableTasks, filterOptions.tasks],
  );
  const modalityOptions = React.useMemo(
    () => mergeFilterOptions(filterOptions.modalities, availableModalities),
    [availableModalities, filterOptions.modalities],
  );

  const filteredCollections = React.useMemo(() => {
    const normalizedNameFilter = nameFilter.trim().toLowerCase();

    return sourceCollections.filter((collection) => {
      if (normalizedNameFilter && !collection.name.toLowerCase().includes(normalizedNameFilter)) {
        return false;
      }
      if (
        domainFilter.length > 0 &&
        !domainFilter.some((value) =>
          getCollectionFieldValues(collection, 'domains').includes(value),
        )
      ) {
        return false;
      }
      if (
        evaluatesFilter.length > 0 &&
        !evaluatesFilter.some((value) =>
          getCollectionFieldValues(collection, 'evaluation_targets').includes(value),
        )
      ) {
        return false;
      }
      if (
        industryFilter.length > 0 &&
        !industryFilter.some((value) =>
          getCollectionFieldValues(collection, 'industries').includes(value),
        )
      ) {
        return false;
      }
      if (
        tagFilter.length > 0 &&
        !tagFilter.some((value) => getCollectionFieldValues(collection, 'tags').includes(value))
      ) {
        return false;
      }
      if (
        taskFilter.length > 0 &&
        !taskFilter.some((value) => getCollectionFieldValues(collection, 'tasks').includes(value))
      ) {
        return false;
      }
      if (
        modalityFilter.length > 0 &&
        !modalityFilter.some((value) =>
          getCollectionFieldValues(collection, 'modalities').includes(value),
        )
      ) {
        return false;
      }
      return true;
    });
  }, [
    domainFilter,
    evaluatesFilter,
    industryFilter,
    modalityFilter,
    nameFilter,
    sourceCollections,
    tagFilter,
    taskFilter,
  ]);

  // Mock data and client-side-filtered results need local slicing. The latter are limited to the
  // first COLLECTION_FETCH_LIMIT API results by queryLimit above.
  const shouldUseClientSidePagination =
    isUsingMockCollections || isClientSideFiltering || requireCuratedIndex;
  const visibleCollections = showPagination
    ? shouldUseClientSidePagination
      ? filteredCollections.slice((page - 1) * pageSize, page * pageSize)
      : filteredCollections.slice(0, pageSize)
    : sourceCollections;
  const hasPopularCollections = visibleCollections.some(isPopularCollection);
  // TODO: Remove the mock count branch when mock collections are no longer needed and always use
  // the API total_count for pagination.
  const filteredCollectionCount = showPagination
    ? shouldUseClientSidePagination
      ? filteredCollections.length
      : (data?.total_count ?? filteredCollections.length)
    : totalCount;
  const hasActiveFilters = Boolean(
    nameFilter ||
    domainFilter.length > 0 ||
    evaluatesFilter.length > 0 ||
    industryFilter.length > 0 ||
    tagFilter.length > 0 ||
    taskFilter.length > 0 ||
    modalityFilter.length > 0,
  );
  const areFiltersDisabled =
    shouldShowLoadError || (!isLoading && sourceCollections.length === 0 && !hasActiveFilters);
  const isRefreshing = isFetching && !isLoading;

  React.useEffect(() => {
    setPage(1);
  }, [
    domainFilter,
    evaluatesFilter,
    industryFilter,
    modalityFilter,
    maxVisibleCollections,
    nameFilter,
    namespace,
    tagFilter,
    taskFilter,
  ]);

  React.useEffect(() => {
    setPage(1);
    setNameFilter('');
    setDomainFilter([]);
    setEvaluatesFilter([]);
    setIndustryFilter([]);
    setTagFilter([]);
    setTaskFilter([]);
    setModalityFilter([]);
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
        <Toolbar clearAllFilters={clearFilters} data-testid="benchmark-suites-filter-toolbar">
          <ToolbarContent>
            <ToolbarToggleGroup breakpoint="md" toggleIcon={<FilterIcon />}>
              <ToolbarGroup variant="filter-group">
                <ToolbarFilter
                  labels={nameFilter ? [nameFilter] : []}
                  deleteLabel={() => setNameFilter('')}
                  categoryName="Search"
                >
                  <SearchInput
                    aria-label="Search collections"
                    placeholder="Search collections"
                    value={nameFilter}
                    isDisabled={areFiltersDisabled}
                    onChange={(_event, value) => setNameFilter(value)}
                    onClear={() => setNameFilter('')}
                    data-testid="benchmark-suites-name-filter"
                  />
                </ToolbarFilter>
                {domainOptions.length > 0 && (
                  <SearchableMultiSelectFilter
                    categoryName="Category"
                    options={domainOptions}
                    selected={domainFilter}
                    formatLabel={formatCategory}
                    onToggleOption={(value) =>
                      setDomainFilter((previous) => toggleFilterValue(previous, value))
                    }
                    onClearAll={() => setDomainFilter([])}
                    isDisabled={areFiltersDisabled}
                    testIdPrefix="benchmark-suites-category"
                    testId="benchmark-suites-category-filter"
                  />
                )}
                {showEvaluatesFilter && evaluatesOptions.length > 0 && (
                  <SearchableMultiSelectFilter
                    categoryName="Evaluates"
                    options={evaluatesOptions}
                    selected={evaluatesFilter}
                    formatLabel={formatCategory}
                    onToggleOption={(value) =>
                      setEvaluatesFilter((previous) => toggleFilterValue(previous, value))
                    }
                    onClearAll={() => setEvaluatesFilter([])}
                    isDisabled={areFiltersDisabled}
                    testIdPrefix="benchmark-suites-evaluates"
                    testId="benchmark-suites-evaluates-filter"
                  />
                )}
                {tagOptions.length > 0 && (
                  <SearchableMultiSelectFilter
                    categoryName="Tags"
                    options={tagOptions}
                    selected={tagFilter}
                    formatLabel={formatCategory}
                    onToggleOption={(value) =>
                      setTagFilter((previous) => toggleFilterValue(previous, value))
                    }
                    onClearAll={() => setTagFilter([])}
                    isDisabled={areFiltersDisabled}
                    testIdPrefix="benchmark-suites-tags"
                    testId="benchmark-suites-tags-filter"
                  />
                )}
                {industryOptions.length > 0 && (
                  <SearchableMultiSelectFilter
                    categoryName="Industry"
                    options={industryOptions}
                    selected={industryFilter}
                    formatLabel={formatCategory}
                    onToggleOption={(value) =>
                      setIndustryFilter((previous) => toggleFilterValue(previous, value))
                    }
                    onClearAll={() => setIndustryFilter([])}
                    isDisabled={areFiltersDisabled}
                    testIdPrefix="benchmark-suites-industry"
                    testId="benchmark-suites-industry-filter"
                  />
                )}
                {taskOptions.length > 0 && (
                  <SearchableMultiSelectFilter
                    categoryName="Tasks"
                    options={taskOptions}
                    selected={taskFilter}
                    formatLabel={formatCategory}
                    onToggleOption={(value) =>
                      setTaskFilter((previous) => toggleFilterValue(previous, value))
                    }
                    onClearAll={() => setTaskFilter([])}
                    isDisabled={areFiltersDisabled}
                    testIdPrefix="benchmark-suites-task"
                    testId="benchmark-suites-task-filter"
                  />
                )}
                {modalityOptions.length > 0 && (
                  <SearchableMultiSelectFilter
                    categoryName="Modalities"
                    options={modalityOptions}
                    selected={modalityFilter}
                    formatLabel={formatCategory}
                    onToggleOption={(value) =>
                      setModalityFilter((previous) => toggleFilterValue(previous, value))
                    }
                    onClearAll={() => setModalityFilter([])}
                    isDisabled={areFiltersDisabled}
                    testIdPrefix="benchmark-suites-modality"
                    testId="benchmark-suites-modality-filter"
                  />
                )}
              </ToolbarGroup>
            </ToolbarToggleGroup>
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
                    variant: primaryActionVariant,
                    onClick: () => onPrimaryAction(collection),
                  }}
                  dropdownAction={
                    dropdownActionLabel
                      ? {
                          label: dropdownActionLabel,
                          href: dropdownActionRoute?.(collection),
                          state: dropdownActionState,
                          onClick: () => onDropdownAction?.(collection),
                        }
                      : undefined
                  }
                  contextualActions={showContextualActions ? contextualActions : undefined}
                  onSelect={onSelectCollection}
                  reservePopularHeader={hasPopularCollections}
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
