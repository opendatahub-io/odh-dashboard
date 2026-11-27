import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { CUSTOM_VARIABLE } from '#~/pages/notebookController/const';
import EnvironmentVariablesField from '#~/pages/notebookController/screens/server/EnvironmentVariablesField';

describe('EnvironmentVariablesField', () => {
  it.each(['mouse', 'keyboard'])(
    'should name the password visibility action and toggle visibility using the %s',
    async (inputMethod) => {
      const user = userEvent.setup();
      const variable = { name: 'EXAMPLE_VARIABLE', type: 'password', value: 'example-value' };
      const onUpdateVariable = jest.fn();
      render(
        <EnvironmentVariablesField
          fieldIndex="0"
          variable={variable}
          variableRow={{ variableType: CUSTOM_VARIABLE, variables: [variable], errors: {} }}
          onUpdateVariable={onUpdateVariable}
        />,
      );

      const visibilityButton = screen.getByTestId('0-show-password');
      const valueInput = screen.getByTestId('0-value');
      expect(visibilityButton).toHaveAccessibleName('Show password');
      expect(valueInput).toHaveAttribute('type', 'password');
      expect(valueInput).toHaveValue(variable.value);

      if (inputMethod === 'keyboard') {
        await user.tab();
        await user.tab();
        await user.tab();
        expect(visibilityButton).toHaveFocus();
        await user.keyboard('{Enter}');
      } else {
        await user.click(visibilityButton);
      }

      expect(visibilityButton).toHaveAccessibleName('Hide password');
      expect(valueInput).toHaveAttribute('type', 'text');
      expect(valueInput).toHaveValue(variable.value);

      if (inputMethod === 'keyboard') {
        expect(visibilityButton).toHaveFocus();
        await user.keyboard(' ');
      } else {
        await user.click(visibilityButton);
      }

      expect(visibilityButton).toHaveAccessibleName('Show password');
      expect(valueInput).toHaveAttribute('type', 'password');
      expect(valueInput).toHaveValue(variable.value);
      expect(onUpdateVariable).not.toHaveBeenCalled();
    },
  );
});
