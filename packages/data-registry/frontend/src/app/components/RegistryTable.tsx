import React from 'react';
import {
  PageSection,
  Content,
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
  EmptyStateFooter,
  EmptyStateActions,
  EmptyStateVariant,
  Spinner,
  Flex,
  FlexItem,
  Pagination,
  Dropdown,
  DropdownList,
  DropdownItem,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import { FilterIcon, EllipsisVIcon } from '@patternfly/react-icons';
import { Table, Thead, Tr, Th, Tbody, Td, ThProps } from '@patternfly/react-table';
import { Link } from 'react-router-dom';
import { RegistryAsset } from '~/app/hooks/useAssets';
import {
  deleteGenericTable,
  deleteVolume,
  is503Error,
  is403Error,
  isConnectionError,
} from '~/app/api/dataRegistry';
import { useNotification } from '~/app/hooks/useNotification';
import { assetDetailUrl, projectConnectionsUrl } from '~/app/utilities/routes';
import { getFormatBadge, FORMAT_OPTIONS } from '~/app/utilities/formatUtils';
import AccessDeniedError from '~/app/components/errors/AccessDeniedError';
import ConnectionError from '~/app/components/errors/ConnectionError';
import ConnectionRefLink from '~/app/components/ConnectionRefLink';
import { ConnectionModel } from '~/app/types';
import ServiceUnavailableError from '~/app/components/errors/ServiceUnavailableError';
import noAssetsImage from '~/images/no-assets.png';
import DeleteAssetModal from './DeleteAssetModal';
import EditAssetModal from './EditAssetModal';
import './RegistryTable.scss';

type RegistryTableProps = {
  assets: RegistryAsset[];
  loaded: boolean;
  error: Error | undefined;
  labels: string[];
  project: string;
  connections?: ConnectionModel[];
  onManageCollections: () => void;
  onManageLabels: () => void;
  onRegisterData: () => void;
  onRetry: () => void;
  hasWriteAccess?: boolean;
};

type FilterCategory = 'labels' | 'assetType' | 'format';

const getSearchableValues = (value: unknown): string[] => {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return [String(value)];
  }
  if (Array.isArray(value)) {
    return value.flatMap(getSearchableValues);
  }
  if (value && typeof value === 'object') {
    return Object.values(value).flatMap(getSearchableValues);
  }
  return [];
};

const getSearchableAssetText = (asset: RegistryAsset): string =>
  [
    asset.name,
    asset.description,
    asset.format,
    asset.assetType,
    asset.location,
    asset.connectionRef,
    asset.collection,
    ...asset.labels,
    ...Object.entries(asset.properties).flatMap(([key, value]) => [key, value]),
    ...(asset.rawAsset ? getSearchableValues(asset.rawAsset) : []),
  ]
    .join(' ')
    .toLowerCase();

const CATEGORY_LABELS: Record<FilterCategory, string> = {
  labels: 'Labels',
  assetType: 'Asset type',
  format: 'Format',
};

const EMPTY_REGISTRY_DESCRIPTION =
  'Data assets point to the exact location within a connection where information is located, and can be used across workbenches and pipelines in your project. To get started, create a data asset.';

const EmptyRegistryStateIcon: React.FC<React.ImgHTMLAttributes<HTMLImageElement>> = ({
  className,
  ...props
}) => (
  <img
    {...props}
    className={`odh-data-registry__empty-state-image ${className ?? ''}`}
    src={noAssetsImage}
    alt=""
    data-testid="registry-empty-state-image"
  />
);

const RegistryTable: React.FC<RegistryTableProps> = ({
  assets,
  loaded,
  error,
  labels,
  project,
  connections = [],
  onManageCollections,
  onManageLabels,
  onRegisterData,
  onRetry,
  hasWriteAccess = true,
}) => {
  const notification = useNotification();
  const [searchText, setSearchText] = React.useState('');
  const [filterCategory, setFilterCategory] = React.useState<FilterCategory>('labels');
  const [isCategoryOpen, setIsCategoryOpen] = React.useState(false);
  const [isValueOpen, setIsValueOpen] = React.useState(false);
  const [selectedLabels, setSelectedLabels] = React.useState<string[]>([]);
  const [selectedAssetTypes, setSelectedAssetTypes] = React.useState<string[]>([]);
  const [selectedFormats, setSelectedFormats] = React.useState<string[]>([]);
  const [isKebabOpen, setIsKebabOpen] = React.useState(false);
  const [activeActionsAsset, setActiveActionsAsset] = React.useState<string>();
  const [deleteAsset, setDeleteAsset] = React.useState<RegistryAsset | null>(null);
  const [editAsset, setEditAsset] = React.useState<RegistryAsset | null>(null);
  const [activeSortIndex, setActiveSortIndex] = React.useState<number | undefined>(undefined);
  const [activeSortDirection, setActiveSortDirection] = React.useState<'asc' | 'desc'>('asc');
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);

  const hasActiveFilters =
    selectedLabels.length > 0 ||
    selectedAssetTypes.length > 0 ||
    selectedFormats.length > 0 ||
    !!searchText;

  const clearAllFilters = React.useCallback(() => {
    setSelectedLabels([]);
    setSelectedAssetTypes([]);
    setSelectedFormats([]);
    setSearchText('');
    setPage(1);
  }, []);

  const filteredAssets = React.useMemo(() => {
    let result = assets;
    if (searchText) {
      const lower = searchText.toLowerCase();
      result = result.filter((a) => getSearchableAssetText(a).includes(lower));
    }
    if (selectedLabels.length > 0) {
      result = result.filter((a) => selectedLabels.some((l) => a.labels.includes(l)));
    }
    if (selectedAssetTypes.length > 0) {
      result = result.filter((a) =>
        selectedAssetTypes.some((selectedAssetType) =>
          selectedAssetType === 'Structured' ? a.assetType === 'table' : a.assetType === 'volume',
        ),
      );
    }
    if (selectedFormats.length > 0) {
      result = result.filter((a) =>
        selectedFormats.some((selectedFormat) => {
          const selectedOption = FORMAT_OPTIONS.find((option) => option.key === selectedFormat);
          return (
            a.format.toLowerCase() === (selectedOption?.value ?? selectedFormat).toLowerCase() &&
            (!selectedOption || a.assetType === selectedOption.assetType)
          );
        }),
      );
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
    selectedAssetTypes,
    selectedFormats,
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

  const handleEditSaved = React.useCallback(() => {
    setEditAsset(null);
    onRetry();
  }, [onRetry]);

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
              className="odh-data-registry-registry-table__filter-value"
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
            {labels.length > 0 ? (
              labels.map((label) => (
                <SelectOption
                  key={label}
                  value={label}
                  hasCheckbox
                  isSelected={selectedLabels.includes(label)}
                >
                  {label}
                </SelectOption>
              ))
            ) : (
              <SelectOption value="no-labels" isDisabled>
                No labels found.
              </SelectOption>
            )}
          </SelectList>
        </Select>
      );
    }

    if (filterCategory === 'assetType') {
      return (
        <Select
          isOpen={isValueOpen}
          selected={selectedAssetTypes}
          onSelect={(_event, value) => {
            const assetType = String(value);
            setSelectedAssetTypes((prev) =>
              prev.includes(assetType)
                ? prev.filter((item) => item !== assetType)
                : [...prev, assetType],
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
              className="odh-data-registry-registry-table__filter-value"
            >
              All asset types{' '}
              {selectedAssetTypes.length > 0 ? (
                <Label isCompact color="blue">
                  {selectedAssetTypes.length}
                </Label>
              ) : null}
            </MenuToggle>
          )}
        >
          <SelectList>
            <SelectOption
              value="Structured"
              hasCheckbox
              isSelected={selectedAssetTypes.includes('Structured')}
            >
              Structured
            </SelectOption>
            <SelectOption
              value="Unstructured"
              hasCheckbox
              isSelected={selectedAssetTypes.includes('Unstructured')}
            >
              Unstructured
            </SelectOption>
          </SelectList>
        </Select>
      );
    }

    return (
      <Select
        isOpen={isValueOpen}
        selected={selectedFormats}
        maxMenuHeight="300px"
        onSelect={(_event, value) => {
          const format = String(value);
          setSelectedFormats((prev) =>
            prev.includes(format) ? prev.filter((item) => item !== format) : [...prev, format],
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
            className="odh-data-registry-registry-table__filter-value"
          >
            All formats{' '}
            {selectedFormats.length > 0 ? (
              <Label isCompact color="blue">
                {selectedFormats.length}
              </Label>
            ) : null}
          </MenuToggle>
        )}
      >
        <SelectList>
          {FORMAT_OPTIONS.map((f) => (
            <SelectOption
              key={f.key}
              value={f.key}
              hasCheckbox
              isSelected={selectedFormats.includes(f.key)}
            >
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
      <PageSection hasBodyWrapper={false} className="odh-data-registry-registry-table">
        <Toolbar
          className={assets.length === 0 ? 'pf-v6-u-display-none' : undefined}
          data-testid="registry-toolbar"
        >
          <ToolbarContent>
            <ToolbarGroup variant="filter-group">
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
                      icon={<FilterIcon />}
                      className="odh-data-registry-registry-table__filter-category"
                    >
                      {CATEGORY_LABELS[filterCategory]}
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
                  placeholder="Filter by name, description, properties or labels"
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
                  className="odh-data-registry-registry-table__search"
                />
              </ToolbarItem>
            </ToolbarGroup>
            {/* Register data button */}
            {assets.length > 0 ? (
              <ToolbarGroup variant="action-group-plain">
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
              </ToolbarGroup>
            ) : null}
            {/* Kebab */}
            <ToolbarGroup variant="action-group-plain">
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
            </ToolbarGroup>
            {assets.length > 0 && filteredAssets.length > 0 ? (
              <ToolbarGroup align={{ default: 'alignEnd' }}>
                <ToolbarItem>
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
                </ToolbarItem>
              </ToolbarGroup>
            ) : null}
          </ToolbarContent>

          {assets.length > 0 && hasActiveFilters ? (
            <ToolbarContent>
              <ToolbarGroup>
                <ToolbarItem>
                  <Flex
                    gap={{ default: 'gapSm' }}
                    wrap="wrap"
                    alignItems={{ default: 'alignItemsCenter' }}
                  >
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
                                onClose={() =>
                                  setSelectedLabels((prev) => prev.filter((x) => x !== l))
                                }
                              >
                                {l}
                              </Label>
                            ))}
                          </LabelGroup>
                        </div>
                      </FlexItem>
                    ) : null}
                    {selectedAssetTypes.length > 0 ? (
                      <FlexItem>
                        <div className="pf-v6-u-display-inline-flex">
                          <LabelGroup
                            categoryName="Asset type"
                            numLabels={3}
                            expandedText="Show less"
                            collapsedText={`${selectedAssetTypes.length - 3} more`}
                          >
                            {selectedAssetTypes.map((selectedAssetType) => (
                              <Label
                                key={selectedAssetType}
                                variant="outline"
                                onClose={() =>
                                  setSelectedAssetTypes((prev) =>
                                    prev.filter((assetType) => assetType !== selectedAssetType),
                                  )
                                }
                              >
                                {selectedAssetType}
                              </Label>
                            ))}
                          </LabelGroup>
                        </div>
                      </FlexItem>
                    ) : null}
                    {selectedFormats.length > 0 ? (
                      <FlexItem>
                        <div className="pf-v6-u-display-inline-flex">
                          <LabelGroup
                            categoryName="Format"
                            numLabels={3}
                            expandedText="Show less"
                            collapsedText={`${selectedFormats.length - 3} more`}
                          >
                            {selectedFormats.map((selectedFormat) => (
                              <Label
                                key={selectedFormat}
                                variant="outline"
                                onClose={() =>
                                  setSelectedFormats((prev) =>
                                    prev.filter((format) => format !== selectedFormat),
                                  )
                                }
                              >
                                {FORMAT_OPTIONS.find((f) => f.key === selectedFormat)?.label ||
                                  selectedFormat}
                              </Label>
                            ))}
                          </LabelGroup>
                        </div>
                      </FlexItem>
                    ) : null}
                    <FlexItem>
                      <Button variant="link" isInline onClick={clearAllFilters}>
                        Clear all filters
                      </Button>
                    </FlexItem>
                  </Flex>
                </ToolbarItem>
              </ToolbarGroup>
            </ToolbarContent>
          ) : null}
        </Toolbar>

        <Table aria-label="Registry assets" data-testid="registry-table">
          {assets.length > 0 ? (
            <Thead>
              <Tr>
                <Th sort={getSortParams(0)}>Name</Th>
                <Th sort={getSortParams(1)}>Format</Th>
                <Th sort={getSortParams(2)}>Asset location</Th>
                <Th>Labels</Th>
                <Th screenReaderText="Actions" />
              </Tr>
            </Thead>
          ) : null}
          <Tbody>
            {filteredAssets.length === 0 ? (
              <Tr>
                <Td colSpan={5}>
                  <EmptyState
                    headingLevel="h3"
                    icon={
                      hasActiveFilters && assets.length > 0 ? undefined : EmptyRegistryStateIcon
                    }
                    titleText={
                      hasActiveFilters && assets.length > 0 ? 'No assets found' : 'No data assets'
                    }
                    variant={
                      hasActiveFilters && assets.length > 0
                        ? EmptyStateVariant.sm
                        : EmptyStateVariant.lg
                    }
                    data-testid="registry-empty-state"
                  >
                    {hasActiveFilters && assets.length > 0 ? (
                      <EmptyStateBody>Try adjusting your filters.</EmptyStateBody>
                    ) : (
                      <>
                        <EmptyStateBody data-testid="registry-empty-state-description">
                          {EMPTY_REGISTRY_DESCRIPTION}
                        </EmptyStateBody>
                        <EmptyStateFooter>
                          <EmptyStateActions>
                            <Button
                              variant="primary"
                              onClick={onRegisterData}
                              isDisabled={!hasWriteAccess}
                              data-testid="empty-register-data-button"
                            >
                              Register data
                            </Button>
                          </EmptyStateActions>
                        </EmptyStateFooter>
                      </>
                    )}
                  </EmptyState>
                </Td>
              </Tr>
            ) : (
              paginatedAssets.map((asset) => {
                const badge = getFormatBadge(asset.format);
                const assetKey = JSON.stringify([asset.assetType, asset.collection, asset.name]);
                const connectionType = connections.find(
                  (connection) => connection.name === asset.connectionRef,
                )?.connectionType;
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
                        <strong>{asset.name}</strong>
                      </Button>
                      {asset.description ? (
                        <Content component="small">{asset.description}</Content>
                      ) : null}
                    </Td>
                    <Td dataLabel="Format">
                      <Label variant="outline" color={badge.color}>
                        {FORMAT_OPTIONS.find(
                          (option) =>
                            option.value === asset.format && option.assetType === asset.assetType,
                        )?.label || asset.format}
                      </Label>
                    </Td>
                    <Td dataLabel="Asset location">
                      {asset.rawAsset?.connection_ref ? (
                        <>
                          <ConnectionRefLink
                            connectionRef={asset.rawAsset.connection_ref}
                            connections={connections}
                            linkTo={projectConnectionsUrl(project)}
                          />
                          {connectionType ? (
                            <Content component="small" data-testid="connection-type">
                              {connectionType}
                            </Content>
                          ) : null}
                        </>
                      ) : (
                        asset.connectionRef || asset.location
                      )}
                    </Td>
                    <Td dataLabel="Labels">
                      {asset.labels.length > 0 ? (
                        <LabelGroup>
                          {asset.labels.map((label) => (
                            <Label key={label} variant="outline" isCompact>
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
                            onClick={() => {
                              if (asset.rawAsset) {
                                setEditAsset(asset);
                              }
                            }}
                            isDisabled={!hasWriteAccess}
                            data-testid={assetTestId('asset-edit')}
                          >
                            Edit
                          </DropdownItem>
                          <DropdownItem
                            key="delete"
                            onClick={() => setDeleteAsset(asset)}
                            isDisabled={!hasWriteAccess}
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
      {editAsset?.rawAsset ? (
        <EditAssetModal
          asset={editAsset.rawAsset}
          assetKind={editAsset.assetType}
          project={project}
          collection={editAsset.collection}
          name={editAsset.name}
          onClose={() => setEditAsset(null)}
          onSaved={handleEditSaved}
        />
      ) : null}
    </>
  );
};

export default RegistryTable;
