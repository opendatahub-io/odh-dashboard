import * as React from 'react';
import ScopedLabel from '~/components/ScopedLabel';
import { ServingRuntimeKind } from '~/k8sTypes';
import {
  getDisplayNameFromServingRuntimeTemplate,
  getServingRuntimeVersionFromTemplate,
} from '~/pages/modelServing/customServingRuntimes/utils';
import { ScopedType, SERVING_RUNTIME_SCOPE } from '~/pages/modelServing/screens/const';

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
            <ScopedLabel
              isProject={false}
              color="grey"
              isCompact
              variant="filled"
              dataTestId="serving-runtime-version-label"
            >
              {getServingRuntimeVersionFromTemplate(servingRuntime)}
            </ScopedLabel>
          </>
        )}
        {isProjectScoped &&
          servingRuntime.metadata.annotations?.['opendatahub.io/serving-runtime-scope'] ===
            SERVING_RUNTIME_SCOPE.Project && (
            <>
              {' '}
              <ScopedLabel isProject color="blue" isCompact>
                {ScopedType.Project}
              </ScopedLabel>
            </>
          )}
      </>
    ) : (
      'Unknown'
    )}
  </>
);
export default InferenceServiceServingRuntime;
