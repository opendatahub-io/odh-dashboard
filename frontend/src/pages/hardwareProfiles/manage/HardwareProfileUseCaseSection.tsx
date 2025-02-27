import { FormGroup, Radio } from '@patternfly/react-core';
import React from 'react';
import { HardwareProfileUseCases } from '~/k8sTypes';
import { MultiSelection, type SelectionOptions } from '~/components/MultiSelection';
import DashboardHelpTooltip from '~/concepts/dashboard/DashboardHelpTooltip';
import { ManageHardwareProfileSectionTitles } from '~/pages/hardwareProfiles/const';
import { ManageHardwareProfileSectionID } from './types';
import { HardwareProfileUseCaseTitles } from './const';

type HardwareProfileUseCaseSectionProps = {
  useCases: string[];
  setUseCases: (useCases: string[]) => void;
};

export const HardwareProfileUseCaseSection: React.FC<HardwareProfileUseCaseSectionProps> = ({
  useCases,
  setUseCases,
}) => {
  const [isLimited, setIsLimited] = React.useState(useCases.length > 0);
  const useCaseOptions: SelectionOptions[] = Object.values(HardwareProfileUseCases).map(
    (value) => ({
      id: value,
      name: HardwareProfileUseCaseTitles[value],
      selected: useCases.includes(value),
    }),
  );

  return (
    <FormGroup
      label={ManageHardwareProfileSectionTitles[ManageHardwareProfileSectionID.USE_CASES]}
      fieldId={ManageHardwareProfileSectionID.USE_CASES}
      labelHelp={
        <DashboardHelpTooltip content="Select the areas where this hardware profile can be used." />
      }
    >
      <Radio
        id="all-use-cases"
        name="use-cases-visibility"
        label="All use cases"
        isChecked={!isLimited}
        onChange={() => {
          setIsLimited(false);
          setUseCases([]);
        }}
      />
      <Radio
        id="limited-use-cases"
        name="use-cases-visibility"
        label="Limited use cases"
        isChecked={isLimited}
        onChange={() => setIsLimited(true)}
        body={
          isLimited && (
            <MultiSelection
              value={useCaseOptions}
              setValue={(value) =>
                setUseCases(value.filter((v) => v.selected).map((v) => String(v.id)))
              }
              ariaLabel="Select use cases"
              placeholder="Select use cases"
            />
          )
        }
      />
    </FormGroup>
  );
};
