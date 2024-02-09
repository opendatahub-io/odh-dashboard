// import * as React from 'react';
// import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
// import RunPage from '~/concepts/pipelines/content/createRun/RunPage';
// import * as React from 'react';
// import { PipelineCoreDetailsPageComponent } from '~/concepts/pipelines/content/types';
// import ApplicationsPage from '~/pages/ApplicationsPage';
// import useCloneRunData from '~/concepts/pipelines/content/createRun/useCloneRunData';

// const CloneRunPage: PipelineCoreDetailsPageComponent = ({ breadcrumbPath, contextPath }) => {
//   const [run, loaded, error] = useCloneRunData();

//   return (
//     <ApplicationsPage
//       title={run ? `Duplicate of ${run.display_name}` : 'Loading...'}
//       description={run ? `Create a new run from ${run.display_name}.` : ''}
//       breadcrumb={
//         <Breadcrumb>
//           {breadcrumbPath}
//           <BreadcrumbItem isActive>
//             {run ? `Duplicate of ${run.display_name}` : 'Duplicate'}
//           </BreadcrumbItem>
//         </Breadcrumb>
//       }
//       loaded={loaded}
//       loadError={error}
//       empty={false}
//     >
//       <RunPage cloneRun={run ?? undefined} contextPath={contextPath} testId="clone-run-page" />
//     </ApplicationsPage>
//   );
// };

// export default CloneRunPage;

import React from 'react';
import { PipelineCoreDetailsPageComponent } from '~/concepts/pipelines/content/types';

// todo: bring back here https://issues.redhat.com/browse/RHOAIENG-2295
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CloneRunPage: PipelineCoreDetailsPageComponent = ({ breadcrumbPath, contextPath }) => <></>;

export default CloneRunPage;
