import * as React from 'react';
import { Button, Icon, Label, LabelGroup, Popover } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import { useAppContext } from '~/app/AppContext';
import DashboardPopupIconButton from '~/concepts/dashboard/DashboardPopupIconButton';

const CustomServingRuntimeHeaderLabels: React.FC = () => {
  const {
    dashboardConfig: {
      spec: {
        dashboardConfig: { disableKServe, disableModelMesh },
      },
    },
  } = useAppContext();

  if (disableKServe && disableModelMesh) {
    return null;
  }

  return (
    <>
      <LabelGroup>
        {!disableKServe && <Label>Single model serving enabled</Label>}
        {!disableModelMesh && <Label>Multi-model serving enabled</Label>}
      </LabelGroup>
      <Popover
        showClose
        bodyContent={
          <>
            You can change which model serving platforms are enabled in the{' '}
            <Button isSmall isInline variant="link">
              <Link to="/clusterSettings">Cluster settings</Link>
            </Button>
            .
          </>
        }
      >
        <Icon>
          <DashboardPopupIconButton icon={<OutlinedQuestionCircleIcon />} aria-label="More info" />
        </Icon>
      </Popover>
    </>
  );
};

export default CustomServingRuntimeHeaderLabels;
