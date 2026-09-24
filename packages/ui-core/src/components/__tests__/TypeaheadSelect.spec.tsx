import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import TypeaheadSelect from '../TypeaheadSelect';

const makeGroupedOptions = (count: number, group: string) =>
  Array.from({ length: count }, (_, i) => ({
    value: `${group}-${i}`,
    content: `${group} option ${i}`,
    group,
  }));

describe('TypeaheadSelect', () => {
  const openMenu = () => {
    fireEvent.click(screen.getByRole('combobox'));
  };

  describe('collapsible groups', () => {
    it('should render plain group headers when grouped option count is below threshold', () => {
      const options = makeGroupedOptions(5, 'NIM storage');
      render(
        <TypeaheadSelect
          dataTestId="test-select"
          selectOptions={options}
          collapsibleGroupsThreshold={12}
          isRequired={false}
        />,
      );

      openMenu();

      expect(screen.getByTestId('typeahead-group-nim-storage')).toBeInTheDocument();
      expect(screen.queryByTestId('typeahead-group-nim-storage-toggle')).not.toBeInTheDocument();
      expect(screen.getByText('NIM storage option 0')).toBeInTheDocument();
    });

    it('should render collapsible group toggles when grouped option count reaches threshold', () => {
      const options = [
        ...makeGroupedOptions(6, 'NIM storage'),
        ...makeGroupedOptions(6, 'General purpose'),
      ];
      render(
        <TypeaheadSelect
          dataTestId="test-select"
          selectOptions={options}
          collapsibleGroupsThreshold={12}
          isRequired={false}
        />,
      );

      openMenu();

      expect(screen.getByTestId('typeahead-group-nim-storage-toggle')).toBeInTheDocument();
      expect(screen.getByTestId('typeahead-group-general-purpose-toggle')).toBeInTheDocument();
      expect(screen.queryByText('NIM storage option 0')).not.toBeInTheDocument();
      expect(screen.queryByText('General purpose option 0')).not.toBeInTheDocument();
    });

    it('should expand a collapsed group when its toggle is clicked', () => {
      const options = [
        ...makeGroupedOptions(6, 'NIM storage'),
        ...makeGroupedOptions(6, 'General purpose'),
      ];
      render(
        <TypeaheadSelect
          dataTestId="test-select"
          selectOptions={options}
          collapsibleGroupsThreshold={12}
          isRequired={false}
        />,
      );

      openMenu();
      fireEvent.click(screen.getByRole('option', { name: 'NIM storage' }));

      expect(screen.getByText('NIM storage option 0')).toBeInTheDocument();
      expect(screen.queryByText('General purpose option 0')).not.toBeInTheDocument();
    });
  });

  describe('single option auto-select', () => {
    it('should not call onSelect when the only option is already selected', () => {
      const onSelect = jest.fn();
      render(
        <TypeaheadSelect
          selectOptions={[{ value: 'only', content: 'Only option' }]}
          selected="only"
          onSelect={onSelect}
        />,
      );

      expect(onSelect).not.toHaveBeenCalled();
    });

    it('should call onSelect when there is only one required option and nothing is selected yet', () => {
      const onSelect = jest.fn();
      render(
        <TypeaheadSelect
          selectOptions={[{ value: 'only', content: 'Only option' }]}
          onSelect={onSelect}
        />,
      );

      expect(onSelect).toHaveBeenCalledWith(undefined, 'only');
    });
  });

  describe('maxMenuHeight', () => {
    it('should apply maxMenuHeight to the menu content when provided', () => {
      const options = makeGroupedOptions(3, 'NIM storage');
      render(
        <TypeaheadSelect
          dataTestId="test-select"
          selectOptions={options}
          maxMenuHeight="300px"
          isRequired={false}
        />,
      );

      openMenu();

      const menuContent = document.querySelector('.pf-v6-c-menu__content');
      expect(menuContent).toHaveStyle({ '--pf-v6-c-menu__content--MaxHeight': '300px' });
    });

    it('should not set maxMenuHeight on the menu content when omitted', () => {
      const options = makeGroupedOptions(3, 'NIM storage');
      render(
        <TypeaheadSelect dataTestId="test-select" selectOptions={options} isRequired={false} />,
      );

      openMenu();

      const menuContent = document.querySelector('.pf-v6-c-menu__content');
      expect(menuContent).toBeInTheDocument();
      expect(menuContent).not.toHaveStyle({ '--pf-v6-c-menu__content--MaxHeight': '300px' });
    });
  });
});
