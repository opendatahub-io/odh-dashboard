import { Label, LabelGroup, Stack, StackItem } from '@patternfly/react-core';
import * as React from 'react';
import TypedObjectIcon from '#~/concepts/design/TypedObjectIcon';
import { ProjectObjectType } from '#~/concepts/design/utils';
import { ServingRuntimeKind } from '#~/k8sTypes';
import {
  getDisplayNameFromServingRuntimeTemplate,
  getServingRuntimeVersion,
} from '#~/pages/modelServing/customServingRuntimes/utils';
import { SERVING_RUNTIME_SCOPE } from '#~/pages/modelServing/screens/const';
import ServingRuntimeVersionLabel from '#~/pages/modelServing/screens/ServingRuntimeVersionLabel';

type Props = {
  servingRuntime?: ServingRuntimeKind;
  isProjectScoped?: boolean;
};

const InferenceServiceServingRuntime: React.FC<Props> = ({ servingRuntime, isProjectScoped }) => (
  <>
    {servingRuntime ? (
      <Stack>
        <StackItem>{getDisplayNameFromServingRuntimeTemplate(servingRuntime)}</StackItem>
        <StackItem>
          <LabelGroup>
            {getServingRuntimeVersion(servingRuntime) && (
              <ServingRuntimeVersionLabel
                version={getServingRuntimeVersion(servingRuntime)}
                isCompact
              />
            )}
            {isProjectScoped &&
              servingRuntime.metadata.annotations?.['opendatahub.io/serving-runtime-scope'] ===
                SERVING_RUNTIME_SCOPE.Project && (
                <Label
                  variant="outline"
                  color="blue"
                  data-testid="project-scoped-label"
                  isCompact
                  icon={<TypedObjectIcon alt="" resourceType={ProjectObjectType.project} />}
                >
                  Project-scoped
                </Label>
              )}
          </LabelGroup>
        </StackItem>
      </Stack>
    ) : (
      'Unknown'
    )}
  </>
);
export default InferenceServiceServingRuntime;
