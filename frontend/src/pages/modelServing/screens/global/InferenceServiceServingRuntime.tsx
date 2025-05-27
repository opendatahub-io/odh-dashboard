import { Label, Split, SplitItem } from '@patternfly/react-core';
import * as React from 'react';
import TypedObjectIcon from '~/concepts/design/TypedObjectIcon';
import { ProjectObjectType } from '~/concepts/design/utils';
import { ServingRuntimeKind } from '~/k8sTypes';
import {
  getDisplayNameFromServingRuntimeTemplate,
  getServingRuntimeVersionFromTemplate,
} from '~/pages/modelServing/customServingRuntimes/utils';
import { SERVING_RUNTIME_SCOPE } from '~/pages/modelServing/screens/const';
import ServingRuntimeVersionLabel from '~/pages/modelServing/screens/ServingRuntimeVersionLabel';

type Props = {
  servingRuntime?: ServingRuntimeKind;
  isProjectScoped?: boolean;
};

const InferenceServiceServingRuntime: React.FC<Props> = ({ servingRuntime, isProjectScoped }) => (
  <>
    {servingRuntime ? (
      <>
        {getDisplayNameFromServingRuntimeTemplate(servingRuntime)}
        <Split hasGutter>
          {getServingRuntimeVersionFromTemplate(servingRuntime) && (
            <SplitItem>
              <ServingRuntimeVersionLabel
                version={getServingRuntimeVersionFromTemplate(servingRuntime)}
                isCompact
              />
            </SplitItem>
          )}
          {isProjectScoped &&
            servingRuntime.metadata.annotations?.['opendatahub.io/serving-runtime-scope'] ===
              SERVING_RUNTIME_SCOPE.Project && (
              <SplitItem>
                <Label
                  variant="outline"
                  color="blue"
                  data-testid="project-scoped-label"
                  isCompact
                  icon={<TypedObjectIcon alt="" resourceType={ProjectObjectType.project} />}
                >
                  Project-scoped
                </Label>
              </SplitItem>
            )}
        </Split>
      </>
    ) : (
      'Unknown'
    )}
  </>
);
export default InferenceServiceServingRuntime;
