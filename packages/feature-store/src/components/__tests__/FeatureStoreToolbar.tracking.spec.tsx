import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Toolbar, ToolbarContent } from '@patternfly/react-core';
import type DashboardDatePicker from '@odh-dashboard/internal/components/DashboardDatePicker';
import { TrackingProvider } from '../../__tests__/unit/testUtils/TrackingProvider';
import { createDefaultFilterOptionRenders, FeatureStoreToolbar } from '../FeatureStoreToolbar';

const ToolbarHarness = () => {
  const [name, setName] = React.useState('');
  return (
    <Toolbar>
      <ToolbarContent>
        <FeatureStoreToolbar
          filterOptions={{ name: 'Entity' }}
          filterData={{ name }}
          onFilterUpdate={(_key, value) => setName(typeof value === 'string' ? value : '')}
          trackingResourceType="entity"
        />
      </ToolbarContent>
    </Toolbar>
  );
};

describe('FeatureStoreToolbar tracking', () => {
  it('should emit once per nonempty text interval and use the current provider after reset', () => {
    const first = jest.fn();
    const second = jest.fn();
    const { rerender } = render(
      <TrackingProvider trackEvent={first}>
        <ToolbarHarness />
      </TrackingProvider>,
    );
    const input = screen.getByPlaceholderText('Filter by entity name');
    fireEvent.change(input, { target: { value: 'private-name' } });
    fireEvent.change(input, { target: { value: 'private-name-more' } });
    expect(first.mock.calls).toEqual([
      ['Feature Store Filter Applied', { filterAttribute: 'name', resourceType: 'entity' }],
    ]);
    rerender(
      <TrackingProvider trackEvent={second}>
        <ToolbarHarness />
      </TrackingProvider>,
    );
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.change(input, { target: { value: 'another-private-name' } });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second.mock.calls).toEqual([
      ['Feature Store Filter Applied', { filterAttribute: 'name', resourceType: 'entity' }],
    ]);
  });

  it('should deliver date factory events through the injected callback only for valid dates', () => {
    const trackEvent = jest.fn();
    const onChange = jest.fn();
    const renders = createDefaultFilterOptionRenders(
      trackEvent,
      { created: 'Created' },
      undefined,
      undefined,
      'entity',
    );
    const dateFilter = renders.created({ onChange, value: '' });
    if (!React.isValidElement<React.ComponentProps<typeof DashboardDatePicker>>(dateFilter)) {
      throw new Error('Expected a date filter element');
    }
    // Exercise the factory closure without mounting the DatePicker or its calendar timers.
    const handleChange = dateFilter.props.onChange;
    expect(handleChange).toBeDefined();
    const event = {} as React.FormEvent<HTMLInputElement>;
    handleChange?.(event, '2026-01-15', new Date('2026-01-15T00:00:00Z'));
    handleChange?.(event, '');
    handleChange?.(event, 'invalid');
    expect(trackEvent.mock.calls).toEqual([
      ['Feature Store Filter Applied', { filterAttribute: 'created', resourceType: 'entity' }],
    ]);
    expect(onChange).toHaveBeenCalledWith('2026-01-15');
    expect(onChange).toHaveBeenCalledWith('');
    expect(onChange).not.toHaveBeenCalledWith('invalid');
  });
});
