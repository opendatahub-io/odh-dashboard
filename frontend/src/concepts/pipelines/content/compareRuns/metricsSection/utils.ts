import { ArtifactType, Event, Execution } from '#~/third_party/mlmd';

import {
  FullArtifactPath,
  PipelineRunRelatedMlmd,
} from '#~/concepts/pipelines/content/compareRuns/metricsSection/types';
import {
  LinkedArtifact,
  RunArtifact,
  ExecutionArtifact,
} from '#~/concepts/pipelines/apiHooks/mlmd/types';
import { MetricsType } from './const';

export const getLinkedArtifactId = (linkedArtifact: LinkedArtifact): string =>
  `${linkedArtifact.event.getExecutionId()}-${linkedArtifact.event.getArtifactId()}`;

const metricsTypeToFilter = (metricsType: MetricsType): string => {
  switch (metricsType) {
    case MetricsType.SCALAR_METRICS:
      return 'system.Metrics';
    case MetricsType.CONFUSION_MATRIX:
      return 'system.ClassificationMetrics';
    case MetricsType.ROC_CURVE:
      return 'system.ClassificationMetrics';
    case MetricsType.HTML:
      return 'system.HTML';
    case MetricsType.MARKDOWN:
      return 'system.Markdown';
    default:
      return '';
  }
};

function filterLinkedArtifactsByType(
  artifactTypeName: string,
  artifactTypes: ArtifactType[],
  artifacts: LinkedArtifact[],
): LinkedArtifact[] {
  const artifactTypeIds = artifactTypes
    .filter((artifactType) => artifactType.getName() === artifactTypeName)
    .map((artifactType) => artifactType.getId());
  return artifacts.filter((x) => artifactTypeIds.includes(x.artifact.getTypeId()));
}
export const getRunArtifacts = (mlmdPackages: PipelineRunRelatedMlmd[]): RunArtifact[] =>
  mlmdPackages.map((mlmdPackage) => {
    const events = mlmdPackage.events.filter((e) => e.getType() === Event.Type.OUTPUT);

    // Match artifacts to executions.
    const artifactMap = new Map();
    mlmdPackage.artifacts.forEach((artifact) => artifactMap.set(artifact.getId(), artifact));
    const executionArtifacts = mlmdPackage.executions.map((execution) => {
      const executionEvents = events.filter((e) => e.getExecutionId() === execution.getId());
      const linkedArtifacts: LinkedArtifact[] = [];
      for (const event of executionEvents) {
        const artifactId = event.getArtifactId();
        const artifact = artifactMap.get(artifactId);
        if (artifact) {
          linkedArtifacts.push({
            event,
            artifact,
          });
        } else {
          throw new Error(`The artifact with the following ID was not found: ${artifactId}`);
        }
      }
      return {
        execution,
        linkedArtifacts,
      };
    });
    return {
      run: mlmdPackage.run,
      executionArtifacts,
    };
  });

export const filterRunArtifactsByType = (
  runArtifacts: RunArtifact[],
  artifactTypes: ArtifactType[],
  metricsType: MetricsType,
): RunArtifact[] => {
  const metricsFilter = metricsTypeToFilter(metricsType);
  const typeRuns: RunArtifact[] = [];
  for (const runArtifact of runArtifacts) {
    const typeExecutions: ExecutionArtifact[] = [];
    for (const e of runArtifact.executionArtifacts) {
      let typeArtifacts: LinkedArtifact[] = filterLinkedArtifactsByType(
        metricsFilter,
        artifactTypes,
        e.linkedArtifacts,
      );
      if (metricsType === MetricsType.CONFUSION_MATRIX) {
        typeArtifacts = typeArtifacts.filter((x) =>
          x.artifact.getCustomPropertiesMap().has('confusionMatrix'),
        );
      } else if (metricsType === MetricsType.ROC_CURVE) {
        typeArtifacts = typeArtifacts.filter((x) =>
          x.artifact.getCustomPropertiesMap().has('confidenceMetrics'),
        );
      }
      if (typeArtifacts.length > 0) {
        typeExecutions.push({
          execution: e.execution,
          linkedArtifacts: typeArtifacts,
        });
      }
    }
    if (typeExecutions.length > 0) {
      typeRuns.push({
        run: runArtifact.run,
        executionArtifacts: typeExecutions,
      });
    }
  }
  return typeRuns;
};

// general utils
export function getExecutionDisplayName(execution: Execution): string | undefined {
  return execution.getCustomPropertiesMap().get('display_name')?.getStringValue();
}

export function getArtifactNameFromEvent(event: Event): string | undefined {
  return event.getPath()?.getStepsList()[0].getKey();
}

export function getArtifactName(linkedArtifact: LinkedArtifact): string | undefined {
  return getArtifactNameFromEvent(linkedArtifact.event);
}

export const getFullArtifactPathLabel = (fullArtifactPath: FullArtifactPath): string =>
  `${getExecutionDisplayName(fullArtifactPath.execution) ?? ''} > ${
    getArtifactName(fullArtifactPath.linkedArtifact) ?? ''
  }`;

export const getFullArtifactPaths = (runArtifacts: RunArtifact[]): FullArtifactPath[] =>
  runArtifacts.flatMap((runArtifact) =>
    runArtifact.executionArtifacts.flatMap((executionArtifact) =>
      executionArtifact.linkedArtifacts.map((linkedArtifact) => ({
        linkedArtifact,
        run: runArtifact.run,
        execution: executionArtifact.execution,
      })),
    ),
  );
