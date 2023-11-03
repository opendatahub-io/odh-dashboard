import * as React from 'react';
import { ExpandableRowContent, Tbody, Td, Tr } from '@patternfly/react-table';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { InferenceServiceKind, ServingRuntimeKind } from '~/k8sTypes';
import InferenceServiceTableRow from '~/pages/modelServing/screens/global/InferenceServiceTableRow';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import ServingRuntimeDetails from '~/pages/modelServing/screens/projects/ModelMeshSection/ServingRuntimeDetails';

type KServeInferenceServiceTableRowProps = {
  obj: InferenceServiceKind;
  onEditKServe: (obj: {
    inferenceService: InferenceServiceKind;
    servingRuntime: ServingRuntimeKind;
  }) => void;
  onDeleteKServe: (obj: {
    inferenceService: InferenceServiceKind;
    servingRuntime: ServingRuntimeKind;
  }) => void;
  rowIndex: number;
};

const KServeInferenceServiceTableRow: React.FC<KServeInferenceServiceTableRowProps> = ({
  obj,
  rowIndex,
  onEditKServe,
  onDeleteKServe,
}) => {
  const [isExpanded, setExpanded] = React.useState(false);
  const {
    servingRuntimes: { data: servingRuntimes },
  } = React.useContext(ProjectDetailsContext);

  const frameworkName = obj.spec.predictor.model.modelFormat.name;
  const frameworkVersion = obj.spec.predictor.model.modelFormat.version;

  const servingRuntime = servingRuntimes.find(
    (sr) => sr.metadata.name === obj.spec.predictor.model.runtime,
  );

  return (
    <Tbody isExpanded={isExpanded}>
      <Tr>
        <Td
          expand={{
            rowIndex: rowIndex,
            expandId: 'kserve-model-row-item',
            isExpanded,
            onToggle: () => setExpanded(!isExpanded),
          }}
        />
        <InferenceServiceTableRow
          obj={obj}
          isGlobal={false}
          showServingRuntime
          servingRuntime={servingRuntime}
          onDeleteInferenceService={() => {
            if (servingRuntime) {
              onDeleteKServe({
                inferenceService: obj,
                servingRuntime,
              });
            }
          }}
          onEditInferenceService={() => {
            if (servingRuntime) {
              onEditKServe({
                inferenceService: obj,
                servingRuntime,
              });
            }
          }}
        />
      </Tr>
      <Tr isExpanded={isExpanded}>
        <Td />
        <Td dataLabel="Information" colSpan={5}>
          <ExpandableRowContent>
            <Stack hasGutter>
              <StackItem>
                <DescriptionList isHorizontal horizontalTermWidthModifier={{ default: '250px' }}>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Framework</DescriptionListTerm>
                    <DescriptionListDescription>
                      {frameworkVersion ? `${frameworkName}-${frameworkVersion}` : frameworkName}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                </DescriptionList>
              </StackItem>
              {servingRuntime && (
                <StackItem>
                  <ServingRuntimeDetails obj={servingRuntime} />
                </StackItem>
              )}
            </Stack>
          </ExpandableRowContent>
        </Td>
      </Tr>
    </Tbody>
  );
};

export default KServeInferenceServiceTableRow;
