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
  DropdownItem,
  DropdownList,
} from '@patternfly/react-core';
import { FilterIcon, EllipsisVIcon } from '@patternfly/react-icons';
import { Table, Thead, Tr, Th, Tbody, Td, ThProps } from '@patternfly/react-table';
import { RegistryAsset } from '~/app/hooks/useAssets';

type RegistryTableProps = {
  assets: RegistryAsset[];
  loaded: boolean;
  error: Error | undefined;
  labels: string[];
  onManageCollections: () => void;
  onRegisterData: () => void;
};

type FilterCategory = 'labels' | 'assetType' | 'format';

const FORMAT_LABELS: Record<
  string,
  { text: string; color: 'blue' | 'green' | 'orange' | 'purple' | 'grey' }
> = {
  iceberg: { text: 'Structured', color: 'blue' },
  parquet: { text: 'Structured', color: 'blue' },
  csv: { text: 'Structured', color: 'blue' },
  postgresql: { text: 'Structured', color: 'blue' },
  mysql: { text: 'Structured', color: 'blue' },
  milvus: { text: 'Structured', color: 'blue' },
  delta: { text: 'Structured', color: 'blue' },
  'application/pdf': { text: 'Unstructured', color: 'orange' },
  pdf: { text: 'Unstructured', color: 'orange' },
  documents: { text: 'Unstructured', color: 'orange' },
  images: { text: 'Unstructured', color: 'orange' },
  audio: { text: 'Unstructured', color: 'orange' },
  video: { text: 'Unstructured', color: 'orange' },
  binary: { text: 'Unstructured', color: 'orange' },
  other: { text: 'Unstructured', color: 'orange' },
};

const UNSTRUCTURED_FORMATS = [
  'documents',
  'images',
  'audio',
  'video',
  'binary',
  'other',
  'application/pdf',
  'pdf',
];

const FORMAT_OPTIONS: { key: string; label: string }[] = [
  { key: 'iceberg', label: 'Apache Iceberg' },
  { key: 'parquet', label: 'Apache Parquet' },
  { key: 'csv', label: 'CSV' },
  { key: 'delta', label: 'Delta Lake' },
  { key: 'postgresql', label: 'PostgreSQL' },
  { key: 'milvus', label: 'Milvus' },
  { key: 'documents', label: 'Documents' },
  { key: 'images', label: 'Images' },
  { key: 'audio', label: 'Audio' },
  { key: 'video', label: 'Video' },
  { key: 'binary', label: 'Binary' },
  { key: 'other', label: 'Other' },
];

const CATEGORY_LABELS: Record<FilterCategory, string> = {
  labels: 'Labels',
  assetType: 'Asset type',
  format: 'Format',
};

const getFormatBadge = (
  format: string,
): { text: string; color: 'blue' | 'green' | 'orange' | 'purple' | 'grey' } =>
  FORMAT_LABELS[format.toLowerCase()] ?? { text: 'Unknown', color: 'grey' };

const isStructured = (format: string): boolean =>
  !UNSTRUCTURED_FORMATS.includes(format.toLowerCase());

const RegistryTable: React.FC<RegistryTableProps> = ({
  assets,
  loaded,
  error,
  labels,
  onManageCollections,
  onRegisterData,
}) => {
  const [searchText, setSearchText] = React.useState('');
  const [filterCategory, setFilterCategory] = React.useState<FilterCategory>('labels');
  const [isCategoryOpen, setIsCategoryOpen] = React.useState(false);
  const [isValueOpen, setIsValueOpen] = React.useState(false);
  const [selectedLabels, setSelectedLabels] = React.useState<string[]>([]);
  const [selectedAssetType, setSelectedAssetType] = React.useState('');
  const [selectedFormat, setSelectedFormat] = React.useState('');
  const [isKebabOpen, setIsKebabOpen] = React.useState(false);
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

  const getSortParams = (columnIndex: number): ThProps['sort'] => ({
    sortBy: { index: activeSortIndex, direction: activeSortDirection },
    onSort: (_event, index, direction) => {
      setActiveSortIndex(index);
      setActiveSortDirection(direction);
    },
    columnIndex,
  });

  // Value dropdown content based on category
  const renderValueDropdown = () => {
    if (filterCategory === 'labels') {
      return (
        <Select
          isOpen={isValueOpen}
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
          <SelectList style={{ maxHeight: '300px', overflowY: 'auto' }}>
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
        <SelectList style={{ maxHeight: '300px', overflowY: 'auto' }}>
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
              <Button variant="primary" onClick={onRegisterData} data-testid="register-data-button">
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
                    data-testid="manage-collections-action"
                  >
                    Manage collections
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
            page={page}
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
              filteredAssets.slice((page - 1) * perPage, page * perPage).map((asset) => {
                const badge = getFormatBadge(asset.format);
                return (
                  <Tr key={`${asset.collection}-${asset.name}`}>
                    <Td dataLabel="Name">
                      <Button variant="link" isInline>
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
                    {/* TODO: Wire up per-row actions (edit, delete) when detail view is implemented */}
                    <Td isActionCell />
                  </Tr>
                );
              })
            )}
          </Tbody>
        </Table>
      </PageSection>
    </>
  );
};

export default RegistryTable;
