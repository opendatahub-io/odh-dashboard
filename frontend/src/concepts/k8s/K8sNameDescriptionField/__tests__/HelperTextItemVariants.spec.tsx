import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import type { K8sNameDescriptionFieldData } from '@odh-dashboard/k8s-core';
import {
  HelperTextItemMaxLength,
  HelperTextItemRouteNameTooLong,
  HelperTextItemValidCharacters,
} from '#~/concepts/k8s/K8sNameDescriptionField/HelperTextItemVariants';

const createK8sName = (
  overrides: Omit<Partial<K8sNameDescriptionFieldData['k8sName']>, 'state'> & {
    state?: Partial<K8sNameDescriptionFieldData['k8sName']['state']>;
  } = {},
): K8sNameDescriptionFieldData['k8sName'] => ({
  value: overrides.value ?? '',
  state: {
    immutable: false,
    invalidCharacters: false,
    invalidLength: false,
    maxLength: 253,
    routeNameTooLong: false,
    touched: false,
    ...overrides.state,
  },
});

describe('HelperTextItemMaxLength', () => {
  it('should render indeterminate variant when value is empty', () => {
    const { container } = render(
      <HelperTextItemMaxLength k8sName={createK8sName({ state: { maxLength: 30 } })} />,
    );
    expect(container.querySelector('.pf-m-indeterminate')).toBeInTheDocument();
    expect(screen.getByText('Cannot exceed 30 characters')).toBeInTheDocument();
  });

  it('should render error variant when invalidLength is true', () => {
    const { container } = render(
      <HelperTextItemMaxLength
        k8sName={createK8sName({
          value: 'too-long',
          state: { maxLength: 5, invalidLength: true },
        })}
      />,
    );
    expect(container.querySelector('.pf-m-error')).toBeInTheDocument();
  });

  it('should render success variant when value has content and length is valid', () => {
    const { container } = render(
      <HelperTextItemMaxLength
        k8sName={createK8sName({ value: 'valid', state: { maxLength: 30 } })}
      />,
    );
    expect(container.querySelector('.pf-m-success')).toBeInTheDocument();
  });
});

describe('HelperTextItemRouteNameTooLong', () => {
  it('should render nothing when no namespace is set', () => {
    const { container } = render(
      <HelperTextItemRouteNameTooLong k8sName={createK8sName({ value: 'test' })} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('should render indeterminate variant when value is empty and namespace is set', () => {
    const { container } = render(
      <HelperTextItemRouteNameTooLong
        k8sName={createK8sName({ value: '', state: { namespace: 'my-ns' } })}
      />,
    );
    expect(container.querySelector('.pf-m-indeterminate')).toBeInTheDocument();
    expect(
      screen.getByText('Resource name and project name combined cannot exceed 63 characters'),
    ).toBeInTheDocument();
  });

  it('should render error variant when routeNameTooLong is true', () => {
    const { container } = render(
      <HelperTextItemRouteNameTooLong
        k8sName={createK8sName({
          value: 'a-very-long-resource-name',
          state: { namespace: 'my-ns', routeNameTooLong: true },
        })}
      />,
    );
    expect(container.querySelector('.pf-m-error')).toBeInTheDocument();
    expect(
      screen.getByText('Resource name and project name combined cannot exceed 63 characters'),
    ).toBeInTheDocument();
  });

  it('should render success variant when value has content and route name is within limit', () => {
    const { container } = render(
      <HelperTextItemRouteNameTooLong
        k8sName={createK8sName({
          value: 'short-name',
          state: { namespace: 'my-ns', routeNameTooLong: false },
        })}
      />,
    );
    expect(container.querySelector('.pf-m-success')).toBeInTheDocument();
  });
});

describe('HelperTextItemValidCharacters', () => {
  it('should render indeterminate variant when value is empty', () => {
    const { container } = render(<HelperTextItemValidCharacters k8sName={createK8sName()} />);
    expect(container.querySelector('.pf-m-indeterminate')).toBeInTheDocument();
  });

  it('should render error variant when invalidCharacters is true', () => {
    const { container } = render(
      <HelperTextItemValidCharacters
        k8sName={createK8sName({ value: 'bad!', state: { invalidCharacters: true } })}
      />,
    );
    expect(container.querySelector('.pf-m-error')).toBeInTheDocument();
  });

  it('should render success variant when value has content and characters are valid', () => {
    const { container } = render(
      <HelperTextItemValidCharacters k8sName={createK8sName({ value: 'valid-name' })} />,
    );
    expect(container.querySelector('.pf-m-success')).toBeInTheDocument();
  });

  it('should render custom invalidCharsMessage when provided', () => {
    render(
      <HelperTextItemValidCharacters
        k8sName={createK8sName({ state: { invalidCharsMessage: 'Custom error message' } })}
      />,
    );
    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });

  it('should render default message when no custom message is provided', () => {
    render(<HelperTextItemValidCharacters k8sName={createK8sName()} />);
    expect(
      screen.getByText(
        'Must start and end with a letter or number. Valid characters include lowercase letters, numbers, and hyphens (-).',
      ),
    ).toBeInTheDocument();
  });
});
