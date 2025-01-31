import * as React from 'react';
import { matchPath, useLocation, useNavigate } from 'react-router-dom';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { useAppContext } from '~/app/AppContext';
import TitleWithIcon from '~/concepts/design/TitleWithIcon';
import { ProjectObjectType } from '~/concepts/design/utils';
import GenericHorizontalBar from '~/pages/projects/components/GenericHorizontalBar';
import GenericVerticalBar from '~/pages/projects/components/GenericVerticalBar';
import { ProjectSectionTitles } from '~/pages/projects/screens/detail/const';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';

export const ENV_SETUP_ROUTES = ['/environmentSetup', '/environmentSetup/:section?'];

export enum EnvSectionID {
  WorkbenchImages = 'workbench-images',
  HardwareProfiles = 'hardware-profiles',
  ConnectionTypes = 'connection-types',
}

const EnvironmentSetup: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { altNav } = useAppContext();
  const Component = altNav ? GenericHorizontalBar : GenericVerticalBar;
  const [activeTab, setActiveTab] = React.useState<string>();

  React.useEffect(() => {
    if (location.pathname) {
      const pathPattern = ENV_SETUP_ROUTES.find((pattern) => matchPath(pattern, location.pathname));

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
    navigate(`/environmentSetup/${EnvSectionID.WorkbenchImages}`);
  }, [location.pathname, navigate]);

  return (
    <ApplicationsPage
      title={
        <TitleWithIcon
          title={ProjectSectionTitles[ProjectSectionID.ENVIRONMENT_SETUP]}
          objectType={ProjectObjectType.environmentSetup}
        />
      }
      description="Prepare the necessary infrastructure and configurations."
      loaded
      empty={false}
      provideChildrenPadding
    >
      <Component
        routes={ENV_SETUP_ROUTES}
        activeKey={activeTab || EnvSectionID.WorkbenchImages}
        sections={[
          {
            id: EnvSectionID.WorkbenchImages,
            title: 'Workbench images',
          },
          {
            id: EnvSectionID.HardwareProfiles,
            title: 'Hardware profiles',
          },
          {
            id: EnvSectionID.ConnectionTypes,
            title: 'Connection types',
          },
        ]}
      />
    </ApplicationsPage>
  );
};

export default EnvironmentSetup;
