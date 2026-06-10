import {
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Radio,
} from '@patternfly/react-core';
import React from 'react';
import { HardwareProfileFeatureVisibility } from '#~/k8sTypes';
import { MultiSelection, type SelectionOptions } from '#~/components/MultiSelection';
import DashboardHelpTooltip from '#~/concepts/dashboard/DashboardHelpTooltip';
import { ManageHardwareProfileSectionTitles } from '#~/pages/hardwareProfiles/const';
import { ManageHardwareProfileSectionID } from './types';
import { HardwareProfileFeatureVisibilityTitles } from './const';

type HardwareProfileUseCaseSectionProps = {
  visibility: string[];
  setVisibility: (visibility: string[]) => void;
};

export const HardwareProfileVisibilitySection: React.FC<HardwareProfileUseCaseSectionProps> = ({
  visibility,
  setVisibility,
}) => {
  const [isLimitedOptionSelected, setLimitedOptionSelected] = React.useState(false);
  const [selectedOptions, setSelectedOptions] = React.useState<string[]>([]);
  const visibilityOptions: SelectionOptions[] = React.useMemo(
    () =>
      Object.values(HardwareProfileFeatureVisibility).map((value) => ({
        id: value,
        name: HardwareProfileFeatureVisibilityTitles[value],
        selected: selectedOptions.includes(value),
      })),
    [selectedOptions],
  );

  React.useEffect(() => {
    if (visibility.length === 0) {
      setLimitedOptionSelected(false);
    } else {
      setLimitedOptionSelected(true);
      setSelectedOptions(visibility);
    }
  }, [visibility]);

  return (
    <FormGroup
      label={ManageHardwareProfileSectionTitles[ManageHardwareProfileSectionID.VISIBILITY]}
      fieldId={ManageHardwareProfileSectionID.VISIBILITY}
      labelHelp={
        <DashboardHelpTooltip
          content={
            <>
              Workload type indicates which workloads this hardware profile is available for:{' '}
              <b>workbenches</b> and <b>model deployment</b>.
            </>
          }
        />
      }
    >
      <FormHelperText>
        <HelperText>
          <HelperTextItem>
            Select which workloads to make this hardware profile available to.
          </HelperTextItem>
        </HelperText>
      </FormHelperText>
      <Radio
        id="all-features"
        name="features-visibility"
        label="All workloads"
        isChecked={!isLimitedOptionSelected}
        onChange={() => {
          setLimitedOptionSelected(false);
          setVisibility([]);
        }}
      />
      <Radio
        id="limited-features"
        name="features-visibility"
        label="Select workloads"
        isChecked={isLimitedOptionSelected}
        onChange={() => {
          setLimitedOptionSelected(true);
          if (selectedOptions.length !== 0) {
            setVisibility(selectedOptions);
          }
        }}
        body={
          isLimitedOptionSelected && (
            <MultiSelection
              value={visibilityOptions}
              setValue={(value) => {
                const selected = value.filter((v) => v.selected).map((v) => String(v.id));
                setVisibility(selected);
                setSelectedOptions(selected);
              }}
              ariaLabel="Select workloads"
              placeholder="Select workloads"
            />
          )
        }
      />
    </FormGroup>
  );
};
