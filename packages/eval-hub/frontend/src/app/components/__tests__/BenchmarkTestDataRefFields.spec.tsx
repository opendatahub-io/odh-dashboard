import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import BenchmarkTestDataRefFields from '~/app/components/BenchmarkTestDataRefFields';
import { testDataRefDefaultValues } from '~/app/schemas/testDataRef.schema';

const renderFields = (
  overrides: Partial<React.ComponentProps<typeof BenchmarkTestDataRefFields>> = {},
) =>
  render(
    <BenchmarkTestDataRefFields
      value={{ ...testDataRefDefaultValues }}
      idPrefix="test"
      testIdPrefix="test-test-data-ref"
      onChange={jest.fn()}
      {...overrides}
    />,
  );

describe('BenchmarkTestDataRefFields', () => {
  it('should render only the source selector when the source is none', () => {
    renderFields();

    expect(screen.getByTestId('test-test-data-ref-source-toggle')).toHaveTextContent(
      'None (use benchmark default data)',
    );
    expect(screen.queryByTestId('test-test-data-ref-bucket')).not.toBeInTheDocument();
    expect(screen.queryByTestId('test-test-data-ref-claimName')).not.toBeInTheDocument();
  });

  it('should offer all source options', () => {
    renderFields();

    fireEvent.click(screen.getByTestId('test-test-data-ref-source-toggle'));
    [
      'S3 — object storage',
      'Persistent volume claim (PVC)',
      'Git repository',
      'Hugging Face dataset',
    ].forEach((name) => {
      expect(screen.getByRole('option', { name })).toBeInTheDocument();
    });
  });

  it('should hide the none option and show a placeholder when required', () => {
    renderFields({ isRequired: true });

    expect(screen.getByTestId('test-test-data-ref-source-toggle')).toHaveTextContent(
      'Select a test data source',
    );
    expect(screen.getByTestId('test-test-data-ref-helper')).toHaveTextContent(
      'This benchmark has no bundled input data',
    );

    fireEvent.click(screen.getByTestId('test-test-data-ref-source-toggle'));
    expect(
      screen.queryByRole('option', { name: 'None (use benchmark default data)' }),
    ).not.toBeInTheDocument();
    ['S3 — object storage', 'Git repository'].forEach((name) => {
      expect(screen.getByRole('option', { name })).toBeInTheDocument();
    });
  });

  it('should display the source error once the select is opened when required', () => {
    renderFields({
      isRequired: true,
      errors: { source: 'Test data source is required for this benchmark.' },
    });

    expect(screen.queryByTestId('test-test-data-ref-source-error')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('test-test-data-ref-source-toggle'));
    fireEvent.click(screen.getByTestId('test-test-data-ref-source-toggle'));

    expect(screen.getByTestId('test-test-data-ref-source-error')).toHaveTextContent(
      'Test data source is required for this benchmark.',
    );
  });

  it('should not show a source error when not required', () => {
    renderFields({
      errors: { source: 'Test data source is required for this benchmark.' },
    });

    fireEvent.click(screen.getByTestId('test-test-data-ref-source-toggle'));

    expect(screen.queryByTestId('test-test-data-ref-source-error')).not.toBeInTheDocument();
  });

  it('should render s3 fields when the source is s3', () => {
    renderFields({
      value: { ...testDataRefDefaultValues, source: 's3', bucket: 'b', key: 'k', secretRef: 's' },
    });

    expect(screen.getByTestId('test-test-data-ref-bucket')).toHaveValue('b');
    expect(screen.getByTestId('test-test-data-ref-key')).toHaveValue('k');
    expect(screen.getByTestId('test-test-data-ref-secretRef')).toHaveValue('s');
    expect(screen.queryByTestId('test-test-data-ref-claimName')).not.toBeInTheDocument();
  });

  it('should render pvc fields when the source is pvc', () => {
    renderFields({
      value: { ...testDataRefDefaultValues, source: 'pvc', claimName: 'c', subPath: 'p' },
    });

    expect(screen.getByTestId('test-test-data-ref-claimName')).toHaveValue('c');
    expect(screen.getByTestId('test-test-data-ref-subPath')).toHaveValue('p');
  });

  it('should render git fields when the source is git', () => {
    renderFields({
      value: { ...testDataRefDefaultValues, source: 'git', url: 'u', ref: 'r' },
    });

    expect(screen.getByTestId('test-test-data-ref-url')).toHaveValue('u');
    expect(screen.getByTestId('test-test-data-ref-ref')).toHaveValue('r');
    expect(screen.getByTestId('test-test-data-ref-subPath')).toBeInTheDocument();
    expect(screen.getByTestId('test-test-data-ref-secretRef')).toBeInTheDocument();
  });

  it('should render hf fields when the source is hf', () => {
    renderFields({
      value: { ...testDataRefDefaultValues, source: 'hf', repoId: 'o/r', revision: 'v' },
    });

    expect(screen.getByTestId('test-test-data-ref-repoId')).toHaveValue('o/r');
    expect(screen.getByTestId('test-test-data-ref-revision')).toHaveValue('v');
  });

  it('should clear values when the source changes', () => {
    const onChange = jest.fn();
    renderFields({
      onChange,
      value: {
        ...testDataRefDefaultValues,
        source: 's3',
        bucket: 'b',
        key: 'k',
        secretRef: 's',
      },
    });

    fireEvent.click(screen.getByTestId('test-test-data-ref-source-toggle'));
    fireEvent.click(screen.getByRole('option', { name: 'Hugging Face dataset' }));

    expect(onChange).toHaveBeenCalledWith({ ...testDataRefDefaultValues, source: 'hf' });
  });

  it('should preserve the reference type when the source changes', () => {
    const onChange = jest.fn();
    renderFields({
      onChange,
      value: {
        ...testDataRefDefaultValues,
        source: 's3',
        type: 'pre_recorded_data',
        bucket: 'b',
        key: 'k',
        secretRef: 's',
      },
    });

    fireEvent.click(screen.getByTestId('test-test-data-ref-source-toggle'));
    fireEvent.click(screen.getByRole('option', { name: 'Hugging Face dataset' }));

    expect(onChange).toHaveBeenCalledWith({
      ...testDataRefDefaultValues,
      source: 'hf',
      type: 'pre_recorded_data',
    });
  });

  it('should not clear values when the same source is reselected', () => {
    const onChange = jest.fn();
    renderFields({
      onChange,
      value: {
        ...testDataRefDefaultValues,
        source: 's3',
        bucket: 'b',
        key: 'k',
        secretRef: 's',
      },
    });

    fireEvent.click(screen.getByTestId('test-test-data-ref-source-toggle'));
    fireEvent.click(screen.getByRole('option', { name: 'S3 — object storage' }));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('test-test-data-ref-bucket')).toHaveValue('b');
  });

  it('should update a field value without clearing the others', () => {
    const onChange = jest.fn();
    renderFields({
      onChange,
      value: { ...testDataRefDefaultValues, source: 's3', bucket: 'b', key: 'k', secretRef: 's' },
    });

    fireEvent.change(screen.getByTestId('test-test-data-ref-bucket'), {
      target: { value: 'other-bucket' },
    });

    expect(onChange).toHaveBeenCalledWith({
      ...testDataRefDefaultValues,
      source: 's3',
      bucket: 'other-bucket',
      key: 'k',
      secretRef: 's',
    });
  });

  it('should indent source-specific fields under the source selector', () => {
    const { container } = renderFields({
      value: { ...testDataRefDefaultValues, source: 's3' },
    });

    const children = container.querySelector('.evalhub-benchmark-test-data-ref__children');
    expect(children).toBeInTheDocument();
    expect(children).toContainElement(screen.getByTestId('test-test-data-ref-bucket'));
    expect(children).not.toContainElement(screen.getByTestId('test-test-data-ref-source-toggle'));
  });

  it('should hide validation errors until the field is interacted with', () => {
    renderFields({
      value: { ...testDataRefDefaultValues, source: 's3' },
      errors: { bucket: 'Bucket is required.' },
    });

    expect(screen.queryByTestId('test-test-data-ref-bucket-error')).not.toBeInTheDocument();
    expect(screen.getByTestId('test-test-data-ref-bucket')).not.toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('should display validation errors once the field is blurred', () => {
    renderFields({
      value: { ...testDataRefDefaultValues, source: 's3' },
      errors: { bucket: 'Bucket is required.' },
    });

    fireEvent.blur(screen.getByTestId('test-test-data-ref-bucket'));

    expect(screen.getByTestId('test-test-data-ref-bucket-error')).toHaveTextContent(
      'Bucket is required.',
    );
  });

  it('should display validation errors once the field is cleared', () => {
    renderFields({
      value: { ...testDataRefDefaultValues, source: 's3', bucket: 'eval-data' },
      errors: { bucket: 'Bucket is required.' },
    });

    fireEvent.change(screen.getByTestId('test-test-data-ref-bucket'), { target: { value: '' } });

    expect(screen.getByTestId('test-test-data-ref-bucket-error')).toHaveTextContent(
      'Bucket is required.',
    );
  });

  it('should hide validation errors again after the source changes', () => {
    renderFields({
      value: { ...testDataRefDefaultValues, source: 's3' },
      errors: { secretRef: 'Secret is required.' },
    });

    fireEvent.blur(screen.getByTestId('test-test-data-ref-secretRef'));
    expect(screen.getByTestId('test-test-data-ref-secretRef-error')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('test-test-data-ref-source-toggle'));
    fireEvent.click(screen.getByRole('option', { name: 'Git repository' }));

    expect(screen.getByTestId('test-test-data-ref-secretRef')).toBeInTheDocument();
    expect(screen.queryByTestId('test-test-data-ref-secretRef-error')).not.toBeInTheDocument();
  });

  it('should disable inputs when disabled', () => {
    renderFields({
      isDisabled: true,
      value: { ...testDataRefDefaultValues, source: 's3', bucket: 'b' },
    });

    expect(screen.getByTestId('test-test-data-ref-source-toggle')).toBeDisabled();
    expect(screen.getByTestId('test-test-data-ref-bucket')).toBeDisabled();
  });
});
