import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import K8sNameDescriptionField from '#~/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import { mockK8sNameDescriptionFieldData } from '#~/__mocks__/mockK8sNameDescriptionFieldData';

describe('K8sNameDescriptionField', () => {
  it('should render name and description fields', () => {
    const data = mockK8sNameDescriptionFieldData({
      name: 'My Resource',
      description: 'A description',
      k8sName: { value: 'my-resource' },
    });

    render(<K8sNameDescriptionField data={data} dataTestId="test" />);

    expect(screen.getByTestId('test-name')).toHaveValue('My Resource');
    expect(screen.getByTestId('test-description')).toHaveValue('A description');
  });

  it('should show the resource name in helper text when not in edit mode', () => {
    const data = mockK8sNameDescriptionFieldData({
      name: 'My Resource',
      k8sName: { value: 'my-resource' },
    });

    render(<K8sNameDescriptionField data={data} dataTestId="test" />);

    expect(screen.getByText('my-resource')).toBeInTheDocument();
    expect(screen.getByTestId('test-editResourceLink')).toBeInTheDocument();
  });

  it('should show route name too long error in inline helper text', () => {
    const data = mockK8sNameDescriptionFieldData({
      name: 'My Resource',
      k8sName: {
        value: 'my-resource-with-a-long-name',
        state: { routeNameTooLong: true, namespace: 'long-namespace' },
      },
    });

    render(<K8sNameDescriptionField data={data} dataTestId="test" />);

    expect(
      screen.getByText(/Resource name and project name combined cannot exceed 63 characters/),
    ).toBeInTheDocument();
  });

  it('should set error variant on resource name helper text when routeNameTooLong is true', () => {
    const data = mockK8sNameDescriptionFieldData({
      name: 'My Resource',
      k8sName: {
        value: 'my-resource-with-a-long-name',
        state: { routeNameTooLong: true, namespace: 'long-namespace' },
      },
    });

    render(<K8sNameDescriptionField data={data} dataTestId="test" />);

    // The HelperTextItem containing "The resource name will be" should have error variant
    const resourceNameText = screen.getByText(/The resource name will be/);
    const helperTextItem = resourceNameText.closest('.pf-v6-c-helper-text__item');
    expect(helperTextItem).toHaveClass('pf-m-error');
  });

  it('should set error variant on resource name helper text when invalidCharacters is true', () => {
    const data = mockK8sNameDescriptionFieldData({
      name: 'My Resource',
      k8sName: {
        value: 'invalid!name',
        state: { invalidCharacters: true },
      },
    });

    render(<K8sNameDescriptionField data={data} dataTestId="test" />);

    // The inline error message for invalid characters should be displayed
    const resourceNameText = screen.getByText(/The resource name will be/);
    const helperTextItem = resourceNameText.closest('.pf-v6-c-helper-text__item');
    expect(helperTextItem).toHaveClass('pf-m-error');
  });

  it('should show invalid characters message inline when invalidCharacters is true', () => {
    const data = mockK8sNameDescriptionFieldData({
      name: 'My Resource',
      k8sName: {
        value: 'invalid!name',
        state: { invalidCharacters: true },
      },
    });

    render(<K8sNameDescriptionField data={data} dataTestId="test" />);

    expect(screen.getByText(/Must start and end with a letter or number/)).toBeInTheDocument();
  });

  it('should show custom invalidCharsMessage inline when provided', () => {
    const data = mockK8sNameDescriptionFieldData({
      name: 'My Resource',
      k8sName: {
        value: 'invalid!name',
        state: {
          invalidCharacters: true,
          invalidCharsMessage: 'Must start with a lowercase letter.',
        },
      },
    });

    render(<K8sNameDescriptionField data={data} dataTestId="test" />);

    expect(screen.getByText(/Must start with a lowercase letter/)).toBeInTheDocument();
  });

  it('should not show route name error when routeNameTooLong is false', () => {
    const data = mockK8sNameDescriptionFieldData({
      name: 'My Resource',
      k8sName: {
        value: 'my-resource',
        state: { routeNameTooLong: false, namespace: 'short-ns' },
      },
    });

    render(<K8sNameDescriptionField data={data} dataTestId="test" />);

    expect(
      screen.queryByText(/Resource name and project name combined cannot exceed 63 characters/),
    ).not.toBeInTheDocument();
  });

  it('should hide description when hideDescription is true', () => {
    const data = mockK8sNameDescriptionFieldData({ name: 'Test' });

    render(<K8sNameDescriptionField data={data} dataTestId="test" hideDescription />);

    expect(screen.queryByTestId('test-description')).not.toBeInTheDocument();
  });
});
