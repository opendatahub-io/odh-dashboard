import {
  readSparseRuntimeDetailTitle,
  readSparseRuntimeOverviewFields,
  readSparseRuntimeStatus,
} from '~/app/utilities/sparseApiFields';
import { AgentRuntimeDetail } from '~/app/types/agentRuntimes';
import { mockAgentRuntime } from '~/__mocks__/mockAgentRuntime';

describe('sparseApiFields', () => {
  it('rejects array-shaped values when reading sparse overview fields', () => {
    const malformed = [] as unknown as AgentRuntimeDetail;

    expect(readSparseRuntimeOverviewFields(malformed)).toEqual({
      displayName: undefined,
      framework: undefined,
      resourceType: undefined,
      workloadStatus: undefined,
      serviceFqdn: undefined,
      endpoints: [],
    });
  });

  it('returns Unknown when detail title fields are malformed', () => {
    const malformed = { name: { invalid: true } } as unknown as AgentRuntimeDetail;

    expect(readSparseRuntimeDetailTitle(malformed)).toBe('Unknown');
  });

  it('falls back to raw name when displayName is absent', () => {
    const detail = { name: 'agent-runtime' } as AgentRuntimeDetail;

    expect(readSparseRuntimeDetailTitle(detail)).toBe('agent-runtime');
  });

  it('returns Unknown when name is whitespace-only', () => {
    const detail = { name: '   ' } as AgentRuntimeDetail;

    expect(readSparseRuntimeDetailTitle(detail)).toBe('Unknown');
  });

  it('prefers workloadStatus and tolerates missing runtime', () => {
    expect(
      readSparseRuntimeStatus(mockAgentRuntime({ status: 'ready' }), {
        workloadStatus: 'failed',
      } as AgentRuntimeDetail),
    ).toBe('failed');
  });
});
