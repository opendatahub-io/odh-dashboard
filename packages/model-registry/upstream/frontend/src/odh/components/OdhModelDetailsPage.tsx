import * as React from 'react';
import { Button, Tooltip } from '@patternfly/react-core';
import ModelDetailsPage from '~/app/pages/modelCatalog/screens/ModelDetailsPage';
import { useAdminStatus } from '~/odh/context/AdminStatusContext';

type OdhModelDetailsPageProps = {
  tab: string;
};

const OdhModelDetailsPage: React.FC<OdhModelDetailsPageProps> = ({ tab }) => {
  const { isAdmin, loaded, settingsTitle } = useAdminStatus();

  if (!loaded || !isAdmin) {
    return <ModelDetailsPage tab={tab} />;
  }

  return (
    <ModelDetailsPage
      tab={tab}
      customNoRegistriesButton={(variant) => (
        <Tooltip
          content={
            <div>
              <strong>No model registries available</strong>
              <div>To create a new model registry, go to {settingsTitle}.</div>
            </div>
          }
          data-testid="register-catalog-model-tooltip"
        >
          <Button variant={variant} isAriaDisabled data-testid="register-model-button">
            Register model
          </Button>
        </Tooltip>
      )}
    />
  );
};

export default OdhModelDetailsPage;
