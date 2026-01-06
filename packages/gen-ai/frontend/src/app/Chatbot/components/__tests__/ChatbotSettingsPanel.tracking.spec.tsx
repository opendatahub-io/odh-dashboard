import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { Switch } from '@patternfly/react-core';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
  fireSimpleTrackingEvent: jest.fn(),
  fireFormTrackingEvent: jest.fn(),
}));

const mockFireMiscTrackingEvent = jest.mocked(fireMiscTrackingEvent);

describe('ChatbotSettingsPanel - Tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Streaming Toggle Tracking', () => {
    it('should fire tracking event when streaming is enabled', async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();
      const selectedModel = 'test-model';

      render(
        <Switch
          id="streaming-toggle"
          label="Streaming responses"
          isChecked={false}
          onChange={(_event, checked) => {
            mockOnChange(checked);
            fireMiscTrackingEvent('Playground Streaming Toggle Changed', {
              isEnabled: checked,
              modelSelected: selectedModel,
            });
          }}
        />,
      );

      const streamingSwitch = screen.getByRole('switch');
      await user.click(streamingSwitch);

      expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith(
        'Playground Streaming Toggle Changed',
        {
          isEnabled: true,
          modelSelected: 'test-model',
        },
      );
      expect(mockOnChange).toHaveBeenCalledWith(true);
    });

    it('should fire tracking event when streaming is disabled', async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();
      const selectedModel = 'test-model';

      render(
        <Switch
          id="streaming-toggle"
          label="Streaming responses"
          isChecked
          onChange={(_event, checked) => {
            mockOnChange(checked);
            fireMiscTrackingEvent('Playground Streaming Toggle Changed', {
              isEnabled: checked,
              modelSelected: selectedModel,
            });
          }}
        />,
      );

      const streamingSwitch = screen.getByRole('switch');
      await user.click(streamingSwitch);

      expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith(
        'Playground Streaming Toggle Changed',
        {
          isEnabled: false,
          modelSelected: 'test-model',
        },
      );
      expect(mockOnChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Settings Panel Resize Tracking', () => {
    it('should fire tracking event when panel is expanded', () => {
      const newWidth = 500;
      const direction = 'expanded';

      fireMiscTrackingEvent('Playground Settings Panel Resized', {
        newWidth,
        direction,
      });

      expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith('Playground Settings Panel Resized', {
        newWidth: 500,
        direction: 'expanded',
      });
    });

    it('should fire tracking event when panel is collapsed', () => {
      const newWidth = 400;
      const direction = 'collapsed';

      fireMiscTrackingEvent('Playground Settings Panel Resized', {
        newWidth,
        direction,
      });

      expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith('Playground Settings Panel Resized', {
        newWidth: 400,
        direction: 'collapsed',
      });
    });
  });
});
