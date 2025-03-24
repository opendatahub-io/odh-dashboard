import { FormGroup, Radio } from '@patternfly/react-core';
import React from 'react';
import { HardwareProfileFeatureVisibility } from '~/k8sTypes';
import { MultiSelection, type SelectionOptions } from '~/components/MultiSelection';
import DashboardHelpTooltip from '~/concepts/dashboard/DashboardHelpTooltip';
import { ManageHardwareProfileSectionTitles } from '~/pages/hardwareProfiles/const';
import { HardwareProfileVisibility, ManageHardwareProfileSectionID } from './types';
import { HardwareProfileFeatureVisibilityTitles } from './const';

type HardwareProfileUseCaseSectionProps = {
  visibility: HardwareProfileVisibility;
  setVisibility: (visibility: HardwareProfileVisibility) => void;
};

export const HardwareProfileVisibilitySection: React.FC<HardwareProfileUseCaseSectionProps> = ({
  visibility,
  setVisibility,
}) => {
  const visibilityOptions: SelectionOptions[] = Object.values(HardwareProfileFeatureVisibility).map(
    (value) => ({
      id: value,
      name: HardwareProfileFeatureVisibilityTitles[value],
      selected: visibility.features.includes(value),
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
        isChecked={visibility.isUnlimited}
        onChange={() => {
          setVisibility({ ...visibility, isUnlimited: true });
        }}
      />
      <Radio
        id="limited-features"
        name="features-visibility"
        label="Limited visibility"
        isChecked={!visibility.isUnlimited}
        onChange={() => {
          setVisibility({ ...visibility, isUnlimited: false });
        }}
        body={
          !visibility.isUnlimited && (
            <MultiSelection
              value={visibilityOptions}
              setValue={(value) =>
                setVisibility({
                  ...visibility,
                  features: value.filter((v) => v.selected).map((v) => String(v.id)),
                })
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
