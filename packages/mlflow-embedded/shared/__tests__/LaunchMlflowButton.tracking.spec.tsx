import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithTracking } from './TrackingProvider';
import LaunchMlflowButton from '../LaunchMlflowButton';

describe('LaunchMlflowButton tracking', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/ai-hub/skills?workspace=my-project');
  });

  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it.each([
    ['experiments-page', 'my-project', undefined, '/mlflow/#/?workspace=my-project'],
    ['prompt-management-page', 'my-project', undefined, '/mlflow/#/?workspace=my-project'],
    ['agent-observability-page', 'my-project', undefined, '/mlflow/#/?workspace=my-project'],
    ['skill-registry-page', 'my-project', '/skills', '/mlflow/#/skills?workspace=my-project'],
    ['experiments-page', undefined, undefined, '/mlflow'],
    ['skill-registry-page', undefined, '/skills', '/mlflow/#/skills'],
  ] as const)(
    'should preserve the launch payload for %s with workspace %s and path %s',
    (section, workspace, hashPath, href) => {
      const tracking = { trackEvent: jest.fn(), trackPageEvent: jest.fn() };
      const button = (
        <LaunchMlflowButton
          testId="launch"
          section={section}
          workspace={workspace}
          hashPath={hashPath}
        />
      );
      const { rerender } = renderWithTracking(button, tracking);
      rerender(button);
      expect(tracking.trackEvent).not.toHaveBeenCalled();

      const link = screen.getByTestId('launch');
      expect(link).toHaveAttribute('href', href);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(fireEvent.click(link)).toBe(true);

      expect(tracking.trackEvent.mock.calls).toStrictEqual([
        ['Launch MLflow clicked', { from: '/ai-hub/skills', href, section }],
      ]);
      expect(tracking.trackPageEvent).not.toHaveBeenCalled();
    },
  );
});
