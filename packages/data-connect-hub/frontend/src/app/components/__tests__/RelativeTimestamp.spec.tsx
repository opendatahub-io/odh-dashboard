import React from 'react';
import { render, screen } from '@testing-library/react';
import RelativeTimestamp from '~/app/components/RelativeTimestamp';

describe('RelativeTimestamp', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render a timestamp relative to the current time', () => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-09-10T16:00:00Z').getTime());

    render(<RelativeTimestamp datetime="2026-09-08T16:00:00Z" />);

    const timestamp = screen.getByText('2 days ago');
    expect(timestamp.tagName).toBe('TIME');
    expect(timestamp.getAttribute('datetime')).toBe('2026-09-08T16:00:00.000Z');
  });

  it.each(['not-a-date', ''])('should render a fallback for invalid datetime %p', (datetime) => {
    render(<RelativeTimestamp datetime={datetime} />);

    expect(screen.getByText('-')).toBeTruthy();
    expect(screen.queryByText('Invalid Date')).toBeNull();
  });
});
