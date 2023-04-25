import * as React from 'react';
import Table from '~/components/table/Table';
import { useDeepCompareMemoize } from '~/utilities/useDeepCompareMemoize';

type UseCheckboxTable = {
  selections: string[];
  tableProps: Pick<React.ComponentProps<typeof Table>, 'selectAll'>;
  toggleSelection: (id: string) => void;
  isSelected: (id: string) => boolean;
};

const useCheckboxTable = (dataIds: string[]): UseCheckboxTable => {
  const refStableDataIds = useDeepCompareMemoize(dataIds);
  const [headerSelected, setHeaderSelected] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  return React.useMemo(
    () => ({
      selections: selectedIds,
      tableProps: {
        selectAll: {
          onSelect: (value) => {
            setHeaderSelected(value);
            setSelectedIds(value ? refStableDataIds : []);
          },
          selected: headerSelected,
        },
      },
      isSelected: (id) => selectedIds.includes(id),
      toggleSelection: (id) => {
        if (selectedIds.includes(id)) {
          setHeaderSelected(false);
          setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id));
        } else {
          setSelectedIds([...selectedIds, id]);
        }
      },
    }),
    [headerSelected, refStableDataIds, selectedIds],
  );
};

export default useCheckboxTable;
