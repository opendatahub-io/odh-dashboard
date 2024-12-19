import * as React from 'react';
import { EmptyStateVariant } from '@patternfly/react-core';
type DashboardEmptyTableViewProps = {
    hasIcon?: boolean;
    onClearFilters: (event: React.SyntheticEvent<HTMLButtonElement, Event>) => void;
    variant?: EmptyStateVariant;
};
declare const DashboardEmptyTableView: React.FC<DashboardEmptyTableViewProps>;
export default DashboardEmptyTableView;
