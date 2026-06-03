import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import RoleLabelsSection from '#~/pages/projects/projectRoles/RoleLabelsSection';

describe('RoleLabelsSection', () => {
  const mockOnLabelsChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render with no label rows when labels is empty', () => {
      render(<RoleLabelsSection labels={[]} onLabelsChange={mockOnLabelsChange} />);

      expect(screen.getByTestId('role-add-label')).toBeInTheDocument();
      expect(screen.queryByTestId('role-label-key-0')).not.toBeInTheDocument();
    });

    it('should render existing label rows', () => {
      const labels = [
        { id: 'l-1', key: 'team', value: 'platform' },
        { id: 'l-2', key: 'env', value: 'production' },
      ];
      render(<RoleLabelsSection labels={labels} onLabelsChange={mockOnLabelsChange} />);

      expect(screen.getByTestId('role-label-key-0')).toHaveValue('team');
      expect(screen.getByTestId('role-label-value-0')).toHaveValue('platform');
      expect(screen.getByTestId('role-label-key-1')).toHaveValue('env');
      expect(screen.getByTestId('role-label-value-1')).toHaveValue('production');
    });

    it('should render description text', () => {
      render(<RoleLabelsSection labels={[]} onLabelsChange={mockOnLabelsChange} />);

      expect(
        screen.getByText(/Add key\/value labels to organize and filter roles/),
      ).toBeInTheDocument();
    });
  });

  describe('adding labels', () => {
    it('should call onLabelsChange with a new empty row when Add label is clicked', () => {
      render(<RoleLabelsSection labels={[]} onLabelsChange={mockOnLabelsChange} />);

      fireEvent.click(screen.getByTestId('role-add-label'));

      expect(mockOnLabelsChange).toHaveBeenCalledWith([
        expect.objectContaining({ key: '', value: '' }),
      ]);
    });

    it('should append to existing labels when Add label is clicked', () => {
      const labels = [{ id: 'l-1', key: 'team', value: 'platform' }];
      render(<RoleLabelsSection labels={labels} onLabelsChange={mockOnLabelsChange} />);

      fireEvent.click(screen.getByTestId('role-add-label'));

      expect(mockOnLabelsChange).toHaveBeenCalledWith([
        { id: 'l-1', key: 'team', value: 'platform' },
        expect.objectContaining({ key: '', value: '' }),
      ]);
    });
  });

  describe('removing labels', () => {
    it('should remove the correct label row', () => {
      const labels = [
        { id: 'l-1', key: 'team', value: 'platform' },
        { id: 'l-2', key: 'env', value: 'production' },
      ];
      render(<RoleLabelsSection labels={labels} onLabelsChange={mockOnLabelsChange} />);

      fireEvent.click(screen.getByTestId('role-label-remove-0'));

      expect(mockOnLabelsChange).toHaveBeenCalledWith([
        { id: 'l-2', key: 'env', value: 'production' },
      ]);
    });

    it('should remove the last remaining label', () => {
      const labels = [{ id: 'l-1', key: 'team', value: 'platform' }];
      render(<RoleLabelsSection labels={labels} onLabelsChange={mockOnLabelsChange} />);

      fireEvent.click(screen.getByTestId('role-label-remove-0'));

      expect(mockOnLabelsChange).toHaveBeenCalledWith([]);
    });
  });

  describe('editing labels', () => {
    it('should update the key of a label', () => {
      const labels = [{ id: 'l-1', key: '', value: '' }];
      render(<RoleLabelsSection labels={labels} onLabelsChange={mockOnLabelsChange} />);

      fireEvent.change(screen.getByTestId('role-label-key-0'), { target: { value: 'team' } });

      expect(mockOnLabelsChange).toHaveBeenCalledWith([{ id: 'l-1', key: 'team', value: '' }]);
    });

    it('should update the value of a label', () => {
      const labels = [{ id: 'l-1', key: 'team', value: '' }];
      render(<RoleLabelsSection labels={labels} onLabelsChange={mockOnLabelsChange} />);

      fireEvent.change(screen.getByTestId('role-label-value-0'), {
        target: { value: 'platform' },
      });

      expect(mockOnLabelsChange).toHaveBeenCalledWith([
        { id: 'l-1', key: 'team', value: 'platform' },
      ]);
    });

    it('should only update the targeted label row', () => {
      const labels = [
        { id: 'l-1', key: 'team', value: 'platform' },
        { id: 'l-2', key: 'env', value: 'prod' },
      ];
      render(<RoleLabelsSection labels={labels} onLabelsChange={mockOnLabelsChange} />);

      fireEvent.change(screen.getByTestId('role-label-value-1'), {
        target: { value: 'staging' },
      });

      expect(mockOnLabelsChange).toHaveBeenCalledWith([
        { id: 'l-1', key: 'team', value: 'platform' },
        { id: 'l-2', key: 'env', value: 'staging' },
      ]);
    });
  });
});
