import { Card, CardBody, CardTitle } from '@patternfly/react-core';
import { CloudIcon, VolumeIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { CONNECTED_MODEL } from 'types';

import '../DataProjects.scss';

type ConnectedModelCardProps = {
  connectedModel: string;
  isSelected: boolean;
  onSelect: (event: React.MouseEvent) => void;
};

const ConnectedModelCard: React.FC<ConnectedModelCardProps> = ({
  connectedModel,
  isSelected,
  onSelect,
}) => {
  const renderIcon = () => {
    if (connectedModel === CONNECTED_MODEL.persistentVolume) {
      return <VolumeIcon />;
    } else {
      return <CloudIcon />;
    }
  };
  const renderName = () => {
    if (connectedModel === CONNECTED_MODEL.persistentVolume) {
      return 'PV - models';
    } else {
      return 'S3 - models';
    }
  };
  return (
    <Card
      className="odh-data-projects__connected-model-card"
      id={connectedModel}
      isSelectableRaised
      isSelected={isSelected}
      onClick={onSelect}
      isFlat
      isCompact
    >
      <CardTitle>{renderIcon()}</CardTitle>
      <CardBody>{renderName()}</CardBody>
    </Card>
  );
};

ConnectedModelCard.displayName = 'ConnectedModelCard';

export default ConnectedModelCard;
