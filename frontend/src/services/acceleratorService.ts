import axios from '#~/utilities/axios';
import { DetectedAccelerators } from '#~/types';

export const getDetectedAccelerators = (): Promise<DetectedAccelerators> => {
  const url = '/api/accelerators';
  return axios
    .get(url)
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};
