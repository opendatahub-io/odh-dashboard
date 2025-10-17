import * as React from 'react';
import {
  Timestamp,
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
  Icon,
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
import DashboardPopupIconButton from '#~/concepts/dashboard/DashboardPopupIconButton';
import WhosMyAdministrator from '#~/components/WhosMyAdministrator';
import { useClusterInfo } from '#~/redux/selectors';
import { getOpenShiftConsoleAction } from '#~/app/AppLauncher';
import { useAccessAllowed } from '#~/concepts/userSSAR/useAccessAllowed';
import { verbModelAccess } from '#~/concepts/userSSAR/utils';
import { FeatureStoreModel } from '#~/api/models/odh';

type FeatureStoreTimestampProps = {
  date: string | Date;
  dateFormat?: 'medium' | 'short';
  fallback?: string;
  timeFormat?: 'short' | 'medium';
};

const useFeatureStoreAdminState = () => {
  const [isAdmin, isAdminLoaded] = useAccessAllowed(verbModelAccess('create', FeatureStoreModel));
  const clusterInfo = useClusterInfo();
  const { serverURL } = clusterInfo;
  const osConsoleAction = getOpenShiftConsoleAction(serverURL);

  return { isAdmin, isAdminLoaded, osConsoleAction };
};

export const FeatureStoreAlert: React.FC = () => (
  <Alert isInline variant="info" title="Integration instructions" isExpandable>
    <Content component="p">To integrate feature store repositories with a workbench:</Content>
    <List component={ListComponent.ol} type={OrderType.number}>
      <ListItem>
        In the <strong>Feature store client configuration</strong> table, select configmaps
        associated with the desired repos.
      </ListItem>
      <ListItem>Copy the Python script that is generated in the Python script section.</ListItem>
      <ListItem>
        From the <strong>Workbenches</strong> tab, launch a workbench.
      </ListItem>
      <ListItem>Paste the Python script into the workbench.</ListItem>
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
      headerContent="About feature store integration"
      bodyContent={
        <>
          Integrating feature stores with your workbenches enables you to securely consume and
          manage features.
          <br /> <br />
          To learn more about feature stores, go to the
        </>
      }
      footerContent={
        <Button
          isInline
          variant="link"
          onClick={() => {
            navigate('/develop-train/feature-store/overview');
          }}
        >
          <strong>Feature store {'>'} Overview </strong> page
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
      No feature store repositories are available to users in your organization. Create a feature
      store repository from the <strong>OpenShift console</strong>. <br />
      <br />
      {osConsoleAction && (
        <Link target="_blank" to={osConsoleAction.href || ''} style={{ textDecoration: 'none' }}>
          Go to <b>OpenShift</b> {'   '}
          <ExternalLinkAltIcon />
        </Link>
      )}
    </>
  );

  const userTitle = 'Request a feature store repository';
  const userDescription = (
    <>
      No feature store repositories are available in your organization. To request access to a new
      repo, contact your administrator.
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
          Go to <b>OpenShift</b> {'   '}
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
        <Icon status="danger" isInline size="2xl" iconSize="2xl">
          <ExclamationCircleIcon />
        </Icon>
      )}
      customAction={!isAdmin && <WhosMyAdministrator />}
    />
  );
};

export const FeatureStoreTimestamp: React.FC<FeatureStoreTimestampProps> = ({
  date,
  fallback = '-',
  dateFormat = 'medium',
  timeFormat = 'short',
}) => {
  if (!date) {
    return <>{fallback}</>;
  }
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (Number.isNaN(dateObj.getTime())) {
    return <>{fallback}</>;
  }

  return (
    <Timestamp date={dateObj} shouldDisplayUTC dateFormat={dateFormat} timeFormat={timeFormat} />
  );
};
