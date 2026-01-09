import React from 'react';
import { Alert, AlertVariant, Content, Flex } from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import { FeatureStoreModel } from '@odh-dashboard/internal/api/models/odh';
import { useAccessAllowed } from '@odh-dashboard/internal/concepts/userSSAR/useAccessAllowed';
import { verbModelAccess } from '@odh-dashboard/internal/concepts/userSSAR/utils';
import { useClusterInfo } from '@odh-dashboard/internal/redux/selectors/clusterInfo';
import { getOpenShiftConsoleAction } from '@odh-dashboard/internal/app/AppLauncher';
import WhosMyAdministrator from '@odh-dashboard/internal/components/WhosMyAdministrator';
import { ODH_PRODUCT_NAME } from '@odh-dashboard/internal/utilities/const';
import { FeatureStoreContext } from '../FeatureStoreContext';

const FeatureStoreWarningAlert: React.FC = () => {
  const { featureStores, loaded } = React.useContext(FeatureStoreContext);
  const [isAdmin, isAdminLoaded] = useAccessAllowed(verbModelAccess('create', FeatureStoreModel));
  const { serverURL } = useClusterInfo();
  const osConsoleAction = getOpenShiftConsoleAction(serverURL);

  if (!loaded || featureStores.length <= 1 || !isAdminLoaded) {
    return null;
  }

  const adminContent = (
    <Flex direction={{ default: 'column' }}>
      <Content component="p">
        {ODH_PRODUCT_NAME} can display feature stores from only one OpenShift Platform custom
        resource at a time. Multiple custom resources with the UI enabled have been detected. To
        ensure all feature stores are visible here, go to the OpenShift Platform, consolidate them
        into a single custom resource, then enable the UI for only that resource.
      </Content>
      {osConsoleAction && (
        <Link target="_blank" to={osConsoleAction.href || ''} style={{ textDecoration: 'none' }}>
          Go to <b>OpenShift Platform</b> {'   '}
          <ExternalLinkAltIcon />
        </Link>
      )}
    </Flex>
  );

  const userContent = (
    <>
      <Content component="p">
        One or more feature stores might be missing from your dashboard due to a misconfiguration in
        OpenShift Platform. To ensure that all feature stores are visible here, contact your
        administrator.
      </Content>
      <WhosMyAdministrator isInline buttonLabel="Who’s my admin?" />
    </>
  );

  return (
    <Alert
      variant={AlertVariant.danger}
      isInline
      title="Missing feature stores detected"
      data-testid="feature-store-warning-alert"
      style={{ marginBottom: '1rem' }}
    >
      {isAdmin ? adminContent : userContent}
    </Alert>
  );
};

export default FeatureStoreWarningAlert;
