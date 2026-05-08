import { FormGroup, Stack, StackItem } from '@patternfly/react-core';
import * as React from 'react';
import { ManageHardwareProfileSectionTitles } from '#~/pages/hardwareProfiles/const.tsx';
import { ManageHardwareProfileSectionID } from '#~/pages/hardwareProfiles/manage/types.ts';
import DashboardHelpTooltip from '#~/concepts/dashboard/DashboardHelpTooltip.tsx';
import SimpleSelect, { SimpleSelectOption } from '#~/components/SimpleSelect.tsx';
import useWorkloadPriorityClasses from '#~/concepts/distributedWorkloads/useWorkloadPriorityClasses.ts';
import { WorkloadPriorityClassKind } from '#~/k8sTypes.ts';
import TruncatedText from '#~/components/TruncatedText.tsx';
import {
  DEFAULT_PRIORITY_CLASS,
  HARDWARE_PROFILE_RESOURCE_ALLOCATION_HELP,
  NO_PRIORITY_OPTIONS_CONFIGURED_LABEL,
} from '#~/pages/hardwareProfiles/nodeResource/const.ts';

type ManageWorkloadPrioritySectionProps = {
  priorityClass: string;
  disabled: boolean;
  setWorkloadPriority: (prioritySelection: string) => void;
};

const ManageWorkloadPrioritySection: React.FC<ManageWorkloadPrioritySectionProps> = ({
  priorityClass,
  setWorkloadPriority,
  disabled,
}) => {
  const [workloadPriorityClasses, loaded, error] = useWorkloadPriorityClasses();

  const priorityOptions: SimpleSelectOption[] = React.useMemo(() => {
    const noneOptionWhenEmptyOrLoading = {
      key: DEFAULT_PRIORITY_CLASS,
      label: NO_PRIORITY_OPTIONS_CONFIGURED_LABEL,
      dropdownLabel: NO_PRIORITY_OPTIONS_CONFIGURED_LABEL,
    };

    const noneOptionWhenClassesExist = {
      key: DEFAULT_PRIORITY_CLASS,
      label: DEFAULT_PRIORITY_CLASS,
      dropdownLabel: DEFAULT_PRIORITY_CLASS,
    };

    if (!loaded || error) {
      // If we have a current priorityClass that's not "None", include it in the options
      // This prevents SimpleSelect from auto-calling onChange when the real options haven't loaded yet
      if (priorityClass && priorityClass !== DEFAULT_PRIORITY_CLASS) {
        return [
          noneOptionWhenEmptyOrLoading,
          {
            key: priorityClass,
            label: priorityClass,
            dropdownLabel: priorityClass,
          },
        ];
      }

      return [noneOptionWhenEmptyOrLoading];
    }

    const noneOption =
      workloadPriorityClasses.length > 0
        ? noneOptionWhenClassesExist
        : noneOptionWhenEmptyOrLoading;

    const options = [
      noneOption,
      ...workloadPriorityClasses.map((priority: WorkloadPriorityClassKind) => ({
        key: priority.metadata.name,
        label: priority.metadata.name,
        description: (
          <Stack>
            {priority.description && (
              <StackItem>
                <TruncatedText maxLines={1} content={priority.description} />
              </StackItem>
            )}
            {priority.value && <StackItem>{`Value: ${priority.value.toString()}`}</StackItem>}
          </Stack>
        ),
        dropdownLabel: priority.metadata.name,
      })),
    ];

    return options;
  }, [workloadPriorityClasses, loaded, error, priorityClass]);

  return (
    <FormGroup
      label={ManageHardwareProfileSectionTitles[ManageHardwareProfileSectionID.WORKLOAD_PRIORITY]}
      fieldId={ManageHardwareProfileSectionID.WORKLOAD_PRIORITY}
      labelHelp={
        <DashboardHelpTooltip
          content={
            <>
              <p>{HARDWARE_PROFILE_RESOURCE_ALLOCATION_HELP.workloadPriority}</p>
              <p>{HARDWARE_PROFILE_RESOURCE_ALLOCATION_HELP.workloadPriorityOptions}</p>
            </>
          }
        />
      }
    >
      <SimpleSelect
        value={priorityClass}
        options={priorityOptions}
        onChange={setWorkloadPriority}
        isFullWidth
        previewDescription
        isDisabled={disabled}
        isScrollable
        dataTestId="workload-priority-select"
      />
    </FormGroup>
  );
};

export default ManageWorkloadPrioritySection;
