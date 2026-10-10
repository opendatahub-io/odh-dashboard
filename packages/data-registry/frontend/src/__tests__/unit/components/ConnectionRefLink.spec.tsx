/* eslint-disable camelcase */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { mockDchConnection, mockRhaiConnection } from '~/__mocks__/mockConnection';
import ConnectionRefLink from '~/app/components/ConnectionRefLink';

describe('ConnectionRefLink', () => {
  it('should show an unavailable label instead of an unresolved RHOAI identifier', () => {
    render(
      <ConnectionRefLink
        connectionRef={{ type: 'secret', secret_name: 'my-secret' }}
        connectionsLoaded
      />,
    );
    const el = screen.getByTestId('connection-ref-label');
    expect(el).toHaveTextContent('Connection unavailable');
    expect(el.tagName).toBe('SPAN');
  });

  it('should render a resolved RHOAI connection as a link when linkTo is provided', () => {
    const connection = mockRhaiConnection({ secret_name: 'my-secret', name: 'My connection' });
    render(
      <MemoryRouter>
        <ConnectionRefLink
          connectionRef={{ type: 'secret', secret_name: 'my-secret' }}
          connections={[connection]}
          connectionsLoaded
          linkTo="/connections/my-secret"
        />
      </MemoryRouter>,
    );
    const el = screen.getByTestId('connection-ref-link');
    expect(el).toHaveTextContent('My connection');
    expect(el.tagName).toBe('A');
    expect(el).toHaveAttribute('href', '/connections/my-secret');
  });

  it('should not render a DCH identifier when the connection is unavailable', () => {
    render(<ConnectionRefLink connectionRef={{ type: 'dch', id: 'conn-123' }} connectionsLoaded />);
    expect(screen.getByTestId('connection-ref-label')).toHaveTextContent('Connection unavailable');
  });

  it('should not render an unresolved string reference', () => {
    render(<ConnectionRefLink connectionRef="my-s3-connection" connectionsLoaded />);
    expect(screen.getByTestId('connection-ref-label')).toHaveTextContent('Connection unavailable');
  });

  it('should not link a plain string even when linkTo is provided', () => {
    render(
      <MemoryRouter>
        <ConnectionRefLink
          connectionRef="s3://bucket/path"
          linkTo="/connections"
          connectionsLoaded
        />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('connection-ref-label')).toHaveTextContent('Connection unavailable');
    expect(screen.queryByTestId('connection-ref-link')).not.toBeInTheDocument();
  });

  it('should render dash when connectionRef is null', () => {
    const { container } = render(<ConnectionRefLink connectionRef={null} />);
    expect(container).toHaveTextContent('-');
  });

  it('should render dash when connectionRef is undefined', () => {
    const { container } = render(<ConnectionRefLink />);
    expect(container).toHaveTextContent('-');
  });

  it('should use the latest DCH display name and then show unavailable instead of its UUID', () => {
    const connection = mockDchConnection();
    const ref = { type: 'dch' as const, id: connection.id };
    const { rerender } = render(
      <ConnectionRefLink connectionRef={ref} connections={[connection]} connectionsLoaded />,
    );
    expect(screen.getByTestId('connection-ref-label')).toHaveTextContent('Production data');
    rerender(
      <ConnectionRefLink
        connectionRef={ref}
        connections={[{ ...connection, name: 'Archive data' }]}
        connectionsLoaded
      />,
    );
    expect(screen.getByTestId('connection-ref-label')).toHaveTextContent('Archive data');
    rerender(<ConnectionRefLink connectionRef={ref} connections={[]} connectionsLoaded />);
    expect(screen.getByTestId('connection-ref-label')).toHaveTextContent('Connection unavailable');
  });

  it('should not resolve an unavailable Secret reference from a matching DCH display name', () => {
    const saved = mockRhaiConnection();
    render(
      <ConnectionRefLink
        connectionRef={saved}
        connections={[mockDchConnection({ name: saved.secret_name })]}
        connectionsLoaded
      />,
    );
    expect(screen.getByTestId('connection-ref-label')).toHaveTextContent('Connection unavailable');
    expect(screen.getByTestId('connection-ref-label')).not.toHaveTextContent(saved.secret_name);
  });

  it('should show a loading label before connection lookup completes', () => {
    render(<ConnectionRefLink connectionRef={{ type: 'dch', id: 'conn-123' }} />);
    expect(screen.getByTestId('connection-ref-label')).toHaveTextContent('Loading connection...');
  });
});
