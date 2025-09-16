import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { UseSearchStateReturn } from './useSearchState';
import { getFeatureStoreRoute } from '../utils/searchUtils';

export interface ISearchItem {
  id: string;
  title: string;
  description: string;
  category: string;
  type: string;
  project: string;
}

export interface UseSearchHandlersOptions {
  onSearchChange?: (query: string) => Promise<void>;
  onClear?: () => void;
  onSelect?: (item: ISearchItem) => void;
  project?: string;
}

export interface UseSearchHandlersReturn {
  handleSearchChange: (event: React.FormEvent<HTMLInputElement>, value: string) => void;
  handleSearchClear: () => void;
  handleResultSelect: (selectedItem: ISearchItem) => void;
}

export const useSearchHandlers = (
  state: UseSearchStateReturn,
  options: UseSearchHandlersOptions = {},
): UseSearchHandlersReturn => {
  const { onSearchChange, onClear, onSelect, project } = options;
  const navigate = useNavigate();

  const {
    setSearchValue,
    setIsSearchOpen,
    setIsSearching,
    timeoutRef,
    searchInputRef,
    searchMenuRef,
  } = state;

  const debouncedSearch = React.useCallback(
    (value: string) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      setIsSearchOpen(true);
      setIsSearching(true);

      timeoutRef.current = setTimeout(() => {
        if (onSearchChange) {
          onSearchChange(value);
        }
      }, 300);
    },
    [onSearchChange, setIsSearchOpen, setIsSearching, timeoutRef],
  );

  const handleSearchChange = React.useCallback(
    (_event: React.FormEvent<HTMLInputElement>, value: string) => {
      const trimmedValue = value.trim();
      setSearchValue(trimmedValue);

      if (trimmedValue === '') {
        if (onClear) {
          onClear();
        }
        return;
      }

      debouncedSearch(trimmedValue);
    },
    [debouncedSearch, onClear, setSearchValue],
  );

  const handleResultSelect = React.useCallback(
    (selectedItem: ISearchItem) => {
      setSearchValue('');
      setIsSearchOpen(false);

      if (onSelect) {
        onSelect(selectedItem);
      }
      const projectToUse = project && project.trim() !== '' ? project : selectedItem.project;

      if (selectedItem.type && projectToUse) {
        const route = getFeatureStoreRoute(selectedItem.type, projectToUse, selectedItem.title);
        if (route) {
          navigate(route);
        }
      }
    },
    [onSelect, navigate, project, setSearchValue, setIsSearchOpen],
  );

  const handleSearchClear = React.useCallback(() => {
    setSearchValue('');
    setIsSearching(false);
    if (onClear) {
      onClear();
    }
  }, [onClear, setSearchValue, setIsSearching]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && (state.isSearchOpen || state.searchValue.trim() !== '')) {
        setSearchValue('');
        setIsSearchOpen(false);
        setIsSearching(false);
        if (onClear) {
          onClear();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    state.isSearchOpen,
    state.searchValue,
    onClear,
    setSearchValue,
    setIsSearchOpen,
    setIsSearching,
  ]);

  React.useEffect(() => {
    const handleClickOutside = ({ target }: MouseEvent) => {
      if (
        searchInputRef.current &&
        searchMenuRef.current &&
        target instanceof Node &&
        !searchInputRef.current.contains(target) &&
        !searchMenuRef.current.contains(target)
      ) {
        setSearchValue('');
        setIsSearchOpen(false);
        setIsSearching(false);
        if (onClear) {
          onClear();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClear, searchInputRef, searchMenuRef, setSearchValue, setIsSearchOpen, setIsSearching]);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [timeoutRef]);

  return {
    handleSearchChange,
    handleSearchClear,
    handleResultSelect,
  };
};
