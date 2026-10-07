/* eslint-disable camelcase */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ConnectionRefLink from '~/app/components/ConnectionRefLink';

describe('ConnectionRefLink', () => {
  it('should render rhai connection reference as text', () => {
    render(<ConnectionRefLink connectionRef={{ type: 'rhai', secret_name: 'my-secret' }} />);
    const el = screen.getByTestId('connection-ref-label');
    expect(el).toHaveTextContent('my-secret');
    expect(el.tagName).toBe('SPAN');
  });

  it('should render rhai connection reference as link when linkTo is provided', () => {
    render(
      <MemoryRouter>
        <ConnectionRefLink
          connectionRef={{ type: 'rhai', secret_name: 'my-secret' }}
          connections={[{ name: 'my-secret', displayName: 'My connection' }]}
          linkTo="/connections/my-secret"
        />
      </MemoryRouter>,
    );
    const el = screen.getByTestId('connection-ref-link');
    expect(el).toHaveTextContent('My connection');
    expect(el.tagName).toBe('A');
    expect(el).toHaveAttribute('href', '/connections/my-secret');
  });

  it('should render dch connection reference', () => {
    render(<ConnectionRefLink connectionRef={{ type: 'dch', id: 'conn-123' }} />);
    expect(screen.getByTestId('connection-ref-label')).toHaveTextContent('conn-123');
  });

  it('should render plain string connection reference', () => {
    render(<ConnectionRefLink connectionRef="my-s3-connection" />);
    expect(screen.getByTestId('connection-ref-label')).toHaveTextContent('my-s3-connection');
  });

  it('should not link a plain string even when linkTo is provided', () => {
    render(
      <MemoryRouter>
        <ConnectionRefLink connectionRef="s3://bucket/path" linkTo="/connections" />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('connection-ref-label')).toHaveTextContent('s3://bucket/path');
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
});
