import * as React from 'react';
import { FormSection } from '@patternfly/react-core';
import ManageNodeSelectorSection from '#~/pages/hardwareProfiles/manage/ManageNodeSelectorSection.tsx';
import ManageTolerationSection from '#~/pages/hardwareProfiles/manage/ManageTolerationSection.tsx';
import { HardwareProfileKind } from '#~/k8sTypes.ts';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import { ManageHardwareProfileSectionTitles } from '#~/pages/hardwareProfiles/const.tsx';
import { ManageHardwareProfileSectionID } from '#~/pages/hardwareProfiles/manage/types.ts';
import ManageWorkloadStrategySection from '#~/pages/hardwareProfiles/manage/ManageWorkloadStrategySection.tsx';
import { NodeSelector, SchedulingType, Toleration } from '#~/types.ts';
import ManageLocalQueueFieldSection from '#~/pages/hardwareProfiles/manage/ManageLocalQueueFieldSection.tsx';
import ManageWorkloadPrioritySection from '#~/pages/hardwareProfiles/manage/ManageWorkloadPrioritySection.tsx';
import { DEFAULT_PRIORITY_CLASS } from '#~/pages/hardwareProfiles/nodeResource/const.ts';
import useDefaultDsc from '#~/pages/clusterSettings/useDefaultDsc.ts';

type ManageResourceAllocationSectionProps = {
  scheduling: HardwareProfileKind['spec']['scheduling'];
  setScheduling: (updated: HardwareProfileKind['spec']['scheduling']) => void;
  existingType: SchedulingType | undefined;
};

const ManageResourceAllocationSection: React.FC<ManageResourceAllocationSectionProps> = ({
  scheduling,
  setScheduling,
  existingType,
}) => {
  const { status: kueueAvailable } = useIsAreaAvailable(SupportedArea.KUEUE);
  const [dsc, dscLoaded, dscError] = useDefaultDsc();
  const defaultLocalQueueName = dsc?.spec.components?.kueue?.defaultLocalQueueName;
  const isDefaultLocalQueueNameSet = React.useRef(false);

  const {
    type: schedulingType,
    kueue: { localQueueName = '', priorityClass = DEFAULT_PRIORITY_CLASS } = {},
    node: { nodeSelector = {}, tolerations = [] } = {},
  } = scheduling ?? {};

  const setQueue = React.useCallback(
    (overrides: Partial<{ localQueueName: string; priorityClass: string }>) => {
      const updatedPriorityClass = overrides.priorityClass ?? priorityClass;
      setScheduling({
        ...scheduling,
        type: SchedulingType.QUEUE,
        kueue: {
          localQueueName: overrides.localQueueName ?? localQueueName,
          ...(updatedPriorityClass !== DEFAULT_PRIORITY_CLASS && {
            priorityClass: updatedPriorityClass,
          }),
        },
      });
    },
    [localQueueName, priorityClass, setScheduling, scheduling],
  );

  const setNode = React.useCallback(
    (overrides: Partial<{ nodeSelector: NodeSelector; tolerations: Toleration[] }>) =>
      setScheduling({
        ...scheduling,
        type: SchedulingType.NODE,
        node: {
          nodeSelector: overrides.nodeSelector ?? nodeSelector,
          tolerations: overrides.tolerations ?? tolerations,
        },
      }),
    [nodeSelector, tolerations, setScheduling, scheduling],
  );

  const setSchedulingType = React.useCallback(
    (type: SchedulingType) => {
      setScheduling({
        ...scheduling,
        type,
      });
    },
    [setScheduling, scheduling],
  );

  const selectedStrategy =
    schedulingType || (kueueAvailable ? SchedulingType.QUEUE : SchedulingType.NODE);

  React.useEffect(() => {
    if (
      dscLoaded &&
      !dscError &&
      defaultLocalQueueName &&
      !localQueueName &&
      !isDefaultLocalQueueNameSet.current &&
      existingType !== SchedulingType.QUEUE &&
      kueueAvailable
    ) {
      setScheduling({
        ...scheduling,
        type: schedulingType ?? SchedulingType.QUEUE,
        kueue: {
          ...scheduling?.kueue,
          localQueueName: defaultLocalQueueName,
        },
      });
      isDefaultLocalQueueNameSet.current = true;
    }
  }, [
    dscLoaded,
    dscError,
    defaultLocalQueueName,
    localQueueName,
    existingType,
    schedulingType,
    setScheduling,
    scheduling,
    kueueAvailable,
  ]);

  return (
    <FormSection
      title={ManageHardwareProfileSectionTitles[ManageHardwareProfileSectionID.SCHEDULING]}
    >
      <ManageWorkloadStrategySection
        schedulingType={selectedStrategy}
        setSchedulingType={setSchedulingType}
        hideQueueOption={!kueueAvailable && (!existingType || existingType === SchedulingType.NODE)}
        disableQueueOption={
          !kueueAvailable &&
          existingType === SchedulingType.QUEUE &&
          selectedStrategy === SchedulingType.QUEUE
        }
      />

      {schedulingType === SchedulingType.QUEUE || (kueueAvailable && !schedulingType) ? (
        <>
          <ManageLocalQueueFieldSection
            localQueueName={localQueueName}
            setLocalQueueName={(updatedName) => setQueue({ localQueueName: updatedName })}
            disabled={!kueueAvailable}
          />
          <ManageWorkloadPrioritySection
            priorityClass={priorityClass}
            setWorkloadPriority={(updatedPriority) => setQueue({ priorityClass: updatedPriority })}
            disabled={!kueueAvailable}
          />
        </>
      ) : (
        <>
          <ManageNodeSelectorSection
            nodeSelector={nodeSelector}
            setNodeSelector={(updatedSelector) => setNode({ nodeSelector: updatedSelector })}
          />
          <ManageTolerationSection
            tolerations={tolerations}
            setTolerations={(updatedTolerations) => setNode({ tolerations: updatedTolerations })}
          />
        </>
      )}
    </FormSection>
  );
};

export default ManageResourceAllocationSection;
