import * as React from 'react';
import {
  ClipboardCopy,
  DataListAction,
  DataListCell,
  DataListContent,
  DataListItem,
  DataListItemCells,
  DataListItemRow,
  DataListToggle,
  Dropdown,
  DropdownItem,
  KebabToggle,
  Title,
} from '@patternfly/react-core';
import '../DataProjects.scss';
import { OpenShiftRoute, Predictor, ServingRuntimeList } from '../../../types';
import { getModelRoute, getModelTypeDisplayName } from '../../../utilities/servingUtils';

type PredictorListItemProps = {
  dataKey: string;
  predictor: Predictor;
  route: OpenShiftRoute | undefined;
  servingRuntimeList: ServingRuntimeList | undefined;
  setModalOpen: (isOpen: boolean) => void;
  onDelete: (predictor: Predictor) => void;
  handleListItemToggle: (id: string) => void;
  expandedItems: Set<string>;
};

const PredictorListItem: React.FC<PredictorListItemProps> = React.memo(
  ({
    dataKey,
    predictor,
    route,
    servingRuntimeList,
    setModalOpen,
    onDelete,
    handleListItemToggle,
    expandedItems,
  }) => {
    const [isDropdownOpen, setDropdownOpen] = React.useState(false);
    const [isExpanded, setExpanded] = React.useState(expandedItems.has(dataKey));

    let creationDate;
    if (predictor.metadata.creationTimestamp) {
      creationDate = new Date(predictor.metadata.creationTimestamp).toLocaleString();
    }

    React.useEffect(() => {
      if (dataKey) {
        if (isExpanded !== expandedItems.has(dataKey)) {
          setExpanded(expandedItems.has(dataKey));
        }
      }
    }, [expandedItems, dataKey, isExpanded]);

    const getResourceAnnotation = (resource: Predictor, annotationKey: string): string =>
      resource?.metadata.annotations?.[annotationKey] ?? '';

    const handleEdit = () => {
      console.log('PredictorListItem handleEdit');
    };

    const dropdownItems = [
      <DropdownItem onClick={handleEdit} key={`${dataKey}-edit`} component="button">
        Edit
      </DropdownItem>,
      <DropdownItem
        onClick={() => onDelete(predictor)}
        key={`${dataKey}-delete`}
        component="button"
      >
        Delete
      </DropdownItem>,
    ];

    return (
      <DataListItem className="odh-data-projects__data-list-item" isExpanded={isExpanded}>
        <DataListItemRow>
          <DataListToggle
            onClick={() => handleListItemToggle(dataKey)}
            isExpanded={isExpanded}
            id={`${dataKey}-toggle`}
          />
          <DataListItemCells
            dataListCells={[
              <DataListCell width={3} key={`${dataKey}-name-descriptions`}>
                <Title size="md" headingLevel="h4">
                  {predictor.metadata.name}
                </Title>
                {getResourceAnnotation(predictor, 'opendatahub.io/description')}
              </DataListCell>,
              <DataListCell width={1} key={`${dataKey}-model-type`}>
                <p>{getModelTypeDisplayName(predictor)}</p>
              </DataListCell>,
              <DataListCell width={1} key={`${dataKey}-connections`}>
                <p>{predictor.spec.storage.s3.secretKey}</p>
                <p>{predictor.spec.path}</p>
              </DataListCell>,
              <DataListCell width={2} key={`${dataKey}-access-external-link`}>
                <p>{predictor.status?.activeModelState}</p>
              </DataListCell>,
              <DataListCell width={1} key={`${dataKey}-access-external-link`}>
                <p>{creationDate}</p>
              </DataListCell>,
            ]}
          />
          <DataListAction
            aria-label={`Volume ${predictor.metadata.name} Action`}
            aria-labelledby={`${dataKey}-action`}
            id={`${dataKey}-action`}
            isPlainButtonAction
          >
            <Dropdown
              isPlain
              position="right"
              isOpen={isDropdownOpen}
              onSelect={() => setDropdownOpen(false)}
              toggle={<KebabToggle onToggle={(open) => setDropdownOpen(open)} />}
              dropdownItems={dropdownItems}
            />
          </DataListAction>
        </DataListItemRow>
        <DataListContent
          hasNoPadding
          aria-label={`Volume ${predictor.metadata.name} Expanded Content`}
          id={`${dataKey}-expanded-content`}
          isHidden={!isExpanded}
        >
          <DataListItemCells
            className="odh-data-projects__data-list-item-content"
            dataListCells={[
              <DataListCell width={3} key={`${dataKey}-predictor`}>
                <p className="m-bold">API Endpoint</p>
                <ClipboardCopy
                  className="odh-data-projects__data-list-api-endpoint"
                  hoverTip="Copy"
                  clickTip="Copied"
                  variant="inline-compact"
                  isBlock
                >
                  {getModelRoute(predictor, route)}
                </ClipboardCopy>
              </DataListCell>,
              <DataListCell width={2} key={`${dataKey}-predictor-type-detail`}></DataListCell>,
              <DataListCell width={2} key={`${dataKey}-content-empty-1`} />,
              <DataListCell width={1} key={`${dataKey}-access-empty-2`} />,
            ]}
          />
        </DataListContent>
      </DataListItem>
    );
  },
);

PredictorListItem.displayName = 'PredictorListItem';

export default PredictorListItem;
