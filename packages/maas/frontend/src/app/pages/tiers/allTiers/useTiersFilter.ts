import * as React from 'react';
import { Tier } from '~/app/types/tier';

type UseTiersFilterResult = {
  filteredTiers: Tier[];
  filterValue: string;
  setFilterValue: (value: string) => void;
  onClearFilters: () => void;
};

const useTiersFilter = (tiers: Tier[]): UseTiersFilterResult => {
  const [filterValue, setFilterValue] = React.useState('');

  const filteredTiers = React.useMemo(
    () =>
      tiers.filter((tier) => {
        const searchValue = filterValue.toLowerCase();
        if (!searchValue) {
          return true;
        }
        return (
          tier.displayName.toLowerCase().includes(searchValue) ||
          tier.description.toLowerCase().includes(searchValue)
        );
      }),
    [tiers, filterValue],
  );

  const onClearFilters = React.useCallback(() => setFilterValue(''), []);

  return {
    filteredTiers,
    filterValue,
    setFilterValue,
    onClearFilters,
  };
};

export default useTiersFilter;
