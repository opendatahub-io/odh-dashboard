import * as React from 'react';
import {
  Alert,
  Content,
  List,
  ListItem,
  OrderType,
  ListComponent,
  Flex,
  Title,
  Popover,
  Button,
  Bullseye,
  Spinner,
} from '@patternfly/react-core';
import {
  OutlinedQuestionCircleIcon,
  ExternalLinkAltIcon,
  CogIcon,
  ExclamationCircleIcon,
} from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
/* eslint-disable import/no-extraneous-dependencies */
import FeatureStoreObjectIcon from '@odh-dashboard/feature-store/components/FeatureStoreObjectIcon';
import EmptyStateFeatureStore from '@odh-dashboard/feature-store/screens/components/EmptyStateFeatureStore';
import SupportIcon from '@odh-dashboard/feature-store/icons/header-icons/SupportIcon';
/* eslint-enable import/no-extraneous-dependencies */
import DashboardPopupIconButton from '#~/concepts/dashboard/DashboardPopupIconButton';
import WhosMyAdministrator from '#~/components/WhosMyAdministrator';
import { useClusterInfo } from '#~/redux/selectors';
import { getOpenShiftConsoleAction } from '#~/app/AppLauncher';
import { useAccessAllowed } from '#~/concepts/userSSAR/useAccessAllowed';
import { verbModelAccess } from '#~/concepts/userSSAR/utils';
import { FeatureStoreModel } from '#~/api/models/odh';

const useFeatureStoreAdminState = () => {
  const [isAdmin, isAdminLoaded] = useAccessAllowed(verbModelAccess('create', FeatureStoreModel));
  const clusterInfo = useClusterInfo();
  const { serverURL } = clusterInfo;
  const osConsoleAction = getOpenShiftConsoleAction(serverURL);

  return { isAdmin, isAdminLoaded, osConsoleAction };
};

export const FeatureStoreAlert: React.FC = () => (
  <Alert
    isInline
    variant="info"
    title="Integrate feature store into your Workbenches to consume and manage features."
    isExpandable
  >
    <Content component="p">
      To consume and manage features from the Feature store within your workbenches, follow these
      steps to establish the connection:
    </Content>
    <List component={ListComponent.ol} type={OrderType.number}>
      <ListItem>
        Select your desired connection(s) from the Feature store client configmaps table using the
        checkboxes.
      </ListItem>
      <ListItem>Copy the Python script that appears in the code block on the right.</ListItem>
      <ListItem>Launch your workbench from the Workbenches tab.</ListItem>
      <ListItem>Once launched, paste and run the script in a cell to complete the setup.</ListItem>
    </List>
  </Alert>
);

interface FeatureStoreTitleProps {
  title: string;
  navigate: (path: string) => void;
}

export const FeatureStoreTitle: React.FC<FeatureStoreTitleProps> = ({ title, navigate }) => (
  <Flex
    direction={{ default: 'row' }}
    gap={{ default: 'gapSm' }}
    alignItems={{ default: 'alignItemsCenter' }}
  >
    <FeatureStoreObjectIcon
      backgroundColor="var(--ai-project--BackgroundColor)"
      objectType="feature_store"
      title={
        <Title id="feature-store-integration-header" headingLevel="h1" size="2xl">
          {title}
        </Title>
      }
      showBackground
      iconColor="var(--ai-general--IconColor)"
      useTypedColors={false}
    />
    <Popover
      headerContent="About Feature store integration"
      bodyContent={
        <>
          Integrate feature store into your Workbenches, to securely consume and manage features.
          <br /> <br />
          Learn more about Feature store by exploring feature store pages.
        </>
      }
      footerContent={
        <Button
          isInline
          variant="link"
          onClick={() => {
            navigate('/featureStore/overview');
          }}
        >
          Go to <strong>Feature store pages</strong>
        </Button>
      }
    >
      <DashboardPopupIconButton icon={<OutlinedQuestionCircleIcon />} aria-label="More info" />
    </Popover>
  </Flex>
);

export const FeatureStoreEmptyState: React.FC = () => {
  const { isAdmin, isAdminLoaded, osConsoleAction } = useFeatureStoreAdminState();

  if (!isAdminLoaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  const adminTitle = 'Create a feature store repository';
  const adminDescription = (
    <>
      No feature store repositories are available to users in your organization. Create a repository
      in OpenShift. <br />
      <br />
      {osConsoleAction && (
        <Link target="_blank" to={osConsoleAction.href || ''} style={{ textDecoration: 'none' }}>
          Go to <b>OpenShift Platform</b> {'   '}
          <ExternalLinkAltIcon />
        </Link>
      )}
    </>
  );

  const userTitle = 'Request access to a feature store repository';
  const userDescription = (
    <>
      Feature store repositories allow teams to organize and collaborate on resources within
      separate namespaces. To request access to a new or existing repository, contact your
      administrator.
    </>
  );

  return (
    <EmptyStateFeatureStore
      testid="empty-state-feature-store"
      title={isAdmin ? adminTitle : userTitle}
      description={isAdmin ? adminDescription : userDescription}
      headerIcon={() => (isAdmin ? <CogIcon /> : <SupportIcon />)}
      customAction={!isAdmin && <WhosMyAdministrator />}
    />
  );
};

export const FeatureStoreErrorState: React.FC = () => {
  const { isAdmin, isAdminLoaded, osConsoleAction } = useFeatureStoreAdminState();

  if (!isAdminLoaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  const adminTitle = 'Unable to display configmaps';
  const adminDescription = (
    <>
      The feature store client configmaps cannot be displayed due to an error or improper setup.
      Verify that the configmaps are set up properly in OpenShift.
      <br />
      <br />
      {osConsoleAction && (
        <Link target="_blank" to={osConsoleAction.href || ''} style={{ textDecoration: 'none' }}>
          Go to <b>OpenShift Platform</b> {'   '}
          <ExternalLinkAltIcon />
        </Link>
      )}
    </>
  );

  const userTitle = 'Unable to display configmaps';
  const userDescription = (
    <>
      The feature store client configmaps cannot be displayed due to an error or improper setup.
      Contact your admin to debug.
    </>
  );

  return (
    <EmptyStateFeatureStore
      testid="error-state-feature-store"
      title={isAdmin ? adminTitle : userTitle}
      description={isAdmin ? adminDescription : userDescription}
      headerIcon={() => (
        <ExclamationCircleIcon
          style={{ color: 'var(--pf-t--global--color--status--danger--default)' }}
        />
      )}
      customAction={!isAdmin && <WhosMyAdministrator />}
    />
  );
};
