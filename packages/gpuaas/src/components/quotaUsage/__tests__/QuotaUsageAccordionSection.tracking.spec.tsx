import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import QuotaUsageAccordionSection from '../QuotaUsageAccordionSection';
import { createTrackingWrapper } from '../../../__tests__/unit/testUtils/TrackingProvider';

const mockTrackEvent = jest.fn();
const TrackingWrapper = createTrackingWrapper(mockTrackEvent);

describe('QuotaUsageAccordionSection tracking', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([
    ['quota-usage-summary', 'summary', 'cohort', 'cohort'],
    ['quota-usage-accelerator-table', 'hardware-usage', 'clusterQueue', 'cluster-queue'],
    ['quota-usage-workloads', 'workloads', 'unassigned', 'unassigned-bucket'],
  ] as const)(
    'should preserve %s toggles for %s',
    (id, sectionName, nodeType, trackingNodeType) => {
      const onToggle = jest.fn();
      const element = (isExpanded: boolean) => (
        <QuotaUsageAccordionSection
          id={id}
          title="Section"
          isExpanded={isExpanded}
          onToggle={onToggle}
          nodeType={nodeType}
        >
          Content
        </QuotaUsageAccordionSection>
      );
      const { rerender } = render(element(true), { wrapper: TrackingWrapper });
      expect(mockTrackEvent).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Section' }));
      rerender(element(false));
      fireEvent.click(screen.getByRole('button', { name: 'Section' }));
      expect(onToggle).toHaveBeenCalledTimes(2);
      expect(mockTrackEvent.mock.calls).toEqual([
        [
          'Infrastructure Quota Usage Detail Section Toggled',
          { sectionName, isExpanded: false, nodeType: trackingNodeType },
        ],
        [
          'Infrastructure Quota Usage Detail Section Toggled',
          { sectionName, isExpanded: true, nodeType: trackingNodeType },
        ],
      ]);
    },
  );
});
