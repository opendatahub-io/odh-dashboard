import {
  getTrainJobPodStartupStatus,
  type TrainJobPodList,
} from '../../../utils/oc_commands/trainingJobSetup';

describe('Training job E2E setup utilities', () => {
  it('waits while worker pods are not created or are pending', () => {
    expect(getTrainJobPodStartupStatus({})).to.deep.equal({
      started: false,
      summary: 'no worker pods created yet',
    });

    const status = getTrainJobPodStartupStatus({
      items: [{ metadata: { name: 'worker-0' }, status: { phase: 'Pending' } }],
    });
    expect(status.started).to.equal(false);
    expect(status.summary).to.equal('worker-0: Pending');
  });

  it('allows transient image pull failures to retry with an actionable diagnostic', () => {
    const podList: TrainJobPodList = {
      items: [
        {
          metadata: { name: 'worker-0' },
          status: {
            phase: 'Pending',
            containerStatuses: [
              {
                image: 'registry.example.com/training:latest',
                name: 'node',
                state: {
                  waiting: {
                    message: 'Back-off pulling image',
                    reason: 'ImagePullBackOff',
                  },
                },
              },
            ],
          },
        },
      ],
    };
    const status = getTrainJobPodStartupStatus(podList);

    expect(status.fatalError).to.equal(undefined);
    expect(status.imagePullError).to.include('container node in worker pod worker-0');
    expect(status.imagePullError).to.include('Trainer ClusterTrainingRuntime image is mirrored');
  });

  it('fails immediately for invalid image names and failed pods', () => {
    const invalidImageStatus = getTrainJobPodStartupStatus({
      items: [
        {
          metadata: { name: 'worker-0' },
          status: {
            phase: 'Pending',
            containerStatuses: [{ state: { waiting: { reason: 'InvalidImageName' } } }],
          },
        },
      ],
    });
    expect(invalidImageStatus.fatalError).to.include('InvalidImageName');

    const failedPodStatus = getTrainJobPodStartupStatus({
      items: [{ metadata: { name: 'worker-0' }, status: { phase: 'Failed' } }],
    });
    expect(failedPodStatus.fatalError).to.include('entered the Failed phase');
  });

  it('requires every worker pod to be running or succeeded', () => {
    const podList: TrainJobPodList = {
      items: [
        { metadata: { name: 'worker-0' }, status: { phase: 'Running' } },
        { metadata: { name: 'worker-1' }, status: { phase: 'Pending' } },
      ],
    };
    const waitingStatus = getTrainJobPodStartupStatus(podList);
    expect(waitingStatus.started).to.equal(false);

    const startedStatus = getTrainJobPodStartupStatus({
      items: [
        { metadata: { name: 'worker-0' }, status: { phase: 'Running' } },
        { metadata: { name: 'worker-1' }, status: { phase: 'Succeeded' } },
      ],
    });
    expect(startedStatus.started).to.equal(true);
  });
});
