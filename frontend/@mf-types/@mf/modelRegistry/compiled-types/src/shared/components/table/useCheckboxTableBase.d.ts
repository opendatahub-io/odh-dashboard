import * as React from 'react';
import type Table from './Table';
export type UseCheckboxTableBaseProps<DataType> = {
    selections: DataType[];
    tableProps: Required<Pick<React.ComponentProps<typeof Table>, 'selectAll'>>;
    toggleSelection: (selection: DataType) => void;
    isSelected: (selection: DataType) => boolean;
    disableCheck: (item: DataType, enabled: boolean) => void;
    setSelections: React.Dispatch<React.SetStateAction<DataType[]>>;
};
declare const useCheckboxTableBase: <T>(data: T[], selectedData: T[], setSelectedData: React.Dispatch<React.SetStateAction<T[]>>, dataMappingHelper: (selectData: T) => string, options?: {
    selectAll?: {
        selected?: boolean;
        disabled?: boolean;
    };
    persistSelections?: boolean;
}) => UseCheckboxTableBaseProps<T>;
export default useCheckboxTableBase;
