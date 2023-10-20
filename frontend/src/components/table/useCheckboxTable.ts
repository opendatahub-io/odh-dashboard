import * as React from 'react';
import { xor } from 'lodash';
import { useDeepCompareMemoize } from '~/utilities/useDeepCompareMemoize';
import type Table from './Table';

type UseCheckboxTable = {
  selections: string[];
  tableProps: Pick<React.ComponentProps<typeof Table>, 'selectAll'>;
  toggleSelection: (id: string) => void;
  isSelected: (id: string) => boolean;
};

const useCheckboxTable = (dataIds: string[]): UseCheckboxTable => {
  const refStableDataIds = useDeepCompareMemoize(dataIds);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  return React.useMemo(() => {
    // Header is selected if all selections and all ids are equal
    // This will allow for checking of the header to "reset" to provided ids during a trim/filter
    const headerSelected =
      selectedIds.length > 0 && xor(selectedIds, refStableDataIds).length === 0;

    return {
      selections: selectedIds,
      tableProps: {
        selectAll: {
          onSelect: (value) => {
            setSelectedIds(value ? refStableDataIds : []);
          },
          selected: headerSelected,
        },
      },
      isSelected: (id) => selectedIds.includes(id),
      toggleSelection: (id) => {
        if (selectedIds.includes(id)) {
          setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id));
        } else {
          setSelectedIds([...selectedIds, id]);
        }
      },
    };
  }, [refStableDataIds, selectedIds]);
};

export default useCheckboxTable;
