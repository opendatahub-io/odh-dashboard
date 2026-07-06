import * as React from 'react';
import { ToolbarGroup } from '@patternfly/react-core';
type FilterOptionRenders = {
    onChange: (value?: string, label?: string) => void;
    value?: string;
    label?: string;
};
export type ToolbarFilterProps<T extends string> = React.ComponentProps<typeof ToolbarGroup> & {
    children?: React.ReactNode;
    filterOptions: {
        [key in T]?: string;
    };
    filterOptionRenders: Record<T, (props: FilterOptionRenders) => React.ReactNode>;
    filterData: Record<T, string | {
        label: string;
        value: string;
    } | undefined>;
    onFilterUpdate: (filterType: T, value?: string | {
        label: string;
        value: string;
    }) => void;
    testId?: string;
};
declare function FilterToolbar<T extends string>({ filterOptions, filterOptionRenders, filterData, onFilterUpdate, children, testId, ...toolbarGroupProps }: ToolbarFilterProps<T>): React.JSX.Element;
export default FilterToolbar;
