import { Label } from '@patternfly/react-core';
import * as React from 'react';
import TypedObjectIcon from '~/concepts/design/TypedObjectIcon';
import { ProjectObjectType } from '~/concepts/design/utils';
import { ServingRuntimeKind } from '~/k8sTypes';
import {
  getDisplayNameFromServingRuntimeTemplate,
  getServingRuntimeVersionFromTemplate,
} from '~/pages/modelServing/customServingRuntimes/utils';
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
        {getServingRuntimeVersionFromTemplate(servingRuntime) && (
          <>
            {' '}
            <Label
              variant="filled"
              color="grey"
              data-testid="serving-runtime-version-label"
              isCompact
            >
              {getServingRuntimeVersionFromTemplate(servingRuntime)}
            </Label>
          </>
        )}
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
                icon={<TypedObjectIcon alt="" resourceType={ProjectObjectType.project} />}
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
