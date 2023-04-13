import axios from 'axios';

export const fetchTemplateOrder = (): Promise<string[]> => {
  const url = '/api/template-order';
  return axios.get(url).then((response) => response.data);
};

export const updateOrderSettings = (
  templates: string[],
): Promise<{ success: string[] | null; error: string | null }> => {
  const url = '/api/template-order';
  return axios.put(url, templates).then((response) => response.data);
};
