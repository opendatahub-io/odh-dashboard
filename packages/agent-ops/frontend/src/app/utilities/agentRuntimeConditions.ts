import { AgentRuntimeCondition } from '~/app/types/agentRuntimes';

const isConditionTrue = (status: string | undefined): boolean =>
  status?.trim().toLowerCase() === 'true';

export const getAgentRuntimeStatusMessage = (
  conditions?: AgentRuntimeCondition[],
): string | undefined => {
  if (!conditions?.length) {
    return undefined;
  }

  const readyCondition = conditions.find((condition) => condition.type === 'Ready');
  if (readyCondition) {
    if (!isConditionTrue(readyCondition.status)) {
      return readyCondition.message?.trim() || readyCondition.reason?.trim() || undefined;
    }

    return readyCondition.message?.trim() || undefined;
  }

  const conditionWithMessage = conditions.find((condition) => condition.message?.trim());
  return conditionWithMessage?.message?.trim();
};
