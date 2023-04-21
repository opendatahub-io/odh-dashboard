import * as React from 'react';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import { CodeEditor, Language } from '@patternfly/react-code-editor';
import { Link } from 'react-router-dom';

const CustomServingRuntimesAddTemplate: React.FC = () => (
  <ApplicationsPage
    title="Add serving runtime"
    description="Add a new runtime that will be available for Data Science users on this cluster"
    breadcrumb={
      <Breadcrumb>
        <BreadcrumbItem render={() => <Link to="/servingRuntimes">Serving Runtimes</Link>} />
        <BreadcrumbItem isActive>Add serving runtime</BreadcrumbItem>
      </Breadcrumb>
    }
    loaded
    empty={false}
    provideChildrenPadding
  >
    <CodeEditor isUploadEnabled isDownloadEnabled isCopyEnabled isLanguageLabelVisible language={Language.yaml} height="400px" onCodeChange={(code: string) => {console.log(code)}} />

  </ApplicationsPage>
);

export default CustomServingRuntimesAddTemplate;
