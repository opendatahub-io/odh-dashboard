import { RunStatus } from '@patternfly/react-topology';
import {
  getNameAndPathFromTaskRef,
  getNameFromTaskRef,
  getRunStatus,
  getValue,
  paramAsRunAfter,
  whenAsRunAfter,
} from '~/concepts/pipelines/topology/pipelineUtils';
import {
  PipelineRunTaskParam,
  PipelineRunTaskRunStatusProperties,
  PipelineRunTaskWhen,
} from '~/k8sTypes';
import { PipelineRunTaskDetails } from '~/concepts/pipelines/content/types';

const taskRef = '$(tasks.random-num.results.Output)';

const param: PipelineRunTaskParam = {
  name: 'operator',
  value: '5',
};

const when: PipelineRunTaskWhen = {
  input: '',
  operator: 'in',
  values: ['true'],
};

const status: PipelineRunTaskRunStatusProperties = {
  conditions: [
    {
      type: 'Succeeded',
      status: 'True',
      lastTransitionTime: '2023-10-20T07:32:06Z',
      reason: 'Succeeded',
      message: 'All Steps have completed executing',
    },
  ],
  podName: 'conditional-execution-pipeline-5fe97-condition-2-pod',
  startTime: '2023-10-20T07:32:00Z',
};

const task: PipelineRunTaskDetails = {
  name: 'flip-coin',
  runDetails: {
    pipelineTaskName: 'flip-coin',
    runID: 'conditional-execution-pipeline-6a55f-flip-coin',
    status: {
      conditions: [
        {
          type: 'Succeeded',
          status: 'True',
          lastTransitionTime: '2023-10-21T22:11:11Z',
          reason: 'Succeeded',
          message: 'All Steps have completed executing',
        },
      ],
      podName: 'conditional-execution-pipeline-6a55f-flip-coin-pod',
      startTime: '2023-10-21T22:11:02Z',
      taskSpec: {
        results: [
          {
            name: 'Output',
            type: 'string',
          },
        ],
        steps: [{}],
      },
      taskResults: [
        {
          name: 'Output',
          type: 'string',
          value: 'heads',
        },
      ],
    },
  },
  skipped: true,
  taskSpec: {
    steps: [
      {
        name: 'main',
        image: 'python:alpine3.6',
        command: [
          'sh',
          '-ec',
          'program_path=$(mktemp)\nprintf "%s" "$0" > "$program_path"\npython3 -u "$program_path" "$@"\n',
        ],
      },
    ],
    results: [
      {
        name: 'Output',
        type: 'string',
      },
    ],
  },
};

describe('getNameAndPathFromTaskRef', () => {
  it("should return null when name and task from path ref doesn't match", () => {
    const taskRef = 'random-string';
    const nameandTaskfromPath = getNameAndPathFromTaskRef(taskRef);
    expect(nameandTaskfromPath).toBe(null);
  });

  it('should check for name and task from path ref', () => {
    const nameandTaskfromPath = getNameAndPathFromTaskRef(taskRef);
    expect(nameandTaskfromPath?.[0]).toBe('random-num');
    expect(nameandTaskfromPath?.[1]).toBe('results.Output');
  });
});

describe('getNameFromTaskRef', () => {
  it('should get null from task ref', () => {
    const taskRef = 'random-string';
    const nameFromTaskRef = getNameFromTaskRef(taskRef);
    expect(nameFromTaskRef).toBe(null);
  });

  it('should get name from task ref', () => {
    const nameFromTaskRef = getNameFromTaskRef(taskRef);
    expect(nameFromTaskRef).toBe('random-num');
  });
});

describe('paramAsRunAfter', () => {
  it('should return null for param as run after', () => {
    const paramasRunAfter = paramAsRunAfter(param);
    expect(paramasRunAfter).toBe(null);
  });

  it('should return name for param as run after', () => {
    param.value = '$(tasks.random-num.results.Output)';
    const paramasRunAfter = paramAsRunAfter(param);
    expect(paramasRunAfter).toBe('random-num');
  });
});

describe('whenAsRunAfter', () => {
  it('should return null for when as run after', () => {
    const whenasRunAfter = whenAsRunAfter(when);
    expect(whenasRunAfter).toBe(null);
  });

  it('should return name for when as run after', () => {
    when.input = '$(tasks.condition-1.results.outcome)';
    const whenasRunAfter = whenAsRunAfter(when);
    expect(whenasRunAfter).toBe('condition-1');
  });
});

describe('getRunStatus', () => {
  it('should get run status as Succeeded', () => {
    const getrunStatus = getRunStatus(status);
    expect(getrunStatus).toBe(RunStatus.Succeeded);
  });

  it('should get run status as failed', () => {
    status.conditions[0].status = 'False';
    const getrunStatus = getRunStatus(status);
    expect(getrunStatus).toBe(RunStatus.Failed);
  });

  it('should get run status as running', () => {
    status.conditions[0].status = 'Unkonown';
    const getrunStatus = getRunStatus(status);
    expect(getrunStatus).toBe(RunStatus.Running);
  });

  it('should get run status as idle', () => {
    status.conditions[0].type = 'Failed';
    const getrunStatus = getRunStatus(status);
    expect(getrunStatus).toBe(RunStatus.Idle);
  });
});

describe('getValue', () => {
  it('should get value as null when runDetails is undefined', () => {
    const task: PipelineRunTaskDetails = {
      name: 'flip-coin',
      runDetails: undefined,
      skipped: true,
      taskSpec: {
        steps: [
          {
            name: 'main',
            image: 'python:alpine3.6',
            command: ['sh', '-ec'],
          },
        ],
        results: [
          {
            name: 'Output',
            type: 'string',
          },
        ],
      },
    };
    const path = 'results.Output';
    const getvalue = getValue(task, path);
    expect(getvalue).toBe(null);
  });

  it('should get value as heads', () => {
    const path = 'results.Output';
    const getvalue = getValue(task, path);
    expect(getvalue).toBe('heads');
  });

  it("should get value as null when path doesn't match", () => {
    const path = 'random.string';
    const getvalue = getValue(task, path);
    expect(getvalue).toBe(null);
  });
});
