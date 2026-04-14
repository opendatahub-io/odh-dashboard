import * as React from 'react';
import {
  Alert,
  Breadcrumb,
  BreadcrumbItem,
  Bullseye,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardTitle,
  Content,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  Gallery,
  Label,
  MenuToggle,
  MenuToggleElement,
  PageSection,
  Pagination,
  Select,
  SelectList,
  SelectOption,
  Spinner,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  SearchInput,
} from '@patternfly/react-core';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { useCollections } from '~/app/hooks/useCollections';
import { Collection } from '~/app/types';
import { evaluationCreateRoute, evaluationStartRoute, evaluationsBaseRoute } from '~/app/routes';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';
import CollectionDrawerPanel from '~/app/components/CollectionDrawerPanel';
import { capitalizeFirst, getCategoryColor } from '~/app/components/benchmarkUtils';

const ChooseBenchmarkCollectionPage: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();
  const navigate = useNavigate();
  const [selectedCollection, setSelectedCollection] = React.useState<Collection | undefined>(
    undefined,
  );
  const [isCategoryOpen, setIsCategoryOpen] = React.useState(false);

  const {
    collections,
    totalCount,
    loaded,
    loadError,
    isTruncated,
    page,
    pageSize,
    setPage,
    setPageSize,
    nameFilter,
    setNameFilter,
    categoryFilter,
    setCategoryFilter,
    availableCategories,
  } = useCollections(namespace ?? '');

  const handleRunCollection = React.useCallback(
    (c: Collection) => {
      fireMiscTrackingEvent(EVAL_HUB_EVENTS.BENCHMARK_RUN_SELECTED, {
        runType: 'collection',
        collectionName: c.name,
        benchmarkTypes: JSON.stringify((c.benchmarks ?? []).map((b) => b.id)),
        countOfBenchmarks: c.benchmarks?.length ?? 0,
      });
      const params = new URLSearchParams({
        type: 'collection',
        collectionId: c.resource.id,
      });
      navigate(`${evaluationStartRoute(namespace)}?${params.toString()}`, {
        state: { collection: c },
      });
    },
    [navigate, namespace],
  );

  const handleCategorySelect = React.useCallback(
    (_: React.MouseEvent | undefined, value: string | number | undefined) => {
      setCategoryFilter(value === categoryFilter ? '' : String(value ?? ''));
      setIsCategoryOpen(false);
    },
    [categoryFilter, setCategoryFilter],
  );

  const categoryToggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      ref={toggleRef}
      data-testid="collections-category-toggle"
      onClick={() => setIsCategoryOpen((prev) => !prev)}
      isExpanded={isCategoryOpen}
    >
      {categoryFilter || 'Category'}
    </MenuToggle>
  );

  return (
    <Drawer isExpanded={!!selectedCollection}>
      <DrawerContent
        panelContent={
          <CollectionDrawerPanel
            collection={selectedCollection}
            onClose={() => setSelectedCollection(undefined)}
            onRunCollection={handleRunCollection}
          />
        }
      >
        <DrawerContentBody>
          <ApplicationsPage
            title="Select benchmark suite"
            description="Select a benchmark suite to run on your model or agent."
            breadcrumb={
              <Breadcrumb>
                <BreadcrumbItem
                  render={() => <Link to={evaluationsBaseRoute(namespace)}>Evaluations</Link>}
                />
                <BreadcrumbItem
                  render={() => (
                    <Link to={evaluationCreateRoute(namespace)}>Create evaluation run</Link>
                  )}
                />
                <BreadcrumbItem isActive>Select benchmark suite</BreadcrumbItem>
              </Breadcrumb>
            }
            loaded={loaded}
            loadError={loadError}
            empty={false}
          >
            <PageSection hasBodyWrapper={false} isFilled>
              {isTruncated && (
                <Alert
                  variant="warning"
                  isInline
                  title="Not all collections are shown"
                  data-testid="collections-truncation-alert"
                  style={{ marginBottom: 'var(--pf-t--global--spacer--md)' }}
                >
                  This namespace has more benchmark suites than the display limit. Contact your
                  administrator or use the API directly to access the full list.
                </Alert>
              )}
              <Toolbar>
                <ToolbarContent>
                  <ToolbarItem>
                    <SearchInput
                      placeholder="Filter by name"
                      value={nameFilter}
                      onChange={(_, value) => setNameFilter(value)}
                      onClear={() => setNameFilter('')}
                      style={{ width: '220px' }}
                      data-testid="collections-name-filter"
                    />
                  </ToolbarItem>
                  <ToolbarItem>
                    <Select
                      isOpen={isCategoryOpen}
                      selected={categoryFilter || undefined}
                      onSelect={handleCategorySelect}
                      onOpenChange={setIsCategoryOpen}
                      toggle={categoryToggle}
                      data-testid="collections-category-select"
                    >
                      <SelectList>
                        {categoryFilter && <SelectOption value="">All categories</SelectOption>}
                        {availableCategories.map((cat) => (
                          <SelectOption key={cat} value={cat}>
                            {cat}
                          </SelectOption>
                        ))}
                      </SelectList>
                    </Select>
                  </ToolbarItem>
                  <ToolbarItem align={{ default: 'alignEnd' }}>
                    <Pagination
                      itemCount={totalCount}
                      perPage={pageSize}
                      page={page}
                      onSetPage={(_, newPage) => setPage(newPage)}
                      onPerPageSelect={(_, newPageSize) => setPageSize(newPageSize)}
                      perPageOptions={[
                        { title: '6', value: 6 },
                        { title: '12', value: 12 },
                        { title: '24', value: 24 },
                      ]}
                      variant="top"
                    />
                  </ToolbarItem>
                </ToolbarContent>
              </Toolbar>

              {!loaded ? (
                <Bullseye>
                  <Spinner />
                </Bullseye>
              ) : collections.length === 0 ? (
                <Bullseye data-testid="collections-empty-state">
                  <Content component="p">
                    {nameFilter || categoryFilter
                      ? 'No collections match the current filters.'
                      : 'No collections available.'}
                  </Content>
                </Bullseye>
              ) : (
                <Gallery
                  hasGutter
                  minWidths={{ default: '280px' }}
                  data-testid="collections-gallery"
                >
                  {collections.map((collection) => {
                    const benchmarkCount = collection.benchmarks?.length ?? 0;
                    const isSelected = selectedCollection?.resource.id === collection.resource.id;
                    return (
                      <Card
                        key={collection.resource.id}
                        isSelected={isSelected}
                        data-testid={`collection-card-${collection.resource.id}`}
                      >
                        <CardTitle>
                          {collection.category && (
                            <Label
                              color={getCategoryColor(collection.category)}
                              isCompact
                              style={{ marginBottom: 'var(--pf-t--global--spacer--xs)' }}
                            >
                              {capitalizeFirst(collection.category)}
                            </Label>
                          )}
                          <Button
                            variant="link"
                            isInline
                            style={{
                              display: 'block',
                              textDecoration: 'none',
                              fontWeight: 'var(--pf-t--global--font--weight--heading--default)',
                            }}
                            onClick={() =>
                              setSelectedCollection(isSelected ? undefined : collection)
                            }
                          >
                            {collection.name}
                          </Button>
                        </CardTitle>
                        <CardBody>
                          {benchmarkCount > 0 && (
                            <Content component="small">
                              <strong>
                                {benchmarkCount} benchmark{benchmarkCount !== 1 ? 's' : ''}
                              </strong>
                            </Content>
                          )}
                          {collection.description && (
                            <Content component="p">{collection.description}</Content>
                          )}
                        </CardBody>
                        <CardFooter>
                          <Button
                            variant="secondary"
                            isInline
                            data-testid="use-benchmark-suite-button"
                            onClick={() => handleRunCollection(collection)}
                          >
                            Use this benchmark suite
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </Gallery>
              )}

              {totalCount > pageSize && (
                <Toolbar>
                  <ToolbarContent>
                    <ToolbarItem align={{ default: 'alignEnd' }}>
                      <Pagination
                        itemCount={totalCount}
                        perPage={pageSize}
                        page={page}
                        onSetPage={(_, newPage) => setPage(newPage)}
                        onPerPageSelect={(_, newPageSize) => setPageSize(newPageSize)}
                        perPageOptions={[
                          { title: '6', value: 6 },
                          { title: '12', value: 12 },
                          { title: '24', value: 24 },
                        ]}
                        variant="bottom"
                      />
                    </ToolbarItem>
                  </ToolbarContent>
                </Toolbar>
              )}
            </PageSection>
          </ApplicationsPage>
        </DrawerContentBody>
      </DrawerContent>
    </Drawer>
  );
};

export default ChooseBenchmarkCollectionPage;
