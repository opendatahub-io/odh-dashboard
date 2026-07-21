import { hasEnrichedAgentCard } from '~/app/utilities/agentCardUtils';
import { mockAgentCardDetail } from '~/__mocks__/mockAgentRuntime';

describe('hasEnrichedAgentCard', () => {
  it('should return false when agent card is null', () => {
    expect(hasEnrichedAgentCard(null)).toBe(false);
    expect(hasEnrichedAgentCard(undefined)).toBe(false);
  });

  it('should return false for sparse cards with only HTTP protocol', () => {
    expect(
      hasEnrichedAgentCard({
        name: 'Sparse Agent',
        defaultInputModes: [],
        defaultOutputModes: [],
        capabilities: {
          streaming: false,
          pushNotifications: false,
          optional: [],
        },
        protocols: ['HTTP'],
      }),
    ).toBe(false);
  });

  it('should return true when only non-HTTP protocols are present', () => {
    expect(
      hasEnrichedAgentCard({
        name: 'HTTPS Agent',
        defaultInputModes: [],
        defaultOutputModes: [],
        capabilities: {
          streaming: false,
          pushNotifications: false,
          optional: [],
        },
        protocols: ['HTTPS'],
      }),
    ).toBe(true);
  });

  it('should return true when enriched metadata is present', () => {
    expect(hasEnrichedAgentCard(mockAgentCardDetail())).toBe(true);
    expect(hasEnrichedAgentCard(mockAgentCardDetail({ version: '1.0.0', skills: [] }))).toBe(true);
  });
});
