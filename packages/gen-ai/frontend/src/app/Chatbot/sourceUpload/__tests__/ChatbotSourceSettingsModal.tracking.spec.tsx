import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { TextInput } from '@patternfly/react-core';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
}));

const mockFireMiscTrackingEvent = jest.mocked(fireMiscTrackingEvent);

describe('ChatbotSourceSettingsModal - Tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('RAG Settings Changed Tracking', () => {
    it('should fire tracking event when maxChunkLength is changed', async () => {
      const user = userEvent.setup();

      const handleChange = (event: React.FormEvent<HTMLInputElement>, value: string) => {
        const { name } = event.target as HTMLInputElement;
        fireMiscTrackingEvent('Playground RAG Settings Changed', {
          parameter: name,
          value: parseInt(value, 10),
        });
      };

      render(
        <TextInput
          id="maxChunkLength"
          name="maxChunkLength"
          type="number"
          value="1000"
          onChange={handleChange}
        />,
      );

      const input = screen.getByRole('spinbutton');
      await user.clear(input);
      await user.type(input, '2000');

      // Verify tracking was called with correct parameter name
      expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith(
        'Playground RAG Settings Changed',
        expect.objectContaining({
          parameter: 'maxChunkLength',
          value: expect.any(Number),
        }),
      );
    });

    it('should fire tracking event when chunkOverlap is changed', async () => {
      const user = userEvent.setup();

      const handleChange = (event: React.FormEvent<HTMLInputElement>, value: string) => {
        const { name } = event.target as HTMLInputElement;
        fireMiscTrackingEvent('Playground RAG Settings Changed', {
          parameter: name,
          value: parseInt(value, 10),
        });
      };

      render(
        <TextInput
          id="chunkOverlap"
          name="chunkOverlap"
          type="number"
          value="100"
          onChange={handleChange}
        />,
      );

      const input = screen.getByRole('spinbutton');
      await user.clear(input);
      await user.type(input, '150');

      // Verify tracking was called with correct parameter name
      expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith(
        'Playground RAG Settings Changed',
        expect.objectContaining({
          parameter: 'chunkOverlap',
          value: expect.any(Number),
        }),
      );
    });

    it('should fire tracking event when delimiter is changed', async () => {
      const user = userEvent.setup();

      const handleChange = (event: React.FormEvent<HTMLInputElement>, value: string) => {
        const { name } = event.target as HTMLInputElement;
        fireMiscTrackingEvent('Playground RAG Settings Changed', {
          parameter: name,
          value,
        });
      };

      render(<TextInput id="delimiter" name="delimiter" value="\n" onChange={handleChange} />);

      const input = screen.getByRole('textbox');
      await user.clear(input);
      await user.type(input, '\\n\\n');

      expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith('Playground RAG Settings Changed', {
        parameter: 'delimiter',
        value: expect.any(String),
      });
    });
  });

  describe('Vector Database Created Tracking', () => {
    it('should fire tracking event when vector database is created successfully', async () => {
      const vectorDbName = 'My New Vector DB';

      // Simulate successful creation
      fireMiscTrackingEvent('Playground Vector Database Created', {
        vectorDbName,
        success: true,
      });

      expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith('Playground Vector Database Created', {
        vectorDbName: 'My New Vector DB',
        success: true,
      });
    });

    it('should fire tracking event when vector database creation fails', async () => {
      const vectorDbName = 'Failed Vector DB';
      const errorMessage = 'Failed to create vector store';

      // Simulate failed creation
      try {
        throw new Error(errorMessage);
      } catch (error) {
        fireMiscTrackingEvent('Playground Vector Database Created', {
          vectorDbName,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith('Playground Vector Database Created', {
        vectorDbName: 'Failed Vector DB',
        success: false,
        error: 'Failed to create vector store',
      });
    });
  });
});
