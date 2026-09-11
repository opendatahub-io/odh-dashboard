import React from 'react';
import {
  PageSection,
  Content,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  SearchInput,
  Button,
  Label,
  LabelGroup,
  Select,
  SelectOption,
  SelectList,
  MenuToggle,
  MenuToggleElement,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Spinner,
  Flex,
  FlexItem,
  Pagination,
  Dropdown,
  DropdownList,
  DropdownItem,
} from '@patternfly/react-core';
import { FilterIcon, EllipsisVIcon } from '@patternfly/react-icons';
import { Table, Thead, Tr, Th, Tbody, Td, ThProps } from '@patternfly/react-table';
import { Link, useNavigate } from 'react-router-dom';
import { RegistryAsset } from '~/app/hooks/useAssets';
import {
  deleteGenericTable,
  deleteVolume,
  is503Error,
  is403Error,
  isConnectionError,
} from '~/app/api/dataRegistry';
import { useNotification } from '~/app/hooks/useNotification';
import { assetDetailUrl } from '~/app/utilities/routes';
import { getFormatBadge, isStructured, FORMAT_OPTIONS } from '~/app/utilities/formatUtils';
import AccessDeniedError from '~/app/components/errors/AccessDeniedError';
import ConnectionError from '~/app/components/errors/ConnectionError';
import ServiceUnavailableError from '~/app/components/errors/ServiceUnavailableError';
import DeleteAssetModal from './DeleteAssetModal';

type RegistryTableProps = {
  assets: RegistryAsset[];
  loaded: boolean;
  error: Error | undefined;
  labels: string[];
  project: string;
  onManageCollections: () => void;
  onManageLabels: () => void;
  onRegisterData: () => void;
  onRetry: () => void;
  hasWriteAccess?: boolean;
};

type FilterCategory = 'labels' | 'assetType' | 'format';

const CATEGORY_LABELS: Record<FilterCategory, string> = {
  labels: 'Labels',
  assetType: 'Asset type',
  format: 'Format',
};

const RegistryTable: React.FC<RegistryTableProps> = ({
  assets,
  loaded,
  error,
  labels,
  project,
  onManageCollections,
  onManageLabels,
  onRegisterData,
  onRetry,
  hasWriteAccess = true,
}) => {
  const navigate = useNavigate();
  const notification = useNotification();
  const [searchText, setSearchText] = React.useState('');
  const [filterCategory, setFilterCategory] = React.useState<FilterCategory>('labels');
  const [isCategoryOpen, setIsCategoryOpen] = React.useState(false);
  const [isValueOpen, setIsValueOpen] = React.useState(false);
  const [selectedLabels, setSelectedLabels] = React.useState<string[]>([]);
  const [selectedAssetType, setSelectedAssetType] = React.useState('');
  const [selectedFormat, setSelectedFormat] = React.useState('');
  const [isKebabOpen, setIsKebabOpen] = React.useState(false);
  const [activeActionsAsset, setActiveActionsAsset] = React.useState<string>();
  const [deleteAsset, setDeleteAsset] = React.useState<RegistryAsset | null>(null);
  const [activeSortIndex, setActiveSortIndex] = React.useState<number | undefined>(undefined);
  const [activeSortDirection, setActiveSortDirection] = React.useState<'asc' | 'desc'>('asc');
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);

  const hasActiveFilters =
    selectedLabels.length > 0 || !!selectedAssetType || !!selectedFormat || !!searchText;

  const clearAllFilters = React.useCallback(() => {
    setSelectedLabels([]);
    setSelectedAssetType('');
    setSelectedFormat('');
    setSearchText('');
    setPage(1);
  }, []);

  const filteredAssets = React.useMemo(() => {
    let result = assets;
    if (searchText) {
      const lower = searchText.toLowerCase();
      result = result.filter(
        (a) => a.name.toLowerCase().includes(lower) || a.description.toLowerCase().includes(lower),
      );
    }
    if (selectedLabels.length > 0) {
      result = result.filter((a) => selectedLabels.every((l) => a.labels.includes(l)));
    }
    if (selectedAssetType) {
      result = result.filter((a) =>
        selectedAssetType === 'Structured' ? isStructured(a.format) : !isStructured(a.format),
      );
    }
    if (selectedFormat) {
      result = result.filter((a) => a.format.toLowerCase() === selectedFormat.toLowerCase());
    }
    if (activeSortIndex !== undefined) {
      const getSortValue = (asset: RegistryAsset, colIndex: number): string => {
        if (colIndex === 0) {
          return asset.name;
        }
        if (colIndex === 1) {
          return asset.format;
        }
        return asset.connectionRef || asset.location;
      };
      result = result.toSorted((a, b) => {
        const aVal = getSortValue(a, activeSortIndex);
        const bVal = getSortValue(b, activeSortIndex);
        return activeSortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      });
    }
    return result;
  }, [
    assets,
    searchText,
    selectedLabels,
    selectedAssetType,
    selectedFormat,
    activeSortIndex,
    activeSortDirection,
  ]);

  const maxPage = Math.max(1, Math.ceil(filteredAssets.length / perPage));
  const currentPage = Math.min(page, maxPage);

  React.useEffect(() => {
    if (page !== currentPage) {
      setPage(currentPage);
    }
  }, [currentPage, page]);

  const paginatedAssets = filteredAssets.slice((currentPage - 1) * perPage, currentPage * perPage);

  const getSortParams = (columnIndex: number): ThProps['sort'] => ({
    sortBy: { index: activeSortIndex, direction: activeSortDirection },
    onSort: (_event, index, direction) => {
      setActiveSortIndex(index);
      setActiveSortDirection(direction);
    },
    columnIndex,
  });

  const handleDelete = React.useCallback(
    async (asset: RegistryAsset) => {
      if (asset.assetType === 'volume') {
        await deleteVolume(project, asset.collection, asset.name);
      } else {
        await deleteGenericTable(project, asset.collection, asset.name);
      }
      notification.success('Asset deleted', `${asset.name} was deleted successfully.`);
      setDeleteAsset(null);
      onRetry();
    },
    [notification, onRetry, project],
  );

  // Value dropdown content based on category
  const renderValueDropdown = () => {
    if (filterCategory === 'labels') {
      return (
        <Select
          isOpen={isValueOpen}
          maxMenuHeight="300px"
          onSelect={(_event, value) => {
            const val = String(value);
            setSelectedLabels((prev) =>
              prev.includes(val) ? prev.filter((l) => l !== val) : [...prev, val],
            );
            setPage(1);
          }}
          onOpenChange={setIsValueOpen}
          toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
            <MenuToggle
              ref={toggleRef}
              onClick={() => setIsValueOpen((prev) => !prev)}
              isExpanded={isValueOpen}
              data-testid="filter-value"
            >
              Labels{' '}
              {selectedLabels.length > 0 ? (
                <Label isCompact color="blue">
                  {selectedLabels.length}
                </Label>
              ) : null}
            </MenuToggle>
          )}
        >
          <SelectList>
            {labels.map((label) => (
              <SelectOption
                key={label}
                value={label}
                hasCheckbox
                isSelected={selectedLabels.includes(label)}
              >
                {label}
              </SelectOption>
            ))}
          </SelectList>
        </Select>
      );
    }

    if (filterCategory === 'assetType') {
      return (
        <Select
          isOpen={isValueOpen}
          selected={selectedAssetType}
          onSelect={(_event, value) => {
            setSelectedAssetType(value === selectedAssetType ? '' : String(value));
            setIsValueOpen(false);
            setPage(1);
          }}
          onOpenChange={setIsValueOpen}
          toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
            <MenuToggle
              ref={toggleRef}
              onClick={() => setIsValueOpen((prev) => !prev)}
              isExpanded={isValueOpen}
              data-testid="filter-value"
            >
              {selectedAssetType || 'All asset types'}
            </MenuToggle>
          )}
        >
          <SelectList>
            <SelectOption value="Structured">Structured</SelectOption>
            <SelectOption value="Unstructured">Unstructured</SelectOption>
          </SelectList>
        </Select>
      );
    }

    return (
      <Select
        isOpen={isValueOpen}
        selected={selectedFormat}
        maxMenuHeight="300px"
        onSelect={(_event, value) => {
          setSelectedFormat(value === selectedFormat ? '' : String(value));
          setIsValueOpen(false);
          setPage(1);
        }}
        onOpenChange={setIsValueOpen}
        toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
          <MenuToggle
            ref={toggleRef}
            onClick={() => setIsValueOpen((prev) => !prev)}
            isExpanded={isValueOpen}
            data-testid="filter-value"
          >
            {selectedFormat
              ? FORMAT_OPTIONS.find((f) => f.key === selectedFormat)?.label || selectedFormat
              : 'All formats'}
          </MenuToggle>
        )}
      >
        <SelectList>
          {FORMAT_OPTIONS.map((f) => (
            <SelectOption key={f.key} value={f.key}>
              {f.label}
            </SelectOption>
          ))}
        </SelectList>
      </Select>
    );
  };

  if (error) {
    if (is503Error(error)) {
      return (
        <PageSection hasBodyWrapper={false} isFilled>
          <ServiceUnavailableError onRetry={onRetry} />
        </PageSection>
      );
    }
    if (is403Error(error)) {
      return (
        <PageSection hasBodyWrapper={false} isFilled>
          <AccessDeniedError resourceName="this project" />
        </PageSection>
      );
    }
    if (isConnectionError(error)) {
      return (
        <PageSection hasBodyWrapper={false} isFilled>
          <ConnectionError onRetry={onRetry} />
        </PageSection>
      );
    }
    return (
      <PageSection hasBodyWrapper={false} isFilled>
        <EmptyState
          headingLevel="h2"
          titleText="Error loading assets"
          variant={EmptyStateVariant.lg}
        >
          <EmptyStateBody>{error.message}</EmptyStateBody>
        </EmptyState>
      </PageSection>
    );
  }

  if (!loaded) {
    return (
      <PageSection hasBodyWrapper={false} isFilled>
        <EmptyState headingLevel="h2" titleText="Loading" variant={EmptyStateVariant.lg}>
          <Spinner size="xl" />
        </EmptyState>
      </PageSection>
    );
  }

  return (
    <>
      <PageSection hasBodyWrapper={false}>
        <Content>
          <Content component="p">
            Select a data registry to view and manage your enterprise data resources. Data
            registries provide a structured and organized way to discover, share, version, and
            connect schemas, datasets, and data sources across your projects.
          </Content>
        </Content>
      </PageSection>
      <PageSection hasBodyWrapper={false}>
        <Toolbar>
          <ToolbarContent>
            {/* Category selector */}
            <ToolbarItem>
              <Select
                isOpen={isCategoryOpen}
                selected={filterCategory}
                onSelect={(_event, value) => {
                  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
                  setFilterCategory(value as FilterCategory);
                  setIsCategoryOpen(false);
                  setIsValueOpen(false);
                }}
                onOpenChange={setIsCategoryOpen}
                toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                  <MenuToggle
                    ref={toggleRef}
                    onClick={() => setIsCategoryOpen((prev) => !prev)}
                    isExpanded={isCategoryOpen}
                    data-testid="filter-category"
                  >
                    <FilterIcon /> {CATEGORY_LABELS[filterCategory]}
                  </MenuToggle>
                )}
              >
                <SelectList>
                  <SelectOption value="labels">Labels</SelectOption>
                  <SelectOption value="assetType">Asset type</SelectOption>
                  <SelectOption value="format">Format</SelectOption>
                </SelectList>
              </Select>
            </ToolbarItem>
            {/* Value selector */}
            <ToolbarItem>{renderValueDropdown()}</ToolbarItem>
            {/* Search */}
            <ToolbarItem>
              <SearchInput
                placeholder="Filter by name, descript..."
                value={searchText}
                onChange={(_event, value) => {
                  setSearchText(value);
                  setPage(1);
                }}
                onClear={() => {
                  setSearchText('');
                  setPage(1);
                }}
                data-testid="asset-search"
              />
            </ToolbarItem>
            {/* Register data button */}
            <ToolbarItem>
              <Button
                variant="primary"
                onClick={onRegisterData}
                isDisabled={!hasWriteAccess}
                data-testid="register-data-button"
              >
                Register data
              </Button>
            </ToolbarItem>
            {/* Kebab */}
            <ToolbarItem>
              <Dropdown
                isOpen={isKebabOpen}
                onSelect={() => setIsKebabOpen(false)}
                onOpenChange={setIsKebabOpen}
                toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                  <MenuToggle
                    ref={toggleRef}
                    onClick={() => setIsKebabOpen((prev) => !prev)}
                    isExpanded={isKebabOpen}
                    variant="plain"
                    aria-label="Actions"
                    data-testid="registry-kebab"
                  >
                    <EllipsisVIcon />
                  </MenuToggle>
                )}
              >
                <DropdownList>
                  <DropdownItem
                    key="manage-collections"
                    onClick={onManageCollections}
                    isDisabled={!hasWriteAccess}
                    data-testid="manage-collections-action"
                  >
                    Manage collections
                  </DropdownItem>
                  <DropdownItem
                    key="manage-labels"
                    onClick={onManageLabels}
                    isDisabled={!hasWriteAccess}
                    data-testid="manage-labels-action"
                  >
                    Manage labels
                  </DropdownItem>
                </DropdownList>
              </Dropdown>
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>

        {/* Active filter chips */}
        {hasActiveFilters ? (
          <>
            <Flex spaceItems={{ default: 'spaceItemsMd' }}>
              {selectedLabels.length > 0 ? (
                <FlexItem>
                  <div className="pf-v6-u-display-inline-flex">
                    <LabelGroup
                      categoryName="Labels"
                      numLabels={3}
                      expandedText="Show less"
                      collapsedText={`${selectedLabels.length - 3} more`}
                    >
                      {selectedLabels.map((l) => (
                        <Label
                          key={l}
                          variant="outline"
                          onClose={() => setSelectedLabels((prev) => prev.filter((x) => x !== l))}
                        >
                          {l}
                        </Label>
                      ))}
                    </LabelGroup>
                  </div>
                </FlexItem>
              ) : null}
              {selectedAssetType ? (
                <FlexItem>
                  <div className="pf-v6-u-display-inline-flex">
                    <LabelGroup categoryName="Asset type">
                      <Label variant="outline" onClose={() => setSelectedAssetType('')}>
                        {selectedAssetType}
                      </Label>
                    </LabelGroup>
                  </div>
                </FlexItem>
              ) : null}
              {selectedFormat ? (
                <FlexItem>
                  <div className="pf-v6-u-display-inline-flex">
                    <LabelGroup categoryName="Format">
                      <Label variant="outline" onClose={() => setSelectedFormat('')}>
                        {FORMAT_OPTIONS.find((f) => f.key === selectedFormat)?.label ||
                          selectedFormat}
                      </Label>
                    </LabelGroup>
                  </div>
                </FlexItem>
              ) : null}
            </Flex>
            <Button variant="link" isInline onClick={clearAllFilters}>
              Clear all filters
            </Button>
          </>
        ) : null}

        {filteredAssets.length > 0 ? (
          <Pagination
            itemCount={filteredAssets.length}
            perPage={perPage}
            page={currentPage}
            onSetPage={(_event, p) => setPage(p)}
            onPerPageSelect={(_event, pp) => {
              setPerPage(pp);
              setPage(1);
            }}
            perPageOptions={[
              { title: '10', value: 10 },
              { title: '20', value: 20 },
              { title: '50', value: 50 },
              { title: '100', value: 100 },
            ]}
            data-testid="registry-pagination"
          />
        ) : null}
        <Table aria-label="Registry assets" data-testid="registry-table">
          <Thead>
            <Tr>
              <Th sort={getSortParams(0)}>Name</Th>
              <Th sort={getSortParams(1)}>Format</Th>
              <Th sort={getSortParams(2)}>Asset location</Th>
              <Th>Labels</Th>
              <Th screenReaderText="Actions" />
            </Tr>
          </Thead>
          <Tbody>
            {filteredAssets.length === 0 ? (
              <Tr>
                <Td colSpan={5}>
                  <EmptyState
                    headingLevel="h3"
                    titleText="No assets found"
                    variant={EmptyStateVariant.sm}
                  >
                    <EmptyStateBody>
                      {hasActiveFilters
                        ? 'Try adjusting your filters.'
                        : 'No data assets have been registered in this project yet.'}
                    </EmptyStateBody>
                  </EmptyState>
                </Td>
              </Tr>
            ) : (
              paginatedAssets.map((asset) => {
                const badge = getFormatBadge(asset.format);
                const assetKey = JSON.stringify([asset.assetType, asset.collection, asset.name]);
                const assetTestId = (prefix: string) =>
                  `${prefix}-${asset.assetType}-${asset.collection}-${asset.name}`;
                return (
                  <Tr key={assetKey}>
                    <Td dataLabel="Name">
                      <Button
                        variant="link"
                        isInline
                        component={(props) => (
                          <Link
                            {...props}
                            to={assetDetailUrl(
                              project,
                              asset.collection,
                              asset.name,
                              asset.assetType,
                            )}
                          />
                        )}
                      >
                        {asset.name}
                      </Button>
                      {asset.description ? (
                        <Content component="small">{asset.description}</Content>
                      ) : null}
                    </Td>
                    <Td dataLabel="Format">
                      <Label color={badge.color}>{asset.format}</Label>{' '}
                      <Content component="small">{badge.text}</Content>
                    </Td>
                    <Td dataLabel="Asset location">{asset.connectionRef || asset.location}</Td>
                    <Td dataLabel="Labels">
                      {asset.labels.length > 0 ? (
                        <LabelGroup>
                          {asset.labels.map((label) => (
                            <Label key={label} isCompact>
                              {label}
                            </Label>
                          ))}
                        </LabelGroup>
                      ) : null}
                    </Td>
                    <Td isActionCell data-testid={assetTestId('asset-actions-cell')}>
                      <Dropdown
                        isOpen={activeActionsAsset === assetKey}
                        onSelect={() => setActiveActionsAsset(undefined)}
                        onOpenChange={(isOpen) =>
                          setActiveActionsAsset(isOpen ? assetKey : undefined)
                        }
                        toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                          <MenuToggle
                            ref={toggleRef}
                            variant="plain"
                            isExpanded={activeActionsAsset === assetKey}
                            aria-label={`Actions for ${asset.name}`}
                            data-testid={assetTestId('asset-actions')}
                            onClick={() =>
                              setActiveActionsAsset((current) =>
                                current === assetKey ? undefined : assetKey,
                              )
                            }
                          >
                            <EllipsisVIcon />
                          </MenuToggle>
                        )}
                        popperProps={{ position: 'right' }}
                      >
                        <DropdownList>
                          <DropdownItem
                            key="edit"
                            onClick={() =>
                              navigate(
                                `${assetDetailUrl(
                                  project,
                                  asset.collection,
                                  asset.name,
                                  asset.assetType,
                                )}?edit=true`,
                              )
                            }
                            data-testid={assetTestId('asset-edit')}
                          >
                            Edit
                          </DropdownItem>
                          <DropdownItem
                            key="delete"
                            onClick={() => setDeleteAsset(asset)}
                            data-testid={assetTestId('asset-delete')}
                          >
                            Delete
                          </DropdownItem>
                        </DropdownList>
                      </Dropdown>
                    </Td>
                  </Tr>
                );
              })
            )}
          </Tbody>
        </Table>
      </PageSection>
      {deleteAsset ? (
        <DeleteAssetModal
          assetName={deleteAsset.name}
          assetType={deleteAsset.assetType}
          onDelete={() => handleDelete(deleteAsset)}
          onClose={() => setDeleteAsset(null)}
        />
      ) : null}
    </>
  );
};

export default RegistryTable;
