import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import BaseModelSection from '#~/pages/pipelines/global/modelCustomization/baseModelSection/BaseModelSection';

describe('BaseModelSection', () => {
  const defaultProps = {
    data: { sdgBaseModel: 'test-base-model-url' },
    setData: jest.fn(),
    registryName: 'test-registry-name',
    inputModelName: 'test-input-model-name',
    inputModelVersionName: 'test-model-version-name',
  };

  it('should render initial text and warning', () => {
    render(<BaseModelSection {...defaultProps} />);

    expect(screen.getByText('test-base-model-url')).toBeInTheDocument();
    expect(screen.getByTestId('inline-edit-unsupported-message')).toBeInTheDocument();
  });

  it('should not render warning if text is valid', () => {
    render(
      <BaseModelSection {...defaultProps} data={{ sdgBaseModel: 'registry.redhat.io/test' }} />,
    );

    expect(screen.getByText('registry.redhat.io/test')).toBeInTheDocument();
    expect(screen.queryByTestId('inline-edit-unsupported-message')).not.toBeInTheDocument();
  });

  it('should show validation error after the field is touched', () => {
    render(<BaseModelSection {...defaultProps} data={{ sdgBaseModel: '' }} />);

    expect(screen.getByText('Set a value ...')).toBeInTheDocument();
    expect(
      screen.queryByTestId('model-customization-baseModel-location-uri-error'),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Edit'));
    fireEvent.click(screen.getByLabelText('Save'));
    expect(
      screen.queryByTestId('model-customization-baseModel-location-uri-error'),
    ).toBeInTheDocument();
  });
});
