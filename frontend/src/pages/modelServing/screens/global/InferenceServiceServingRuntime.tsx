import { Label } from '@patternfly/react-core';
import * as React from 'react';
import { ProjectObjectType, typedObjectImage } from '~/concepts/design/utils';
import { ServingRuntimeKind } from '~/k8sTypes';
import { getDisplayNameFromServingRuntimeTemplate } from '~/pages/modelServing/customServingRuntimes/utils';
import { SERVING_RUNTIME_SCOPE } from '~/pages/modelServing/screens/const';

type Props = {
  servingRuntime?: ServingRuntimeKind;
  isProjectScoped?: boolean;
};

const InferenceServiceServingRuntime: React.FC<Props> = ({ servingRuntime, isProjectScoped }) => (
  <>
    {servingRuntime ? (
      <>
        {getDisplayNameFromServingRuntimeTemplate(servingRuntime)}
        {isProjectScoped &&
          servingRuntime.metadata.annotations?.['opendatahub.io/serving-runtime-scope'] ===
            SERVING_RUNTIME_SCOPE.Project && (
            <>
              {' '}
              <Label
                variant="outline"
                color="blue"
                data-testid="project-scoped-label"
                isCompact
                icon={
                  <img
                    style={{ height: '15px', paddingTop: '3px' }}
                    src={typedObjectImage(ProjectObjectType.project)}
                    alt=""
                  />
                }
              >
                Project-scoped
              </Label>
            </>
          )}
      </>
    ) : (
      'Unknown'
    )}
  </>
);

export default InferenceServiceServingRuntime;
