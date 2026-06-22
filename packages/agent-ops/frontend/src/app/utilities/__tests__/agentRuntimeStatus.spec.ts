import {
  AgentRuntimeDisplayStatus,
  getAgentRuntimeStatusSortWeight,
  mapAgentRuntimeStatus,
} from '~/app/utilities/agentRuntimeStatus';

describe('mapAgentRuntimeStatus', () => {
  it.each([
    ['Ready', AgentRuntimeDisplayStatus.Ready, 'success', undefined],
    ['ready', AgentRuntimeDisplayStatus.Ready, 'success', undefined],
    ['Running', AgentRuntimeDisplayStatus.Ready, 'success', undefined],
    ['running', AgentRuntimeDisplayStatus.Ready, 'success', undefined],
    ['Pending', AgentRuntimeDisplayStatus.Pending, undefined, 'purple'],
    ['pending', AgentRuntimeDisplayStatus.Pending, undefined, 'purple'],
    ['Failed', AgentRuntimeDisplayStatus.Failed, 'danger', undefined],
    ['failed', AgentRuntimeDisplayStatus.Failed, 'danger', undefined],
    ['Stopped', AgentRuntimeDisplayStatus.Stopped, undefined, 'grey'],
    ['stopped', AgentRuntimeDisplayStatus.Stopped, undefined, 'grey'],
  ] as const)('should map %s to %s', (status, displayStatus, labelStatus, labelColor) => {
    const result = mapAgentRuntimeStatus(status);
    expect(result.displayStatus).toBe(displayStatus);
    expect(result.labelStatus).toBe(labelStatus);
    expect(result.labelColor).toBe(labelColor);
  });

  it('should map failed status to filled danger label', () => {
    expect(mapAgentRuntimeStatus('failed')).toEqual({
      displayStatus: AgentRuntimeDisplayStatus.Failed,
      labelStatus: 'danger',
      labelVariant: 'filled',
    });
  });

  it('should map unknown status to Unknown with grey label', () => {
    const result = mapAgentRuntimeStatus('unknown');
    expect(result).toEqual({
      displayStatus: AgentRuntimeDisplayStatus.Unknown,
      labelColor: 'grey',
    });
  });

  it('should map undefined status to Unknown with grey label', () => {
    const result = mapAgentRuntimeStatus(undefined);
    expect(result).toEqual({
      displayStatus: AgentRuntimeDisplayStatus.Unknown,
      labelColor: 'grey',
    });
  });
});

describe('getAgentRuntimeStatusSortWeight', () => {
  it.each([
    ['Ready', 0],
    ['Pending', 1],
    ['Stopped', 2],
    ['Failed', 3],
    ['unknown', 4],
  ] as const)('should return sort weight %i for %s', (status, weight) => {
    expect(getAgentRuntimeStatusSortWeight(status)).toBe(weight);
  });
});
