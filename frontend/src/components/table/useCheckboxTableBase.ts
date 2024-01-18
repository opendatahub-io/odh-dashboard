import * as React from 'react';
import { intersection, xor } from 'lodash';
import type Table from './Table';

type UseCheckboxTableBase<DataType> = {
  selections: DataType[];
  tableProps: Required<Pick<React.ComponentProps<typeof Table>, 'selectAll'>>;
  toggleSelection: (selection: DataType) => void;
  isSelected: (selection: DataType) => boolean;
};

const useCheckboxTableBase = <T>(
  data: T[],
  selectedData: T[],
  setSelectedData: React.Dispatch<React.SetStateAction<T[]>>,
  dataMappingHelper: (selectData: T) => string,
  selectAll?: { selected?: boolean; disabled?: boolean },
): UseCheckboxTableBase<T> => {
  const dataIds = React.useMemo(() => data.map(dataMappingHelper), [data, dataMappingHelper]);
  const selectedDataIds = React.useMemo(
    () => selectedData.map(dataMappingHelper),
    [selectedData, dataMappingHelper],
  );

  // remove selected ids that are no longer present in the provided dataIds
  React.useEffect(() => {
    const newSelectedIds = intersection(selectedDataIds, dataIds);
    const newSelectedData = newSelectedIds
      .map((id) => data.find((d) => dataMappingHelper(d) === id))
      .filter((v): v is T => !!v);
    if (selectedData.length !== newSelectedData.length) {
      setSelectedData(newSelectedData);
    }
  }, [data, dataIds, dataMappingHelper, selectedData, selectedDataIds, setSelectedData]);

  return React.useMemo(() => {
    // Header is selected if all selections and all ids are equal
    // This will allow for checking of the header to "reset" to provided ids during a trim/filter
    const headerSelected = selectedDataIds.length > 0 && xor(selectedDataIds, dataIds).length === 0;

    return {
      selections: selectedData,
      tableProps: {
        selectAll: {
          onSelect: (value) => {
            setSelectedData(value ? data : []);
          },
          selected: headerSelected,
          ...selectAll,
        },
      },
      isSelected: (selection) => selectedDataIds.includes(dataMappingHelper(selection)),
      toggleSelection: (selection) => {
        const id = dataMappingHelper(selection);
        setSelectedData((prevData) =>
          prevData.map(dataMappingHelper).includes(id)
            ? prevData.filter((selectedData) => dataMappingHelper(selectedData) !== id)
            : [...prevData, selection],
        );
      },
    };
  }, [selectedDataIds, dataIds, selectedData, selectAll, setSelectedData, data, dataMappingHelper]);
};

export default useCheckboxTableBase;
