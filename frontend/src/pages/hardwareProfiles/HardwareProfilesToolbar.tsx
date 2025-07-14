import React from 'react';
import { Button, SearchInput, ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import FilterToolbar from '#~/components/FilterToolbar';
import {
  HardwareProfileEnableType,
  HardwareProfileFilterDataType,
  HardwareProfileFilterOptions,
  hardwareProfileFilterOptions,
} from '#~/pages/hardwareProfiles/const';
import SimpleSelect, { SimpleSelectOption } from '#~/components/SimpleSelect';
import { AccessAllowed, verbModelAccess } from '#~/concepts/userSSAR';
import { HardwareProfileModel } from '#~/api';
import { HardwareProfileFeatureVisibility } from '#~/k8sTypes';
import { HardwareProfileFeatureVisibilityTitles } from './manage/const';

type HardwareProfilesToolbarProps = {
  filterData: HardwareProfileFilterDataType;
  onFilterUpdate: (key: string, value?: string | { label: string; value: string }) => void;
  showCreateButton?: boolean;
};

const HardwareProfilesToolbar: React.FC<HardwareProfilesToolbarProps> = ({
  filterData,
  onFilterUpdate,
  showCreateButton = true,
}) => {
  const navigate = useNavigate();

  return (
    <FilterToolbar<keyof typeof hardwareProfileFilterOptions>
      data-testid="hardware-profiles-table-toolbar"
      filterOptions={hardwareProfileFilterOptions}
      filterOptionRenders={{
        [HardwareProfileFilterOptions.name]: ({ onChange, ...props }) => (
          <SearchInput
            {...props}
            aria-label="Filter by name"
            placeholder="Filter by name"
            onChange={(_event, value) => onChange(value)}
          />
        ),
        [HardwareProfileFilterOptions.enabled]: ({ value, onChange, ...props }) => (
          <SimpleSelect
            {...props}
            dataTestId="hardware-profile-filter-enable-select"
            value={value}
            aria-label="Hardware profile enablement"
            options={Object.values(HardwareProfileEnableType).map((v) => ({
              key: v,
              label: v,
            }))}
            onChange={(v) => onChange(v)}
            popperProps={{ maxWidth: undefined }}
          />
        ),
        [HardwareProfileFilterOptions.visibility]: ({ value, onChange, ...props }) => (
          <SimpleSelect
            {...props}
            dataTestId="hardware-profile-filter-use-cases-select"
            value={value}
            aria-label="Hardware profile use cases"
            options={Object.values(HardwareProfileFeatureVisibility).map(
              (v): SimpleSelectOption => ({
                key: v,
                label: HardwareProfileFeatureVisibilityTitles[v],
              }),
            )}
            onChange={(v) => onChange(v)}
            popperProps={{ maxWidth: undefined }}
          />
        ),
      }}
      filterData={filterData}
      onFilterUpdate={onFilterUpdate}
    >
      <AccessAllowed resourceAttributes={verbModelAccess('create', HardwareProfileModel)}>
        {() =>
          showCreateButton && (
            <ToolbarGroup>
              <ToolbarItem>
                <Button
                  data-testid="create-hardware-profile"
                  onClick={() => navigate('/hardwareProfiles/create')}
                >
                  Create hardware profile
                </Button>
              </ToolbarItem>
            </ToolbarGroup>
          )
        }
      </AccessAllowed>
    </FilterToolbar>
  );
};

export default HardwareProfilesToolbar;
