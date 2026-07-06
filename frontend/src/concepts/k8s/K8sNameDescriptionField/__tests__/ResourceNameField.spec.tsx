import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import ResourceNameField from '#~/concepts/k8s/K8sNameDescriptionField/ResourceNameField';

describe('ResourceNameField', () => {
  it('should render immutable name', () => {
    render(
      <ResourceNameField
        allowEdit={false}
        dataTestId="test"
        k8sName={{
          value: 'test',
          state: {
            immutable: true,
            invalidCharacters: false,
            invalidLength: false,
            maxLength: 0,
            touched: false,
          },
        }}
      />,
    );

    expect(screen.queryByTestId('test-resourceName')).not.toBeInTheDocument();
  });

  it('should render nothing if not editable and not immutable', () => {
    const result = render(
      <ResourceNameField
        allowEdit={false}
        dataTestId="test"
        k8sName={{
          value: 'test',
          state: {
            immutable: false,
            invalidCharacters: false,
            invalidLength: false,
            maxLength: 0,
            touched: false,
          },
        }}
      />,
    );

    expect(result.container).toBeEmptyDOMElement();
  });

  it('should render editable name', () => {
    render(
      <ResourceNameField
        allowEdit
        dataTestId="test"
        k8sName={{
          value: 'test',
          state: {
            immutable: false,
            invalidCharacters: false,
            invalidLength: false,
            maxLength: 0,
            touched: false,
          },
        }}
      />,
    );

    expect(screen.queryByTestId('test-resourceName')).toBeInTheDocument();
  });

  it('should render editable name with static prefix', () => {
    render(
      <ResourceNameField
        allowEdit
        dataTestId="test"
        k8sName={{
          value: 'test',
          state: {
            immutable: false,
            invalidCharacters: false,
            invalidLength: false,
            maxLength: 0,
            touched: false,
            safePrefix: 'wb-',
            staticPrefix: true,
          },
        }}
      />,
    );

    expect(screen.getByText('wb-')).toBeInTheDocument();
    expect(screen.queryByTestId('test-resourceName')).toHaveValue('test');
  });
});
