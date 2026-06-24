import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SelectTemplateModal from '#~/pages/projects/projectRoles/SelectTemplateModal';

describe('SelectTemplateModal', () => {
  it('should render with "Select a role template" title in select mode', () => {
    render(<SelectTemplateModal mode="select" onSelectTemplate={jest.fn()} onClose={jest.fn()} />);

    expect(screen.getByText('Select a role template')).toBeInTheDocument();
    expect(
      screen.getByText('Choose a template to use as a starting point for your new role.'),
    ).toBeInTheDocument();
  });

  it('should render with "Add rules from template" title in addRules mode', () => {
    render(
      <SelectTemplateModal mode="addRules" onSelectTemplate={jest.fn()} onClose={jest.fn()} />,
    );

    expect(screen.getByText('Add rules from template')).toBeInTheDocument();
    expect(screen.getByText(/Select a template to add its rules to your role/)).toBeInTheDocument();
  });

  it('should render "Select template" buttons in select mode', () => {
    render(<SelectTemplateModal mode="select" onSelectTemplate={jest.fn()} onClose={jest.fn()} />);

    const buttons = screen.getAllByText('Select template');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should render "Add rules" buttons in addRules mode', () => {
    render(
      <SelectTemplateModal mode="addRules" onSelectTemplate={jest.fn()} onClose={jest.fn()} />,
    );

    const buttons = screen.getAllByText('Add rules');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should render template categories and items', () => {
    render(<SelectTemplateModal mode="select" onSelectTemplate={jest.fn()} onClose={jest.fn()} />);

    expect(screen.getByText('Workbench management templates')).toBeInTheDocument();
    expect(screen.getByText('Workbench maintainer')).toBeInTheDocument();
    expect(screen.getByText('Workbench reader')).toBeInTheDocument();
    expect(screen.getByText('Workbench updater')).toBeInTheDocument();
  });

  it('should filter templates by search input', () => {
    render(<SelectTemplateModal mode="select" onSelectTemplate={jest.fn()} onClose={jest.fn()} />);

    const searchInput = screen.getByPlaceholderText('Find by name');
    fireEvent.change(searchInput, { target: { value: 'reader' } });

    expect(screen.getByText('Workbench reader')).toBeInTheDocument();
    expect(screen.queryByText('Workbench maintainer')).not.toBeInTheDocument();
    expect(screen.queryByText('Workbench updater')).not.toBeInTheDocument();
  });

  it('should hide categories with no matching templates', () => {
    render(<SelectTemplateModal mode="select" onSelectTemplate={jest.fn()} onClose={jest.fn()} />);

    const searchInput = screen.getByPlaceholderText('Find by name');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    expect(screen.queryByText('Workbench management templates')).not.toBeInTheDocument();
  });

  it('should call onSelectTemplate when a template button is clicked', () => {
    const onSelectTemplate = jest.fn();
    render(
      <SelectTemplateModal mode="select" onSelectTemplate={onSelectTemplate} onClose={jest.fn()} />,
    );

    fireEvent.click(screen.getByTestId('select-template-workbench-maintainer'));

    expect(onSelectTemplate).toHaveBeenCalledTimes(1);
    expect(onSelectTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'workbench-maintainer' }),
    );
  });

  it('should call onClose when the modal close button is clicked', () => {
    const onClose = jest.fn();
    render(<SelectTemplateModal mode="select" onSelectTemplate={jest.fn()} onClose={onClose} />);

    fireEvent.click(screen.getByLabelText('Close'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
