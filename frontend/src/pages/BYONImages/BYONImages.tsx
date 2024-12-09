import * as React from 'react';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { useWatchBYONImages } from '~/utilities/useWatchBYONImages';
import TitleWithIcon from '~/concepts/design/TitleWithIcon';
import { ProjectObjectType } from '~/concepts/design/utils';
import { BYONImagesTable } from './BYONImagesTable';
import EmptyBYONImages from './EmptyBYONImages';

const BYONImages: React.FC = () => {
  const [images, loaded, loadError, refresh] = useWatchBYONImages();

  return (
    <ApplicationsPage
      title={<TitleWithIcon title="Notebook images" objectType={ProjectObjectType.notebookImage} />}
      description="Manage your notebook images."
      loaded={loaded}
      empty={images.length === 0}
      loadError={loadError}
      errorMessage="Unable to load notebook images."
      emptyStatePage={<EmptyBYONImages refresh={refresh} />}
      provideChildrenPadding
    >
      <BYONImagesTable images={images} refresh={refresh} />
    </ApplicationsPage>
  );
};

export default BYONImages;
