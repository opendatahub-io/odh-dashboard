import { FormGroup } from '@patternfly/react-core';
import React from 'react';
import { HardwareProfileVisibleIn } from '~/k8sTypes';
import { MultiSelection, type SelectionOptions } from '~/components/MultiSelection';
import DashboardHelpTooltip from '~/concepts/dashboard/DashboardHelpTooltip';
import { ManageHardwareProfileSectionTitles } from '~/pages/hardwareProfiles/const';
import { ManageHardwareProfileSectionID } from './types';

type HardwareProfileVisibilitySectionProps = {
  visibility: string[];
  setVisibility: (visibility: string[]) => void;
};
const OptionTitles: Record<HardwareProfileVisibleIn, string> = {
  [HardwareProfileVisibleIn.NOTEBOOKS]: 'Notebooks',
  [HardwareProfileVisibleIn.SERVING]: 'Model serving',
  [HardwareProfileVisibleIn.INSTRUCTLAB]: 'Instructlab',
};

export const HardwareProfileVisibilitySection: React.FC<HardwareProfileVisibilitySectionProps> = ({
  visibility,
  setVisibility,
}) => {
  const visibilityOptions: SelectionOptions[] = Object.values(HardwareProfileVisibleIn).map(
    (value) => ({
      id: value,
      name: OptionTitles[value],
      selected: visibility.includes(value),
    }),
  );

  return (
    <FormGroup
      label={ManageHardwareProfileSectionTitles[ManageHardwareProfileSectionID.VISIBILITY]}
      fieldId={ManageHardwareProfileSectionID.VISIBILITY}
      labelHelp={
        <DashboardHelpTooltip content="Select the areas where this hardware profile can be used." />
      }
    >
      <MultiSelection
        value={visibilityOptions}
        setValue={(value) =>
          setVisibility(value.filter((v) => v.selected).map((v) => String(v.id)))
        }
        ariaLabel="Select visibility areas"
        placeholder={visibility.length > 0 ? 'Select areas' : 'Visible in all areas'}
      />
    </FormGroup>
  );
};
