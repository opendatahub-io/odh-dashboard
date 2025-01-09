import * as React from 'react';
import { matchPath, useLocation, useNavigate } from 'react-router-dom';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { useAppContext } from '~/app/AppContext';
import TitleWithIcon from '~/concepts/design/TitleWithIcon';
import { ProjectObjectType } from '~/concepts/design/utils';
import GenericHorizontalBar from '~/pages/projects/components/GenericHorizontalBar';
import GenericVerticalBar from '~/pages/projects/components/GenericVerticalBar';

export const CLUSTER_SETTINGS_ROUTES = ['/clusterSettings', '/clusterSettings/:section?'];

export enum ClusterSectionID {
  GENERAL = 'general',
  StorageClasses = 'storage-classes',
}

const ClusterSettings: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { altNav } = useAppContext();
  const Component = altNav ? GenericHorizontalBar : GenericVerticalBar;
  const [activeTab, setActiveTab] = React.useState<string>();

  React.useEffect(() => {
    if (location.pathname) {
      const pathPattern = CLUSTER_SETTINGS_ROUTES.find((pattern) =>
        matchPath(pattern, location.pathname),
      );

      if (pathPattern) {
        const patternSplits = pathPattern.split('/');
        const tabIndex = patternSplits.indexOf(':section?');
        if (tabIndex >= 0) {
          const pathSplits = location.pathname.split('/');
          setActiveTab(pathSplits[tabIndex]);
          return;
        }
      }
    }
    navigate(`/clusterSettings/${ClusterSectionID.GENERAL}`);
  }, [location.pathname, navigate]);

  return (
    <ApplicationsPage
      title={
        <TitleWithIcon title="Cluster settings" objectType={ProjectObjectType.clusterSettings} />
      }
      description="Manage global settings for all users."
      loaded
      empty={false}
      provideChildrenPadding
    >
      <Component
        routes={CLUSTER_SETTINGS_ROUTES}
        activeKey={activeTab || ClusterSectionID.GENERAL}
        sections={[
          {
            id: ClusterSectionID.GENERAL,
            title: 'General settings',
          },
          {
            id: ClusterSectionID.StorageClasses,
            title: 'Storage classes',
          },
        ]}
      />
    </ApplicationsPage>
  );
};

export default ClusterSettings;
