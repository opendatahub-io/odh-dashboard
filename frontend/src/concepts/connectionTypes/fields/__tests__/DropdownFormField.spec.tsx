import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import { act } from 'react';
import { DropdownField } from '#~/concepts/connectionTypes/types';
import DropdownFormField from '#~/concepts/connectionTypes/fields/DropdownFormField';
import { MODAL_OVERFLOW_UNLOCK_COUNT_ATTR } from '#~/utilities/useModalOverflowUnlock';

describe('DropdownFormField', () => {
  describe('single variant', () => {
    it('should render editable field', async () => {
      const onChange = jest.fn();
      const field: DropdownField = {
        type: 'dropdown',
        name: 'test-name',
        envVar: 'test_envVar',
        properties: {
          variant: 'single',
          items: [
            { value: '1', label: 'One' },
            { value: '2', label: 'Two' },
            { value: '3', label: 'Three' },
          ],
          defaultValue: ['3'],
        },
      };

      render(<DropdownFormField id="test" field={field} value={['2']} onChange={onChange} />);
      const input = screen.getByRole('button');
      expect(input).toHaveTextContent('Two');
      expect(input).not.toBeDisabled();

      act(() => {
        input.click();
      });
      const option = screen.getByRole('option', { name: /One/ });
      act(() => {
        option.click();
      });
      await waitFor(() => expect(input).toHaveAttribute('aria-expanded', 'false'));
      expect(onChange).toHaveBeenCalledWith(['1']);
    });

    it('should render preview field', async () => {
      const onChange = jest.fn();
      const field: DropdownField = {
        type: 'dropdown',
        name: 'test-name',
        envVar: 'test_envVar',
        properties: {
          variant: 'single',
          items: [
            { value: '1', label: 'One' },
            { value: '2', label: 'Two' },
            { value: '3', label: 'Three' },
          ],
          defaultValue: ['3'],
        },
      };

      render(
        <DropdownFormField
          id="test"
          field={field}
          value={['2']}
          onChange={onChange}
          mode="preview"
        />,
      );
      const input = screen.getByRole('button');
      expect(input).toHaveTextContent('Three');
      expect(input).not.toBeDisabled();

      act(() => {
        input.click();
      });
      const option = screen.getByRole('option', { name: /One/ });
      act(() => {
        option.click();
      });
      expect(onChange).not.toHaveBeenCalled();

      // close menu to suppress error from popper
      act(() => {
        input.click();
      });
      await waitFor(() => expect(input).toHaveAttribute('aria-expanded', 'false'));
    });

    it('should render default value read only field', async () => {
      const onChange = jest.fn();
      const field: DropdownField = {
        type: 'dropdown',
        name: 'test-name',
        envVar: 'test_envVar',
        properties: {
          variant: 'single',
          items: [
            { value: '1', label: 'One' },
            { value: '2', label: 'Two' },
            { value: '3', label: 'Three' },
          ],
          defaultValue: ['3'],
          defaultReadOnly: true,
        },
      };

      render(
        <DropdownFormField
          id="test"
          field={field}
          value={['2']}
          onChange={onChange}
          mode="preview"
        />,
      );
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(screen.queryByText('Three (Value: 3)')).toBeInTheDocument();
    });
  });

  describe('multi variant', () => {
    it('should render editable field', async () => {
      const onChange = jest.fn();
      const field: DropdownField = {
        type: 'dropdown',
        name: 'test-name',
        envVar: 'test_envVar',
        properties: {
          variant: 'multi',
          items: [
            { value: '1', label: 'One' },
            { value: '2', label: 'Two' },
            { value: '3', label: 'Three' },
          ],
          defaultValue: ['3'],
        },
      };

      render(<DropdownFormField id="test" field={field} value={['1', '2']} onChange={onChange} />);
      const input = screen.getByRole('button');
      expect(input).toHaveTextContent('Select test-name 2 selected');
      expect(input).not.toBeDisabled();

      act(() => {
        input.click();
      });

      const checkboxOne = screen.getByLabelText('OneValue: 1');
      const checkboxThree = screen.getByLabelText('ThreeValue: 3');

      // close menu
      act(() => {
        checkboxOne.click();
      });
      expect(onChange).toHaveBeenCalledWith(['2']);

      onChange.mockReset();

      act(() => {
        checkboxThree.click();
        input.click();
      });
      await waitFor(() => expect(input).toHaveAttribute('aria-expanded', 'false'));
      expect(onChange).toHaveBeenCalledWith(['1', '2', '3']);
    });

    it('should render preview field', async () => {
      const onChange = jest.fn();
      const field: DropdownField = {
        type: 'dropdown',
        name: 'test-name',
        envVar: 'test_envVar',
        properties: {
          variant: 'multi',
          items: [
            { value: '1', label: 'One' },
            { value: '2', label: 'Two' },
            { value: '3', label: 'Three' },
          ],
          defaultValue: ['3'],
        },
      };

      render(
        <DropdownFormField
          id="test"
          field={field}
          value={['1', '2']}
          onChange={onChange}
          mode="preview"
        />,
      );
      const input = screen.getByRole('button');
      expect(input).toHaveTextContent('Select test-name 1 selected');
      expect(input).not.toBeDisabled();

      act(() => {
        input.click();
      });

      const checkboxOne = screen.getByLabelText('OneValue: 1');

      // close menu
      act(() => {
        checkboxOne.click();
        input.click();
      });
      expect(onChange).not.toHaveBeenCalled();
      await waitFor(() => expect(input).toHaveAttribute('aria-expanded', 'false'));
    });

    it('should render default value read only field', async () => {
      const onChange = jest.fn();
      const field: DropdownField = {
        type: 'dropdown',
        name: 'test-name',
        envVar: 'test_envVar',
        properties: {
          variant: 'multi',
          items: [
            { value: '1', label: 'One' },
            { value: '2', label: 'Two' },
            { value: '3', label: 'Three' },
          ],
          defaultValue: ['2', '3'],
          defaultReadOnly: true,
        },
      };

      render(
        <DropdownFormField
          id="test"
          field={field}
          value={['1', '2']}
          onChange={onChange}
          mode="preview"
        />,
      );
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(screen.queryByText('Two (Value: 2), Three (Value: 3)')).toBeInTheDocument();
    });
  });

  it('should portal options into the modal dialog for keyboard and screen reader access', async () => {
    const dialogRef = React.createRef<HTMLDivElement>();
    const onChange = jest.fn();
    const field: DropdownField = {
      type: 'dropdown',
      name: 'Access type',
      envVar: 'ACCESS_TYPE',
      properties: {
        variant: 'multi',
        items: [
          { value: 'Push', label: 'Push secret' },
          { value: 'Pull', label: 'Pull secret' },
        ],
      },
    };

    render(
      <div ref={dialogRef} role="dialog" style={{ overflow: 'auto' }}>
        <DropdownFormField id="access-type" field={field} value={[]} onChange={onChange} />
      </div>,
    );

    const dialog = dialogRef.current as HTMLDivElement;
    const toggle = screen.getByRole('button');
    const fieldAnchor = toggle.closest('.odh-dropdown-form-field__toggle-anchor');

    act(() => {
      toggle.click();
    });

    expect(dialog.style.overflow).toBe('visible');
    expect(dialog.getAttribute(MODAL_OVERFLOW_UNLOCK_COUNT_ATTR)).toBe('1');

    // Multi SelectOption with checkbox: menu must portal into the dialog, not stay
    // under the field toggle (inline render would also satisfy within(dialog)).
    // Accessible name is "Push secret Value: Push" (label + description).
    const pushOption = within(dialog).getByRole('checkbox', { name: /Push secret/ });
    expect(dialog.contains(pushOption)).toBe(true);
    expect(fieldAnchor?.contains(pushOption)).toBe(false);
  });

  it('should return focus to the toggle after selecting an option', async () => {
    const onChange = jest.fn();
    const field: DropdownField = {
      type: 'dropdown',
      name: 'Access type',
      envVar: 'ACCESS_TYPE',
      properties: {
        variant: 'multi',
        items: [
          { value: 'Push', label: 'Push secret' },
          { value: 'Pull', label: 'Pull secret' },
        ],
      },
    };

    render(<DropdownFormField id="access-type" field={field} value={[]} onChange={onChange} />);

    const toggle = screen.getByRole('button', { name: /Select access type/i });

    await act(async () => {
      toggle.click();
    });

    const pushOption = screen.getByRole('checkbox', { name: /Push secret/ });

    await act(async () => {
      pushOption.click();
      await Promise.resolve();
    });

    expect(onChange).toHaveBeenCalledWith(['Push']);
    expect(document.activeElement).toBe(toggle);
  });

  it('should return focus to the toggle after Escape closes the menu', async () => {
    const onChange = jest.fn();
    const field: DropdownField = {
      type: 'dropdown',
      name: 'Access type',
      envVar: 'ACCESS_TYPE',
      properties: {
        variant: 'multi',
        items: [
          { value: 'Push', label: 'Push secret' },
          { value: 'Pull', label: 'Pull secret' },
        ],
      },
    };

    render(
      <div role="dialog">
        <DropdownFormField id="access-type" field={field} value={[]} onChange={onChange} />
      </div>,
    );

    const toggle = screen.getByRole('button', { name: /Select access type/i });

    await act(async () => {
      toggle.click();
    });

    const pushOption = screen.getByRole('checkbox', { name: /Push secret/ });
    pushOption.focus();

    await act(async () => {
      fireEvent.keyDown(pushOption, { key: 'Escape' });
      await Promise.resolve();
    });

    await waitFor(() => expect(toggle).toHaveAttribute('aria-expanded', 'false'));
    expect(document.activeElement).toBe(toggle);
  });
});
