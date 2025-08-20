import React from 'react';

export interface TagFilterHandlers {
  handleTagClick: (tagString: string) => void;
  handleTagFilterRemove: (tagToRemove: string) => void;
  handleTagFilterAdd: (newTag: string) => void;
  handleFilterTypeChange: (filterType: string) => void;
}

export const useTagFilterHandlers = (
  setTagFilters: React.Dispatch<React.SetStateAction<string[]>>,
  setCurrentFilterType?: React.Dispatch<React.SetStateAction<string>>,
): TagFilterHandlers => {
  const handleTagClick = React.useCallback(
    (tagString: string) => {
      setTagFilters((prevTags) => {
        if (!prevTags.includes(tagString)) {
          return [...prevTags, tagString];
        }
        return prevTags;
      });

      if (setCurrentFilterType) {
        setCurrentFilterType('tag');
      }
    },
    [setTagFilters, setCurrentFilterType],
  );

  const handleTagFilterRemove = React.useCallback(
    (tagToRemove: string) => {
      setTagFilters((prevTags) => prevTags.filter((tag) => tag !== tagToRemove));
    },
    [setTagFilters],
  );

  const handleTagFilterAdd = React.useCallback(
    (newTag: string) => {
      setTagFilters((prevTags) => {
        if (!prevTags.includes(newTag)) {
          return [...prevTags, newTag];
        }
        return prevTags;
      });
    },
    [setTagFilters],
  );

  const handleFilterTypeChange = React.useCallback(
    (filterType: string) => {
      if (setCurrentFilterType) {
        setCurrentFilterType(filterType);
      }
    },
    [setCurrentFilterType],
  );

  return {
    handleTagClick,
    handleTagFilterRemove,
    handleTagFilterAdd,
    handleFilterTypeChange,
  };
};
