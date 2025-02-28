import * as React from 'react';
import { TbodyProps } from '@patternfly/react-table';
import { EitherNotBoth } from '~/shared/typeHelpers';
import TableBase from './TableBase';
type TableProps<DataType> = Omit<React.ComponentProps<typeof TableBase<DataType>>, 'itemCount' | 'onPerPageSelect' | 'onSetPage' | 'page' | 'perPage'> & EitherNotBoth<{
    disableRowRenderSupport?: boolean;
}, {
    tbodyProps?: TbodyProps & {
        ref?: React.Ref<HTMLTableSectionElement>;
    };
}>;
declare const Table: <T>({ data: allData, columns, subColumns, enablePagination, defaultSortColumn, truncateRenderingAt, ...props }: TableProps<T>) => React.ReactElement;
export default Table;
