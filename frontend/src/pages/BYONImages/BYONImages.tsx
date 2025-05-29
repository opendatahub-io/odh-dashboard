import * as React from 'react';
import ApplicationsPage from '~/pages/ApplicationsPage';
import TitleWithIcon from '~/concepts/design/TitleWithIcon';
import { ProjectObjectType } from '~/concepts/design/utils';
import { useDashboardNamespace } from '~/redux/selectors';
import { useWatchBYONImages } from '~/utilities/useWatchBYONImages';
import EmptyBYONImages from './EmptyBYONImages';
import { BYONImagesTable } from './BYONImagesTable';

const BYONImages: React.FC = () => {
  const { dashboardNamespace } = useDashboardNamespace();
  const [images, loaded, loadError, refresh] = useWatchBYONImages(dashboardNamespace);

  return (
    <ApplicationsPage
      title={
        <TitleWithIcon title="Workbench images" objectType={ProjectObjectType.notebookImage} />
      }
      description="Manage the workbench images for your organization."
      loaded={loaded}
      empty={images.length === 0}
      loadError={loadError}
      errorMessage="Unable to load workbench images."
      emptyStatePage={<EmptyBYONImages refresh={refresh} />}
      provideChildrenPadding
    >
      <BYONImagesTable images={images} refresh={refresh} />
    </ApplicationsPage>
  );
};

export default BYONImages;
