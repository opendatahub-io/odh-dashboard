import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import LoadingFormField from '~/app/components/configure/LoadingFormField';

describe('LoadingFormField', () => {
  it('should render skeleton when loading is true', () => {
    const { container } = render(
      <LoadingFormField loading>
        <div>Child content</div>
      </LoadingFormField>,
    );

    const skeleton = container.querySelector('.pf-v6-c-skeleton');
    expect(skeleton).toBeInTheDocument();
    expect(screen.queryByText('Child content')).not.toBeInTheDocument();
  });

  it('should render children when loading is false', () => {
    render(
      <LoadingFormField loading={false}>
        <div>Child content</div>
      </LoadingFormField>,
    );

    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('should render skeleton with correct dimensions', () => {
    const { container } = render(
      <LoadingFormField loading>
        <div>Child content</div>
      </LoadingFormField>,
    );

    const skeleton = container.querySelector('.pf-v6-c-skeleton');
    expect(skeleton).toHaveAttribute('style', expect.stringContaining('100%'));
    expect(skeleton).toHaveAttribute('style', expect.stringContaining('36px'));
  });
});
