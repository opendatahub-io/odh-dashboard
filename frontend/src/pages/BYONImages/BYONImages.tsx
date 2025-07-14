import * as React from 'react';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import TitleWithIcon from '#~/concepts/design/TitleWithIcon';
import { ProjectObjectType } from '#~/concepts/design/utils';
import { useDashboardNamespace } from '#~/redux/selectors';
import { useImageStreams } from '#~/utilities/useImageStreams';
import { mapImageStreamToBYONImage } from '#~/utilities/imageStreamUtils';
import { BYONImagesTable } from './BYONImagesTable';
import EmptyBYONImages from './EmptyBYONImages';

const BYONImages: React.FC = () => {
  const { dashboardNamespace } = useDashboardNamespace();
  const [imageStreams, loaded, loadError] = useImageStreams(dashboardNamespace, { type: 'byon' });
  const images = React.useMemo(() => imageStreams.map(mapImageStreamToBYONImage), [imageStreams]);
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
      emptyStatePage={<EmptyBYONImages />}
      provideChildrenPadding
    >
      <BYONImagesTable images={images} />
    </ApplicationsPage>
  );
};

export default BYONImages;
