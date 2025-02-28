import * as React from 'react';
export declare enum SearchType {
    NAME = "Name",
    DESCRIPTION = "Description",
    USER = "User",
    PROJECT = "Project",
    METRIC = "Metric",
    PROTECTED_ATTRIBUTE = "Protected attribute",
    PRIVILEGED_VALUE = "Privileged value",
    UNPRIVILEGED_VALUE = "Unprivileged value",
    OUTPUT = "Output",
    OUTPUT_VALUE = "Output value",
    PROVIDER = "Provider",
    IDENTIFIER = "Identifier",
    KEYWORD = "Keyword",
    AUTHOR = "Author",
    OWNER = "Owner"
}
type DashboardSearchFieldProps = {
    types: SearchType[];
    searchType: SearchType;
    onSearchTypeChange: (searchType: SearchType) => void;
    searchValue: string;
    onSearchValueChange: (searchValue: string) => void;
    icon?: React.ReactNode;
};
declare const DashboardSearchField: React.FC<DashboardSearchFieldProps>;
export default DashboardSearchField;
