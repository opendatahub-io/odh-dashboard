/* eslint-disable camelcase */
import { ArtifactTaskKF, IOTypeKF, PipelineTaskKF } from '#~/concepts/pipelines/kfTypes';

/**
 * DSP `rebase-mlmd-removal` swagger encodes these protobuf int64 fields as
 * decimal strings (`type: string`, `format: int64`).
 */
describe('v2beta1 int64 wire format', () => {
  it('keeps task iteration fields as decimal strings', () => {
    const task: PipelineTaskKF = {
      name: 'loop-iteration',
      task_id: 'task-1',
      run_id: 'run-1',
      type_attributes: {
        iteration_index: '2',
        iteration_count: '10',
      },
      inputs: {
        parameters: [
          {
            type: IOTypeKF.ITERATOR_INPUT,
            parameter_key: 'item',
            producer: { task_name: 'loop', iteration: '2' },
          },
        ],
      },
    };

    expect(task.type_attributes?.iteration_index).toBe('2');
    expect(task.type_attributes?.iteration_count).toBe('10');
    expect(task.inputs?.parameters?.[0].producer?.iteration).toBe('2');
  });

  it('keeps artifact-task producer iteration as a decimal string', () => {
    const artifactTask: ArtifactTaskKF = {
      artifact_id: 'artifact-1',
      run_id: 'run-1',
      task_id: 'task-1',
      type: IOTypeKF.OUTPUT,
      producer: { task_name: 'loop', iteration: '2' },
    };

    expect(artifactTask.producer?.iteration).toBe('2');
  });

  it('does not coerce a server JSON body into numbers', () => {
    const body: PipelineTaskKF = JSON.parse(
      '{"name":"loop-iteration","task_id":"task-1","run_id":"run-1","type_attributes":{"iteration_index":"2","iteration_count":"10"},"inputs":{"artifacts":[{"artifacts":[],"type":"ITERATOR_INPUT","artifact_key":"item","producer":{"task_name":"loop","iteration":"2"}}]}}',
    );

    expect(body.type_attributes?.iteration_index).toBe('2');
    expect(typeof body.type_attributes?.iteration_count).toBe('string');
    expect(body.inputs?.artifacts?.[0].producer?.iteration).toBe('2');
  });
});
