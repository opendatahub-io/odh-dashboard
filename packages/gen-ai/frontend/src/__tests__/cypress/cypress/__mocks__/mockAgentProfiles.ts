import type { AgentProfileSummary } from '~/app/agentProfile/types';

export interface AgentProfileListResponse {
  data: {
    profiles: AgentProfileSummary[];
    totalCount: number;
  };
}

export const mockAgentProfile = (
  overrides: Partial<AgentProfileSummary> = {},
): AgentProfileSummary => ({
  name: `agent-profile-${overrides.profileId ?? 'test-uuid-1'}`,
  profileId: 'test-uuid-1',
  displayName: 'Coding assistant',
  description: 'Code review and explanation with GitHub tools',
  namespace: 'test-namespace',
  lastModified: '2024-05-19T10:00:00Z',
  ...overrides,
});

export const mockAgentProfiles = (
  profiles?: Partial<AgentProfileSummary>[],
): AgentProfileListResponse => {
  const data =
    profiles && profiles.length > 0
      ? profiles.map((p) => mockAgentProfile(p))
      : [
          mockAgentProfile(),
          mockAgentProfile({
            profileId: 'test-uuid-2',
            displayName: 'Expense report assistant',
            description: 'Handles expense submissions with a friendly tone',
          }),
        ];
  return { data: { profiles: data, totalCount: data.length } };
};

export const mockEmptyAgentProfiles = (): AgentProfileListResponse => ({
  data: { profiles: [], totalCount: 0 },
});
