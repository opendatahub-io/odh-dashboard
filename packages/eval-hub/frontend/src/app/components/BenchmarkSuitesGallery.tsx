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
import {
  mockBenchmarkSuiteCollections,
  mockCuratedBenchmarkSuiteCollections,
} from '~/app/mockBenchmarkSuiteCollections';
import { useCollectionsQuery, useDeleteCollectionMutation } from '~/app/hooks/collections';
import { useNotification } from '~/app/hooks/useNotification';
import { evaluationBenchmarkSuitesRoute } from '~/app/routes';
import BenchmarkSuiteCard from '~/app/components/BenchmarkSuiteCard';
import type { BenchmarkSuiteCardAction } from '~/app/components/BenchmarkSuiteCard';
import CreateBenchmarkSuiteCard from '~/app/components/CreateBenchmarkSuiteCard';
import DeleteConfirmationModal from '~/app/components/DeleteConfirmationModal';
import type { Collection, CollectionFilterParams, CollectionScope } from '~/app/types';
import { formatCategory } from '~/app/components/benchmarkUtils';
import './BenchmarkSuitesGallery.scss';

// TODO: Remove this mock fallback once the collection creation API is available.
const MOCK_COLLECTIONS = mockBenchmarkSuiteCollections();
const DEFAULT_PAGE_SIZE = 6;
const PAGE_SIZE_OPTIONS = [6, 12, 24];
const SUPPORTED_EVALUATES_TYPES = ['model', 'agent'] as const;
type SupportedEvaluatesType = (typeof SUPPORTED_EVALUATES_TYPES)[number];

type CollectionFilterSelectProps = {
  categoryName: string;
  allLabel: string;
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
  testId: string;
};

const CollectionFilterSelect: React.FC<CollectionFilterSelectProps> = ({
  categoryName,
  allLabel,
  options,
  selected,
  onSelect,
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
          {allLabel}
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

const isSupportedEvaluatesType = (value: string): value is SupportedEvaluatesType =>
  SUPPORTED_EVALUATES_TYPES.some((type) => type === value);

const getCollectionEvaluatesTypes = (collection: Collection): SupportedEvaluatesType[] => {
  if (collection.ai_entities && collection.ai_entities.length > 0) {
    return collection.ai_entities.filter(isSupportedEvaluatesType);
  }

  // The mock collections currently store these classifications in domains.
  return (collection.domains ?? []).filter(isSupportedEvaluatesType);
};

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
  onCreateSuite?: () => void;
  onPrimaryAction?: (collection: Collection) => void;
  onSelectCollection: (collection: Collection) => void;
};

function handleRunCollection(): null {
  // TODO: Redirect to the Start evaluation run form.
  return null;
}

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
  onCreateSuite,
  onPrimaryAction = handleRunCollection,
  onSelectCollection,
}) => {
  const [nameFilter, setNameFilter] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState('');
  const [evaluatesFilter, setEvaluatesFilter] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(DEFAULT_PAGE_SIZE);
  const [collectionToDelete, setCollectionToDelete] = React.useState<Collection | null>(null);
  const notification = useNotification();
  const { data, isLoading, error, refetch } = useCollectionsQuery(
    namespace,
    scope,
    maxVisibleCollections,
    scope === 'curated' ? 'curation_order' : undefined,
    queryFilters,
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
        : MOCK_COLLECTIONS,
    [mockAiEntity, scope],
  );
  const shouldShowLoadError = Boolean(error);
  const collections = React.useMemo(
    () => (shouldShowLoadError ? [] : hasApiCollections ? apiCollections : mockCollections),
    [apiCollections, hasApiCollections, mockCollections, shouldShowLoadError],
  );
  const sourceCollections = React.useMemo(
    () => (maxVisibleCollections ? collections.slice(0, maxVisibleCollections) : collections),
    [collections, maxVisibleCollections],
  );
  const totalCount = hasApiCollections
    ? (data?.total_count ?? collections.length)
    : collections.length;

  const availableCategories = React.useMemo(
    () =>
      [
        ...new Set(
          sourceCollections
            .map((collection) => collection.category)
            .filter((category): category is string => Boolean(category)),
        ),
      ].toSorted(),
    [sourceCollections],
  );

  const filteredCollections = React.useMemo(() => {
    const normalizedNameFilter = nameFilter.trim().toLowerCase();

    return sourceCollections.filter((collection) => {
      if (normalizedNameFilter && !collection.name.toLowerCase().includes(normalizedNameFilter)) {
        return false;
      }
      if (categoryFilter && collection.category !== categoryFilter) {
        return false;
      }
      const selectedEvaluatesType = isSupportedEvaluatesType(evaluatesFilter)
        ? evaluatesFilter
        : undefined;
      if (
        selectedEvaluatesType &&
        !getCollectionEvaluatesTypes(collection).includes(selectedEvaluatesType)
      ) {
        return false;
      }
      return true;
    });
  }, [categoryFilter, evaluatesFilter, nameFilter, sourceCollections]);

  const visibleCollections = showPagination
    ? filteredCollections.slice((page - 1) * pageSize, page * pageSize)
    : sourceCollections;
  const filteredCollectionCount = showPagination ? filteredCollections.length : totalCount;
  const hasActiveFilters = Boolean(nameFilter || categoryFilter || evaluatesFilter);

  React.useEffect(() => {
    setPage(1);
  }, [categoryFilter, evaluatesFilter, maxVisibleCollections, nameFilter, namespace]);

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
    {
      id: 'edit',
      label: 'Edit',
      onSelect: () => {
        // TODO: Redirect to the edit collection form once it is available.
        // TODO: Use usePatchCollectionMutation to submit the form's JSON Patch operations.
      },
    },
    {
      id: 'duplicate',
      label: 'Duplicate',
      onSelect: () => {
        // TODO: Wire this action to the clone flow from PR #9638.
      },
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
                onChange={(_event, value) => setNameFilter(value)}
                onClear={() => setNameFilter('')}
                data-testid="benchmark-suites-name-filter"
              />
            </ToolbarItem>
            <ToolbarItem>
              <CollectionFilterSelect
                categoryName="Category"
                allLabel="All categories"
                options={availableCategories}
                selected={categoryFilter}
                onSelect={setCategoryFilter}
                testId="benchmark-suites-category-filter"
              />
            </ToolbarItem>
            {showEvaluatesFilter && (
              <ToolbarItem>
                <CollectionFilterSelect
                  categoryName="Evaluates"
                  allLabel="All asset types"
                  options={[...SUPPORTED_EVALUATES_TYPES]}
                  selected={evaluatesFilter}
                  onSelect={setEvaluatesFilter}
                  testId="benchmark-suites-evaluates-filter"
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
      ) : (showFilters || showPagination) && !isLoading && filteredCollections.length === 0 ? (
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
        <Gallery
          hasGutter
          className="evalhub-benchmark-suite-gallery"
          data-testid="benchmark-suites-gallery"
        >
          {showCreateSuiteCard && (
            <GalleryItem>
              <CreateBenchmarkSuiteCard onCreateSuite={onCreateSuite} />
            </GalleryItem>
          )}
          {visibleCollections.map((collection) => (
            <GalleryItem key={collection.resource.id}>
              <BenchmarkSuiteCard
                collection={collection}
                primaryAction={{
                  label: primaryActionLabel,
                  onClick: () => onPrimaryAction(collection),
                }}
                contextualActions={showContextualActions ? contextualActions : undefined}
                onSelect={onSelectCollection}
              />
            </GalleryItem>
          ))}
        </Gallery>
      )}
      {isLoading && (
        <Bullseye data-testid="benchmark-suites-loading">
          <Spinner />
        </Bullseye>
      )}
      {showSummary && !isLoading && !shouldShowLoadError && totalCount > 0 && (
        <StackItem className="evalhub-evaluate-tab__summary" data-testid="benchmark-suites-summary">
          <Link to={evaluationBenchmarkSuitesRoute(namespace)}>Go to All my benchmark suites</Link>
        </StackItem>
      )}
      {showPagination && !isLoading && !shouldShowLoadError && filteredCollections.length > 0 && (
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
          variant="bottom"
          widgetId="benchmark-suites-pagination-bottom"
          data-testid="benchmark-suites-pagination-bottom"
          menuAppendTo="inline"
        />
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
