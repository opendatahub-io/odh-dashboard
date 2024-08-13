import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { DropdownField } from '~/concepts/connectionTypes/types';
import DropdownFormField from '~/concepts/connectionTypes/fields/DropdownFormField';

describe('DropdownFormField', () => {
  describe('single variant', () => {
    it('should render editable field', async () => {
      const onChange = jest.fn();
      const field: DropdownField = {
        type: 'dropdown',
        name: 'test-name',
        envVar: 'test-envVar',
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

      render(<DropdownFormField field={field} value={['2']} onChange={onChange} />);
      const input = screen.getByRole('button');
      expect(input).toHaveTextContent('Two');
      expect(input).not.toBeDisabled();

      act(() => {
        input.click();
      });
      const option = screen.getByRole('option', { name: 'One' });
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
        envVar: 'test-envVar',
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

      render(<DropdownFormField field={field} value={['2']} onChange={onChange} isPreview />);
      const input = screen.getByRole('button');
      expect(input).toHaveTextContent('Three');
      expect(input).not.toBeDisabled();

      act(() => {
        input.click();
      });
      const option = screen.getByRole('option', { name: 'One' });
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
        envVar: 'test-envVar',
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

      render(<DropdownFormField field={field} value={['2']} onChange={onChange} isPreview />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(screen.queryByText('Three')).toBeInTheDocument();
    });
  });

  describe('multi variant', () => {
    it('should render editable field', async () => {
      const onChange = jest.fn();
      const field: DropdownField = {
        type: 'dropdown',
        name: 'test-name',
        envVar: 'test-envVar',
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

      render(<DropdownFormField field={field} value={['1', '2']} onChange={onChange} />);
      const input = screen.getByRole('button');
      expect(input).toHaveTextContent('Count 2 selected');
      expect(input).not.toBeDisabled();

      act(() => {
        input.click();
      });

      const checkboxOne = screen.getByLabelText('One');
      const checkboxThree = screen.getByLabelText('Three');

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
        envVar: 'test-envVar',
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

      render(<DropdownFormField field={field} value={['1', '2']} onChange={onChange} isPreview />);
      const input = screen.getByRole('button');
      expect(input).toHaveTextContent('Count 1 selected');
      expect(input).not.toBeDisabled();

      act(() => {
        input.click();
      });

      const checkboxOne = screen.getByLabelText('One');

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
        envVar: 'test-envVar',
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

      render(<DropdownFormField field={field} value={['1', '2']} onChange={onChange} isPreview />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(screen.queryByText('Two, Three')).toBeInTheDocument();
    });
  });
});
