import * as React from 'react';
import type Table from './Table';
type UseCheckboxTable = {
    selections: string[];
    tableProps: Required<Pick<React.ComponentProps<typeof Table>, 'selectAll'>>;
    toggleSelection: (id: string) => void;
    isSelected: (id: string) => boolean;
    setSelections: (selections: string[]) => void;
};
declare const useCheckboxTable: (dataIds: string[], defaultSelectedIds?: string[], persistSelections?: boolean) => UseCheckboxTable;
export default useCheckboxTable;
