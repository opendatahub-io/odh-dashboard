import React from 'react';
import { render, screen } from '@testing-library/react';
import VolumeDetailView from '~/app/pages/VolumeDetailView';
import { mockVolumeInfo } from '~/__mocks__/mockVolumeInfo';

describe('VolumeDetailView', () => {
  it('should render data details card with metadata fields', () => {
    const volume = mockVolumeInfo();
    render(<VolumeDetailView volume={volume} />);

    expect(screen.getByTestId('data-details-card')).toBeTruthy();
    expect(screen.getByTestId('volume-comment')).toHaveTextContent(
      'A test volume for unit testing',
    );
    expect(screen.getByTestId('volume-type')).toHaveTextContent('EXTERNAL');
    expect(screen.getByTestId('volume-project')).toHaveTextContent('my-project');
    expect(screen.getByTestId('volume-storage-location')).toHaveTextContent(
      's3://my-bucket/volumes/test-volume/',
    );
    expect(screen.getByTestId('volume-owner')).toHaveTextContent('data-team');
  });

  it('should not render schema-name field', () => {
    const volume = mockVolumeInfo();
    render(<VolumeDetailView volume={volume} />);
    expect(screen.queryByTestId('volume-collection')).not.toBeInTheDocument();
  });

  it('should render labels card', () => {
    const volume = mockVolumeInfo();
    render(<VolumeDetailView volume={volume} />);
    expect(screen.getByTestId('labels-card')).toBeTruthy();
    expect(screen.getByText('source-docs')).toBeTruthy();
    expect(screen.getByText('unstructured')).toBeTruthy();
  });

  it('should render properties card with key:value labels', () => {
    const volume = mockVolumeInfo();
    render(<VolumeDetailView volume={volume} />);
    expect(screen.getByTestId('properties-card')).toBeTruthy();
    expect(screen.getByText('purpose: testing')).toBeTruthy();
  });

  it('should render dash for missing optional fields', () => {
    const volume = mockVolumeInfo({
      comment: undefined,
      owner: undefined,
      'created-at': undefined,
      'updated-at': undefined,
      labels: [],
      properties: {},
    });
    render(<VolumeDetailView volume={volume} />);

    expect(screen.getByTestId('volume-comment')).toHaveTextContent('-');
    expect(screen.getByTestId('volume-owner')).toHaveTextContent('-');
    expect(screen.getByTestId('volume-created-at')).toHaveTextContent('-');
    expect(screen.getByTestId('volume-updated-at')).toHaveTextContent('-');
    expect(screen.getByTestId('volume-labels')).toHaveTextContent('No labels');
    expect(screen.queryByTestId('properties-card')).not.toBeInTheDocument();
  });
});
