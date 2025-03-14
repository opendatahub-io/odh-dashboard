import { FormGroup, Radio } from '@patternfly/react-core';
import React from 'react';
import { HardwareProfileFeatureVisibility } from '~/k8sTypes';
import { MultiSelection, type SelectionOptions } from '~/components/MultiSelection';
import DashboardHelpTooltip from '~/concepts/dashboard/DashboardHelpTooltip';
import { ManageHardwareProfileSectionTitles } from '~/pages/hardwareProfiles/const';
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
  const [isLimited, setIsLimited] = React.useState(visibility.length > 0);
  const visibilityOptions: SelectionOptions[] = Object.values(HardwareProfileFeatureVisibility).map(
    (value) => ({
      id: value,
      name: HardwareProfileFeatureVisibilityTitles[value],
      selected: visibility.includes(value),
    }),
  );

  return (
    <FormGroup
      label={ManageHardwareProfileSectionTitles[ManageHardwareProfileSectionID.VISIBILITY]}
      fieldId={ManageHardwareProfileSectionID.VISIBILITY}
      labelHelp={
        <DashboardHelpTooltip
          content={
            <>
              Visible features indicate where the hardware profile can be used: in{' '}
              <b>workbenches</b>, during <b>model deployment</b>, and in LAB-tuning <b>pipelines</b>
              .
            </>
          }
        />
      }
    >
      <Radio
        id="all-features"
        name="features-visibility"
        label="Visible everywhere"
        isChecked={!isLimited}
        onChange={() => {
          setIsLimited(false);
          setVisibility([]);
        }}
      />
      <Radio
        id="limited-features"
        name="features-visibility"
        label="Limited visibility"
        isChecked={isLimited}
        onChange={() => setIsLimited(true)}
        body={
          isLimited && (
            <MultiSelection
              value={visibilityOptions}
              setValue={(value) =>
                setVisibility(value.filter((v) => v.selected).map((v) => String(v.id)))
              }
              ariaLabel="Select features"
              placeholder="Select features"
            />
          )
        }
      />
    </FormGroup>
  );
};
