import React from 'react';
import { Link } from 'react-router-dom';
import { Bullseye, Spinner, Stack, StackItem, Title } from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { Event } from '#~/third_party/mlmd';
import { useGetLinkedArtifactsByEvents } from '#~/concepts/pipelines/apiHooks/mlmd/useGetLinkedArtifactsByEvents';
import { getArtifactNameFromEvent } from '#~/pages/pipelines/global/experiments/executions/utils';
import { artifactsDetailsRoute } from '#~/routes/pipelines/artifacts';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';

type ExecutionDetailsInputOutputSectionProps = {
  isLoaded: boolean;
  title: string;
  events: Event[];
  artifactTypeMap: Record<number, string>;
};

const ExecutionDetailsInputOutputSection: React.FC<ExecutionDetailsInputOutputSectionProps> = ({
  isLoaded,
  title,
  events,
  artifactTypeMap,
}) => {
  const { namespace } = usePipelinesAPI();
  const [linkedArtifacts, isLinkedArtifactsLoaded] = useGetLinkedArtifactsByEvents(events);

  if (!isLoaded || !isLinkedArtifactsLoaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  const artifactDataMap: Record<number, { name: string; typeId: number | undefined; uri: string }> =
    {};
  linkedArtifacts.forEach((linkedArtifact) => {
    const id = linkedArtifact.event.getArtifactId();
    if (!id) {
      return;
    }
    artifactDataMap[id] = {
      name: getArtifactNameFromEvent(linkedArtifact.event) || '',
      typeId: linkedArtifact.artifact.getTypeId(),
      uri: linkedArtifact.artifact.getUri() || '',
    };
  });

  return (
    <Stack hasGutter>
      <StackItem>
        <Title headingLevel="h3">{title}</Title>
      </StackItem>
      <StackItem>
        {events.length === 0 ? (
          `No ${title.toLowerCase()}`
        ) : (
          <Table
            aria-label={`Execution details ${title.toLowerCase()} table`}
            variant="compact"
            borders={false}
          >
            <Thead>
              <Tr>
                <Th width={10}>Artifact ID</Th>
                <Th width={15}>Name</Th>
                <Th width={15}>Type</Th>
                <Th width={60}>URI</Th>
              </Tr>
            </Thead>
            <Tbody>
              {events.map((event) => {
                const id = event.getArtifactId();
                const data = artifactDataMap[id];
                const type = data.typeId ? artifactTypeMap[data.typeId] : null;
                return (
                  <Tr key={id}>
                    <Td dataLabel="Artifact ID">{id}</Td>
                    <Td dataLabel="Name">
                      <Link to={artifactsDetailsRoute(namespace, id)}>{data.name}</Link>
                    </Td>
                    <Td dataLabel="Type">{type}</Td>
                    <Td dataLabel="URI">{data.uri}</Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        )}
      </StackItem>
    </Stack>
  );
};

export default ExecutionDetailsInputOutputSection;
