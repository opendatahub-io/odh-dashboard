import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ServingRuntimeModelType } from '@odh-dashboard/model-serving/shared';
import CustomServingRuntimeModelTypeSelector from '../CustomServingRuntimeModelTypeSelector';

describe('CustomServingRuntimeModelTypeSelector', () => {
  it.each([
    { selectedModelTypes: [] },
    { selectedModelTypes: [ServingRuntimeModelType.PREDICTIVE] },
    { selectedModelTypes: [ServingRuntimeModelType.GENERATIVE] },
    {
      selectedModelTypes: [ServingRuntimeModelType.PREDICTIVE, ServingRuntimeModelType.GENERATIVE],
    },
  ])(
    'should show the initial selection count for $selectedModelTypes',
    ({ selectedModelTypes }) => {
      render(
        <CustomServingRuntimeModelTypeSelector
          selectedModelTypes={selectedModelTypes}
          setSelectedModelTypes={jest.fn()}
        />,
      );

      const toggle = screen.getByRole('button', { name: /Select model types/ });
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      if (selectedModelTypes.length > 0) {
        expect(within(toggle).getByTestId('model-type-selection-count')).toHaveTextContent(
          String(selectedModelTypes.length),
        );
      } else {
        expect(within(toggle).queryByTestId('model-type-selection-count')).not.toBeInTheDocument();
        expect(toggle).toHaveTextContent(/^Select model types$/);
      }
    },
  );

  it('should update the count when the selected model types change', () => {
    const setSelectedModelTypes = jest.fn();
    const { rerender } = render(
      <CustomServingRuntimeModelTypeSelector
        selectedModelTypes={[ServingRuntimeModelType.PREDICTIVE]}
        setSelectedModelTypes={setSelectedModelTypes}
      />,
    );
    expect(screen.getByTestId('model-type-selection-count')).toHaveTextContent('1');

    rerender(
      <CustomServingRuntimeModelTypeSelector
        selectedModelTypes={[
          ServingRuntimeModelType.PREDICTIVE,
          ServingRuntimeModelType.GENERATIVE,
        ]}
        setSelectedModelTypes={setSelectedModelTypes}
      />,
    );
    expect(screen.getByTestId('model-type-selection-count')).toHaveTextContent('2');

    rerender(
      <CustomServingRuntimeModelTypeSelector
        selectedModelTypes={[]}
        setSelectedModelTypes={setSelectedModelTypes}
      />,
    );
    expect(screen.queryByTestId('model-type-selection-count')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select model types' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });
});
