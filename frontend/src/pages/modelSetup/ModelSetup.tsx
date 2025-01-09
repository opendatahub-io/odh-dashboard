import * as React from 'react';
import { matchPath, useLocation, useNavigate } from 'react-router-dom';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { useAppContext } from '~/app/AppContext';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import TitleWithIcon from '~/concepts/design/TitleWithIcon';
import { ProjectObjectType } from '~/concepts/design/utils';
import GenericHorizontalBar from '~/pages/projects/components/GenericHorizontalBar';
import GenericVerticalBar from '~/pages/projects/components/GenericVerticalBar';
import { ProjectSectionTitles } from '~/pages/projects/screens/detail/const';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';

export const MODEL_SETUP_ROUTES = ['/modelSetup', '/modelSetup/:section?'];

export enum ModelSetupSectionID {
  ModelServingPlatforms = 'model-serving-platforms',
  ServingRuntimes = 'serving-runtimes',
  ModelRegistrySettings = 'model-registry-settings',
}

const ModelSetup: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { altNav } = useAppContext();
  const modelServingEnabled = useIsAreaAvailable(SupportedArea.MODEL_SERVING).status;
  const Component = altNav ? GenericHorizontalBar : GenericVerticalBar;
  const [activeTab, setActiveTab] = React.useState<string>();

  React.useEffect(() => {
    if (location.pathname) {
      const pathPattern = MODEL_SETUP_ROUTES.find((pattern) =>
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
    navigate(`/modelSetup/${ModelSetupSectionID.ModelServingPlatforms}`);
  }, [location.pathname, navigate]);

  return (
    <ApplicationsPage
      title={
        <TitleWithIcon
          title={ProjectSectionTitles[ProjectSectionID.MODEL_SETUP]}
          objectType={ProjectObjectType.modelSetup}
        />
      }
      description="Prepare the necessary infrastructure and configurations."
      loaded
      empty={false}
      provideChildrenPadding
    >
      <Component
        routes={MODEL_SETUP_ROUTES}
        activeKey={activeTab || ModelSetupSectionID.ModelServingPlatforms}
        sections={[
          ...(modelServingEnabled
            ? [
                {
                  id: ModelSetupSectionID.ModelServingPlatforms,
                  title: 'Model serving platforms',
                },
              ]
            : []),
          {
            id: ModelSetupSectionID.ServingRuntimes,
            title: 'Serving runtimes',
          },
          {
            id: ModelSetupSectionID.ModelRegistrySettings,
            title: 'Model registry settings',
          },
        ]}
      />
    </ApplicationsPage>
  );
};

export default ModelSetup;
