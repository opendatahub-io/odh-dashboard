import * as React from 'react';
import {
  Badge,
  Checkbox,
  Dropdown,
  Flex,
  FlexItem,
  MenuToggle,
  MenuToggleElement,
  Panel,
  PanelMain,
  SearchInput,
} from '@patternfly/react-core';
import { CatalogPerformanceMetricsArtifact } from '~/app/modelCatalogTypes';
import { getUniqueHardwareConfigurations } from '~/app/pages/modelCatalog/utils/hardwareConfigurationFilterUtils';
import { useHardwareConfigurationFilterState } from '~/app/pages/modelCatalog/utils/hardwareConfigurationFilterState';
import { ModelCatalogContext } from '~/app/context/modelCatalog/ModelCatalogContext';
import { ModelCatalogStringFilterKey } from '~/concepts/modelCatalog/const';

type HardwareConfigurationFilterProps = {
  /** When true, loads options from performanceArtifacts. When false, loads from ModelCatalogContext filterOptions */
  isHardwareConfigurationPage?: boolean;
  /** Performance artifacts to extract hardware configurations from (used when isHardwareConfigurationPage is true) */
  performanceArtifacts?: CatalogPerformanceMetricsArtifact[];
};

type HardwareConfigurationOption = {
  value: string;
  label: string;
};

const HardwareConfigurationFilter: React.FC<HardwareConfigurationFilterProps> = ({
  isHardwareConfigurationPage = false,
  performanceArtifacts = [],
}) => {
  const { appliedHardwareConfigurations, setAppliedHardwareConfigurations } =
    useHardwareConfigurationFilterState();
  const { filterOptions } = React.useContext(ModelCatalogContext);
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState('');

  // Get hardware configuration options based on the source
  const hardwareOptions: HardwareConfigurationOption[] = React.useMemo(() => {
    if (isHardwareConfigurationPage) {
      // Load from performance artifacts for hardware configuration page
      const uniqueConfigurations = getUniqueHardwareConfigurations(performanceArtifacts);
      return uniqueConfigurations.map((config) => ({
        value: config,
        label: config,
      }));
    }
    // Load from ModelCatalogContext filterOptions for model catalog page
    const hardwareConfigOptions =
      filterOptions?.filters?.[ModelCatalogStringFilterKey.HARDWARE_CONFIGURATION];
    if (!hardwareConfigOptions?.values) {
      return [];
    }
    return hardwareConfigOptions.values.map((config) => ({
      value: config,
      label: config,
    }));
  }, [isHardwareConfigurationPage, performanceArtifacts, filterOptions]);

  // Filter options based on search value
  const filteredOptions = React.useMemo(
    () =>
      hardwareOptions.filter(
        (option) =>
          option.label.toLowerCase().includes(searchValue.trim().toLowerCase()) ||
          appliedHardwareConfigurations.includes(option.value),
      ),
    [hardwareOptions, searchValue, appliedHardwareConfigurations],
  );

  const selectedCount = appliedHardwareConfigurations.length;

  const isHardwareSelected = (value: string): boolean =>
    appliedHardwareConfigurations.includes(value);

  const toggleHardwareSelection = (value: string, selected: boolean) => {
    if (selected) {
      setAppliedHardwareConfigurations([...appliedHardwareConfigurations, value]);
    } else {
      setAppliedHardwareConfigurations(
        appliedHardwareConfigurations.filter((item) => item !== value),
      );
    }
  };

  const toggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      ref={toggleRef}
      onClick={() => setIsOpen(!isOpen)}
      isExpanded={isOpen}
      style={{ minWidth: '200px', width: 'fit-content' }}
      badge={selectedCount > 0 ? <Badge>{selectedCount} selected</Badge> : undefined}
    >
      Hardware
    </MenuToggle>
  );

  const filterContent = (
    <Panel>
      <PanelMain className="pf-v6-u-p-md">
        <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
          {/* Search input */}
          <FlexItem>
            <SearchInput
              placeholder="Search hardware"
              value={searchValue}
              onChange={(_event, value) => setSearchValue(value)}
              onClear={() => setSearchValue('')}
            />
          </FlexItem>
          {/* Hardware configuration checkboxes */}
          <FlexItem>
            <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsXs' }}>
              {filteredOptions.length === 0 ? (
                <FlexItem>No results found</FlexItem>
              ) : (
                filteredOptions.map((option) => (
                  <FlexItem key={option.value}>
                    <Flex alignItems={{ default: 'alignItemsCenter' }}>
                      <FlexItem flex={{ default: 'flex_1' }}>
                        <Checkbox
                          label={option.label}
                          id={option.value}
                          isChecked={isHardwareSelected(option.value)}
                          onChange={(_, checked) => toggleHardwareSelection(option.value, checked)}
                        />
                      </FlexItem>
                    </Flex>
                  </FlexItem>
                ))
              )}
            </Flex>
          </FlexItem>
        </Flex>
      </PanelMain>
    </Panel>
  );

  return (
    <Dropdown
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      toggle={toggle}
      shouldFocusToggleOnSelect={false}
    >
      {filterContent}
    </Dropdown>
  );
};

export default HardwareConfigurationFilter;

