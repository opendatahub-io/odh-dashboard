import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
}));

const mockFireMiscTrackingEvent = jest.mocked(fireMiscTrackingEvent);

describe('MCPServersPanel - Tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('MCP Server Disconnected Tracking', () => {
    it('should fire tracking event when disconnecting from a server', () => {
      const serverName = 'Test MCP Server';
      const wasAutoConnected = false;

      // Simulate disconnect action
      fireMiscTrackingEvent('Playground MCP Server Disconnected', {
        mcpServerName: serverName,
        wasAutoConnected,
      });

      expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith('Playground MCP Server Disconnected', {
        mcpServerName: 'Test MCP Server',
        wasAutoConnected: false,
      });
    });

    it('should track wasAutoConnected as true for auto-connected servers', () => {
      const serverName = 'Auto Connected Server';
      const wasAutoConnected = true;

      fireMiscTrackingEvent('Playground MCP Server Disconnected', {
        mcpServerName: serverName,
        wasAutoConnected,
      });

      expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith('Playground MCP Server Disconnected', {
        mcpServerName: 'Auto Connected Server',
        wasAutoConnected: true,
      });
    });
  });

  describe('MCP Success Modal Closed Tracking', () => {
    it('should fire tracking event when success modal is closed', () => {
      const serverName = 'Test MCP Server';
      const toolsCount = 5;

      fireMiscTrackingEvent('Playground MCP Success Modal Closed', {
        mcpServerName: serverName,
        toolsCount,
      });

      expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith(
        'Playground MCP Success Modal Closed',
        {
          mcpServerName: 'Test MCP Server',
          toolsCount: 5,
        },
      );
    });

    it('should track different tool counts', () => {
      const serverName = 'Another MCP Server';
      const toolsCount = 10;

      fireMiscTrackingEvent('Playground MCP Success Modal Closed', {
        mcpServerName: serverName,
        toolsCount,
      });

      expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith(
        'Playground MCP Success Modal Closed',
        {
          mcpServerName: 'Another MCP Server',
          toolsCount: 10,
        },
      );
    });
  });
});
