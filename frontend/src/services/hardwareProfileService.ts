import axios from '~/utilities/axios';
import { HardwareProfileKind } from '~/k8sTypes';
import { ResponseStatus } from '~/types';

export const createHardwareProfile = (
  hardwareProfile: { name?: string } & HardwareProfileKind['spec'],
): Promise<ResponseStatus> => {
  const url = '/api/hardware-profiles';
  return axios
    .post(url, hardwareProfile)
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const deleteHardwareProfile = (name: string): Promise<ResponseStatus> => {
  const url = `/api/hardware-profiles/${name}`;
  return axios
    .delete(url)
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const updateHardwareProfile = (
  name: string,
  spec: Partial<HardwareProfileKind['spec']>,
): Promise<ResponseStatus> => {
  const url = `/api/hardware-profiles/${name}`;
  return axios
    .put(url, spec)
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};
