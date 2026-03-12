import * as React from 'react';

export interface UseSearchStateOptions {
  isLoading?: boolean;
}

export interface UseSearchStateReturn {
  searchValue: string;
  setSearchValue: (value: string) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  isSmallScreen: boolean;
  isSearching: boolean;
  setIsSearching: (searching: boolean) => void;
  searchInputRef: React.RefObject<HTMLInputElement>;
  searchMenuRef: React.RefObject<HTMLDivElement>;
}

export const useSearchState = ({
  isLoading = false,
}: UseSearchStateOptions = {}): UseSearchStateReturn => {
  const [searchValue, setSearchValue] = React.useState('');
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [isSmallScreen, setIsSmallScreen] = React.useState(false);
  const [isSearching, setIsSearching] = React.useState(false);

  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const searchMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleResize = () => {
      const isSmall = window.innerWidth <= 768;
      setIsSmallScreen(isSmall);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  React.useEffect(() => {
    if (searchValue.trim() !== '') {
      setIsSearchOpen(true);
    } else {
      setIsSearchOpen(false);
    }
  }, [searchValue, isLoading]);

  React.useEffect(() => {
    if (!isLoading) {
      setIsSearching(false);
    }
  }, [isLoading]);

  return {
    searchValue,
    setSearchValue,
    isSearchOpen,
    setIsSearchOpen,
    isSmallScreen,
    isSearching,
    setIsSearching,
    searchInputRef,
    searchMenuRef,
  };
};
