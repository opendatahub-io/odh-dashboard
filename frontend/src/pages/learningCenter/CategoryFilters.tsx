import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { VerticalTabs, VerticalTabsTab } from '@patternfly/react-catalog-view-extension';
import { OdhDocument } from '#~/types';
import { CATEGORY_ANNOTATION } from '#~/utilities/const';
import { removeQueryArgument, setQueryArgument } from '#~/utilities/router';
import { useQueryParams } from '#~/utilities/useQueryParams';
import { CATEGORY_FILTER_KEY } from './const';

type CategoryFiltersProps = {
  docApps: OdhDocument[];
  favorites: string[];
};

const ALL_ITEMS = 'All Items';

const CategoryFilters: React.FC<CategoryFiltersProps> = ({ docApps, favorites }) => {
  const [categories, setCategories] = React.useState<string[]>([]);
  const navigate = useNavigate();
  const queryParams = useQueryParams();
  const categoryQuery = queryParams.get(CATEGORY_FILTER_KEY) || '';

  React.useEffect(() => {
    const initCategories = favorites.length ? ['Favorites'] : [];
    const updatedCategories = docApps
      .reduce((acc, docApp) => {
        const categoryAnnotation = docApp.metadata.annotations?.[CATEGORY_ANNOTATION];
        if (categoryAnnotation) {
          const annotationCategories = categoryAnnotation.split(',');
          annotationCategories
            .map((category) => category.trim())
            .forEach((category) => {
              if (!acc.includes(category)) {
                acc.push(category);
              }
            });
        }
        return acc;
      }, initCategories)
      .toSorted((a, b) => a.localeCompare(b));
    setCategories([ALL_ITEMS, ...updatedCategories]);
  }, [docApps, favorites]);

  const onSelectCategory = (selectedCategory: string): void => {
    if (selectedCategory === ALL_ITEMS) {
      removeQueryArgument(navigate, CATEGORY_FILTER_KEY);
      return;
    }
    setQueryArgument(navigate, CATEGORY_FILTER_KEY, selectedCategory);
  };

  return (
    <VerticalTabs restrictTabs activeTab>
      {categories.map((category) => (
        <VerticalTabsTab
          key={category}
          title={category}
          shown
          active={category === categoryQuery || (!categoryQuery && category === ALL_ITEMS)}
          onActivate={() => onSelectCategory(category)}
          tabIndex={-1}
        />
      ))}
    </VerticalTabs>
  );
};

export default CategoryFilters;
