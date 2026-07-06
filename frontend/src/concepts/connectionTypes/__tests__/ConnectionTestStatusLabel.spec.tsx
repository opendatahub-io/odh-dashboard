import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConnectionTestStatusLabel from '#~/concepts/connectionTypes/ConnectionTestStatusLabel';
import { ConnectionTestStatus } from '#~/concepts/connectionTypes/types';

describe('ConnectionTestStatusLabel', () => {
  it('should render "Not tested" with grey label for NOT_TESTED status', () => {
    render(<ConnectionTestStatusLabel status={ConnectionTestStatus.NOT_TESTED} />);

    const label = screen.getByTestId('connection-test-label-not-tested');
    expect(label).toBeInTheDocument();
    expect(label).toHaveTextContent('Not tested');
  });

  it('should render "Testing..." with spinner for TESTING status', () => {
    render(<ConnectionTestStatusLabel status={ConnectionTestStatus.TESTING} />);

    const label = screen.getByTestId('connection-test-label-testing');
    expect(label).toBeInTheDocument();
    expect(label).toHaveTextContent('Testing...');
  });

  it('should render "Verified" with green label for VERIFIED status', () => {
    render(<ConnectionTestStatusLabel status={ConnectionTestStatus.VERIFIED} />);

    const label = screen.getByTestId('connection-test-label-verified');
    expect(label).toBeInTheDocument();
    expect(label).toHaveTextContent('Verified');
  });

  it('should render "Failed" with red label for FAILED status', () => {
    render(<ConnectionTestStatusLabel status={ConnectionTestStatus.FAILED} />);

    const label = screen.getByTestId('connection-test-label-failed');
    expect(label).toBeInTheDocument();
    expect(label).toHaveTextContent('Failed');
  });

  it('should display formatted timestamp when provided for VERIFIED status', () => {
    const timestamp = '2024-12-15T10:30:00Z';
    render(
      <ConnectionTestStatusLabel status={ConnectionTestStatus.VERIFIED} timestamp={timestamp} />,
    );

    const container = screen.getByTestId('connection-test-label-verified');
    expect(container).toHaveTextContent('Verified');
    expect(container).toHaveTextContent('Last tested');
  });

  it('should display formatted timestamp when provided for FAILED status', () => {
    const timestamp = '2024-12-15T10:30:00Z';
    render(
      <ConnectionTestStatusLabel status={ConnectionTestStatus.FAILED} timestamp={timestamp} />,
    );

    const container = screen.getByTestId('connection-test-label-failed');
    expect(container).toHaveTextContent('Failed');
    expect(container).toHaveTextContent('Last tested');
  });

  it('should not display timestamp for NOT_TESTED status', () => {
    const timestamp = '2024-12-15T10:30:00Z';
    render(
      <ConnectionTestStatusLabel status={ConnectionTestStatus.NOT_TESTED} timestamp={timestamp} />,
    );

    const label = screen.getByTestId('connection-test-label-not-tested');
    expect(label).toBeInTheDocument();
    expect(label).toHaveTextContent('Not tested');
  });

  it('should not display timestamp for TESTING status', () => {
    const timestamp = '2024-12-15T10:30:00Z';
    render(
      <ConnectionTestStatusLabel status={ConnectionTestStatus.TESTING} timestamp={timestamp} />,
    );

    const label = screen.getByTestId('connection-test-label-testing');
    expect(label).toBeInTheDocument();
    expect(label).toHaveTextContent('Testing...');
  });

  it('should render VERIFIED label without tooltip when no timestamp provided', () => {
    render(<ConnectionTestStatusLabel status={ConnectionTestStatus.VERIFIED} />);

    const label = screen.getByTestId('connection-test-label-verified');
    expect(label).toBeInTheDocument();
    expect(label).toHaveTextContent('Verified');
  });

  it('should render FAILED label without tooltip when no timestamp provided', () => {
    render(<ConnectionTestStatusLabel status={ConnectionTestStatus.FAILED} />);

    const label = screen.getByTestId('connection-test-label-failed');
    expect(label).toBeInTheDocument();
    expect(label).toHaveTextContent('Failed');
  });

  it('should not show "Invalid Date" for an invalid timestamp on VERIFIED', () => {
    render(
      <ConnectionTestStatusLabel status={ConnectionTestStatus.VERIFIED} timestamp="not-a-date" />,
    );

    const container = screen.getByTestId('connection-test-label-verified');
    expect(container).toHaveTextContent('Verified');
    expect(container).not.toHaveTextContent('Invalid Date');
  });

  it('should not show "Invalid Date" for an invalid timestamp on FAILED', () => {
    render(<ConnectionTestStatusLabel status={ConnectionTestStatus.FAILED} timestamp="garbage" />);

    const container = screen.getByTestId('connection-test-label-failed');
    expect(container).toHaveTextContent('Failed');
    expect(container).not.toHaveTextContent('Invalid Date');
  });

  it('should not display timestamp text for empty string timestamp on VERIFIED', () => {
    render(<ConnectionTestStatusLabel status={ConnectionTestStatus.VERIFIED} timestamp="" />);

    const container = screen.getByTestId('connection-test-label-verified');
    expect(container).toHaveTextContent('Verified');
    expect(container).not.toHaveTextContent('Last tested');
  });

  it('should not display timestamp text for empty string timestamp on FAILED', () => {
    render(<ConnectionTestStatusLabel status={ConnectionTestStatus.FAILED} timestamp="" />);

    const container = screen.getByTestId('connection-test-label-failed');
    expect(container).toHaveTextContent('Failed');
    expect(container).not.toHaveTextContent('Last tested');
  });

  it('should not show "Last tested" text for invalid timestamp on VERIFIED', () => {
    render(
      <ConnectionTestStatusLabel
        status={ConnectionTestStatus.VERIFIED}
        timestamp="not-a-valid-date"
      />,
    );

    const container = screen.getByTestId('connection-test-label-verified');
    expect(container).not.toHaveTextContent('Last tested');
  });

  it('should format a valid ISO timestamp correctly for VERIFIED', () => {
    const timestamp = '2024-12-15T10:30:00Z';
    render(
      <ConnectionTestStatusLabel status={ConnectionTestStatus.VERIFIED} timestamp={timestamp} />,
    );

    const container = screen.getByTestId('connection-test-label-verified');
    const expectedDateStr = new Date(timestamp).toLocaleString();
    expect(container).toHaveTextContent(`Last tested ${expectedDateStr}`);
  });
});
