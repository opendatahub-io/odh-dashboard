import * as React from 'react';
import {
  Card,
  CardActions,
  CardBody,
  CardHeader,
  CardHeaderMain,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Dropdown,
  DropdownItem,
  DropdownToggle,
  DropdownToggleAction,
  Progress,
  Split,
  SplitItem,
  Title,
} from '@patternfly/react-core';
import { DatabaseIcon, VolumeIcon } from '@patternfly/react-icons';
import { DATA_SOURCE } from 'types';

type DataCardProps = {
  data: any;
  setModalOpen: (isOpen: boolean) => void;
  setActiveData: (data: any) => void;
};

const DataCard: React.FC<DataCardProps> = ({ data, setModalOpen, setActiveData }) => {
  const [isActionOpen, setActionOpen] = React.useState(false);
  const onActionSelect = (event) => {
    setActionOpen(!isActionOpen);
  };
  const onEditClick = (event) => {
    setModalOpen(true);
    setActiveData(data);
  };
  const onActionToggle = (open) => {
    setActionOpen(open);
  };

  const renderCardHeader = () => (
    <Title headingLevel="h5" size="lg">
      {data.source === DATA_SOURCE.persistentVolume && (
        <>
          <VolumeIcon />
          {` PV - ${data.name}`}
        </>
      )}
      {data.source === DATA_SOURCE.databaseAccess && (
        <>
          <DatabaseIcon />
          {` ${data.providerName}`}
        </>
      )}
    </Title>
  );

  const renderCardBody = () => (
    <DescriptionList isHorizontal isCompact>
      {data.source === DATA_SOURCE.persistentVolume && (
        <>
          <DescriptionListGroup>
            <DescriptionListTerm>Description</DescriptionListTerm>
            <DescriptionListDescription>{data.description}</DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Connections</DescriptionListTerm>
            <DescriptionListDescription>
              {data.allEnvironmentsConnections ? 'All Environments' : 'Specific Environment'}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Size</DescriptionListTerm>
            <DescriptionListDescription>
              <Split hasGutter>
                <SplitItem>
                  <span>{`${data.used}GB`}</span>
                </SplitItem>
                <SplitItem isFilled>
                  <Progress measureLocation="outside" value={87.5} label={`${data.size}GB`} />
                </SplitItem>
              </Split>
            </DescriptionListDescription>
          </DescriptionListGroup>
        </>
      )}
      {data.source === DATA_SOURCE.databaseAccess && (
        <>
          <DescriptionListGroup>
            <DescriptionListTerm>Provider account</DescriptionListTerm>
            <DescriptionListDescription>{data.account}</DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Database</DescriptionListTerm>
            <DescriptionListDescription>{data.database}</DescriptionListDescription>
          </DescriptionListGroup>
        </>
      )}
    </DescriptionList>
  );

  const dropdownItems = [
    <DropdownItem key="action" component="button" onClick={onEditClick}>
      Edit
    </DropdownItem>,
    <DropdownItem
      key="disabled link"
      component="button"
      isDisabled
      onClick={() => console.log('do something')}
    >
      Disabled action
    </DropdownItem>,
    <DropdownItem key="other action" component="button" onClick={() => console.log('do something')}>
      Other action
    </DropdownItem>,
  ];

  return (
    <Card isFlat className="odh-data-projects__details-card">
      <CardHeader>
        <CardHeaderMain>{renderCardHeader()}</CardHeaderMain>
        <CardActions>
          <Dropdown
            onSelect={onActionSelect}
            toggle={
              <DropdownToggle
                splitButtonItems={[
                  <DropdownToggleAction key="edit-data-action" onClick={onEditClick}>
                    Edit
                  </DropdownToggleAction>,
                ]}
                splitButtonVariant="action"
                onToggle={onActionToggle}
              />
            }
            isOpen={isActionOpen}
            dropdownItems={dropdownItems}
          />
        </CardActions>
      </CardHeader>
      <CardBody>{renderCardBody()}</CardBody>
    </Card>
  );
};

DataCard.displayName = 'DataCard';

export default DataCard;
