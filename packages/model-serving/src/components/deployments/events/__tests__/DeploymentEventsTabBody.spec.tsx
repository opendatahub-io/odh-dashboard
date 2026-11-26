import * as React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import DeploymentEventsTabBody from '../DeploymentEventsTabBody';

const warning = {
  uid: 'warning',
  severity: 'Warning',
  reason: 'FailedCreate',
  message: 'Quota exceeded',
  source: 'ReplicaSet/predictor',
  timestamp: Date.parse('2026-11-23T12:00:00Z'),
};
const normal = {
  uid: 'normal',
  severity: 'Normal',
  reason: 'Starting',
  message: 'Creating Pod',
  source: 'Deployment/predictor',
};
const initial = { rows: [], failedKinds: [], hasPartialEventError: false, state: 'ready' } as const;

it('should preserve readable Events and report incomplete coverage once per kind', () => {
  render(
    <DeploymentEventsTabBody
      {...initial}
      rows={[normal, warning]}
      failedKinds={['Deployment', 'Pod', 'Deployment']}
      hasPartialEventError
    />,
  );
  expect(screen.getAllByText(/Deployment, Pod/)).toHaveLength(1);
  expect(screen.getByText(/Some Event sources could not be read/)).toBeVisible();
  expect(screen.getByText('Quota exceeded')).toBeVisible();
  expect(screen.getByText('Creating Pod')).toBeVisible();
  expect(screen.getByText('ReplicaSet/predictor')).toBeVisible();
  expect(screen.getByText('FailedCreate')).toBeVisible();
  expect(screen.getByText('Timestamp unavailable')).toBeVisible();
  expect(screen.getByTestId('deployment-event-warning').querySelector('time')).toHaveAttribute(
    'datetime',
    new Date(warning.timestamp).toISOString(),
  );
});

it('should intersect severity with case-insensitive search and distinguish filter-empty from no Events', () => {
  const { rerender } = render(<DeploymentEventsTabBody {...initial} />);
  expect(
    screen.getByText('No Events found yet. Events may appear as more resources are discovered.'),
  ).toBeVisible();
  rerender(<DeploymentEventsTabBody {...initial} rows={[normal, warning]} />);
  const search = screen.getByRole('textbox', { name: 'Search Events' });
  expect(search).toHaveAttribute('placeholder', 'Filter events...');
  const severity = screen.getByRole('button', { name: 'Severity: All' });
  expect(severity).toHaveClass('pf-m-form');
  fireEvent.click(severity);
  fireEvent.click(screen.getByRole('option', { name: 'Warning' }));
  expect(screen.getByRole('button', { name: 'Severity: Warning' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  for (const value of ['FAILEDCREATE', 'quota', 'replicaset/predictor']) {
    fireEvent.change(search, { target: { value } });
    expect(screen.getByText('Quota exceeded')).toBeVisible();
    expect(screen.queryByText('Creating Pod')).not.toBeInTheDocument();
  }
  fireEvent.change(search, { target: { value: 'Creating Pod' } });
  expect(screen.getByText('No matching Events')).toBeVisible();
  expect(screen.queryByText(/^No Events found yet\./)).not.toBeInTheDocument();
});

it.each([
  ['loading', 'Loading Events'],
  ['denied', 'Insufficient permissions to view Events'],
  ['review-error', 'Unable to check Event permissions'],
  ['fetch-error', 'Unable to load Events'],
] as const)('should distinguish %s from an empty result', (state, text) => {
  render(<DeploymentEventsTabBody {...initial} state={state} />);
  expect(screen.getByLabelText(text)).toBeInTheDocument();
  expect(screen.queryByText(/^No Events found yet\./)).not.toBeInTheDocument();
});
