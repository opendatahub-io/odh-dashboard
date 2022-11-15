import { K8sStatus } from '../k8sTypes';

export const isK8sStatus = (data: unknown): data is K8sStatus =>
  (data as K8sStatus).kind === 'Status';

export class K8sStatusError extends Error {
  public statusObject: K8sStatus;

  constructor(statusObject: K8sStatus) {
    super(statusObject.message);

    this.statusObject = statusObject;
  }
}
