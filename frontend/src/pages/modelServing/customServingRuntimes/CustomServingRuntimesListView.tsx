import * as React from 'react';
import * as _ from 'lodash';
import { Button, ToolbarItem } from '@patternfly/react-core';
import Table from '~/components/Table';
import SearchField, { SearchType } from '~/pages/projects/components/SearchField';
import { TemplateKind } from '~/k8sTypes';
import { patchDashboardConfigTemplateOrder } from '~/api';
import { useDashboardNamespace } from '~/redux/selectors';
import useNotification from '~/utilities/useNotification';
import { compareTemplateKinds } from './utils';
import { columns } from './templatedData';
import CustomServingRuntimesTableRow from './CustomServingRuntimesTableRow';

type CustomServingRuntimesListViewProps = {
  templates: TemplateKind[];
  templateOrder: string[];
  refresh: () => void;
};

const CustomServingRuntimesListView: React.FC<CustomServingRuntimesListViewProps> = ({
  templates: unfilteredTemplates,
  templateOrder,
  refresh,
}) => {
  const { dashboardNamespace } = useDashboardNamespace();
  const notification = useNotification();
  const [searchType, setSearchType] = React.useState<SearchType>(SearchType.NAME);
  const [search, setSearch] = React.useState('');

  // TODO: should we disabled drag&drop when using search function?
  const filteredTemplates = unfilteredTemplates
    .sort(compareTemplateKinds(templateOrder))
    .filter((template) => {
      if (!search) {
        return true;
      }

      switch (searchType) {
        case SearchType.NAME:
          return template.metadata.name.includes(search.toLowerCase());
        default:
          return true;
      }
    });

  const resetFilters = () => {
    setSearch('');
  };

  const searchTypes = React.useMemo(
    () => Object.keys(SearchType).filter((key) => SearchType[key] === SearchType.NAME),
    [],
  );

  const onDropCallback = React.useCallback(
    (newTemplateOrder) => {
      if (!_.isEqual(newTemplateOrder, templateOrder)) {
        patchDashboardConfigTemplateOrder(newTemplateOrder, dashboardNamespace)
          .then(refresh)
          .catch((e) => notification.error(`Error update the serving runtimes order`, e.message));
      }
    },
    [templateOrder, dashboardNamespace, refresh, notification],
  );

  return (
    <>
      <Table
        enablePagination
        isDraggable
        data={filteredTemplates}
        columns={columns}
        initialItemOrder={filteredTemplates.map((template) => template.metadata.name)}
        emptyTableView={
          <>
            No serving runtimes match your filters.{' '}
            <Button variant="link" isInline onClick={resetFilters}>
              Clear filters
            </Button>
          </>
        }
        rowRenderer={(template, rowIndex, trDragFunctions) => (
          <CustomServingRuntimesTableRow
            key={template.metadata.uid}
            obj={template}
            rowIndex={rowIndex}
            dragFunctions={trDragFunctions}
          />
        )}
        toolbarContent={
          <ToolbarItem>
            <SearchField
              types={searchTypes}
              searchType={searchType}
              searchValue={search}
              onSearchTypeChange={(searchType) => {
                setSearchType(searchType);
              }}
              onSearchValueChange={(searchValue) => {
                setSearch(searchValue);
              }}
            />
          </ToolbarItem>
        }
        onDropCallback={onDropCallback}
      />
    </>
  );
};

export default CustomServingRuntimesListView;
