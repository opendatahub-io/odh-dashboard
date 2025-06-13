import { EvaluationResult } from './LMEvalResultTable';

const safeGetProperty = (obj: object, key: string): unknown =>
  Object.prototype.hasOwnProperty.call(obj, key) ? Reflect.get(obj, key) : undefined;

export const parseEvaluationResults = (resultsString: string): EvaluationResult[] => {
  try {
    const parsedResults = JSON.parse(resultsString);
    const resultArray: EvaluationResult[] = [];

    if (
      parsedResults &&
      parsedResults.results &&
      typeof parsedResults.results === 'object' &&
      !Array.isArray(parsedResults.results)
    ) {
      for (const [taskName, taskData] of Object.entries(parsedResults.results)) {
        if (taskData && typeof taskData === 'object' && !Array.isArray(taskData)) {
          const aliasValue = safeGetProperty(taskData, 'alias');
          const alias = typeof aliasValue === 'string' ? aliasValue : taskName;

          const metricKeys = Object.keys(taskData).filter(
            (key) => key !== 'alias' && !key.includes('_stderr'),
          );

          for (const metricKey of metricKeys) {
            const metricValue = safeGetProperty(taskData, metricKey);
            const value = Number(metricValue) || 0;

            const errorKey = metricKey.replace(',', '_stderr,');
            const errorValue = safeGetProperty(taskData, errorKey);
            const error = errorValue ? Number(errorValue) : undefined;

            resultArray.push({
              task: alias,
              metric: metricKey,
              value,
              error,
            });
          }
        }
      }
    }

    return resultArray;
  } catch {
    return [];
  }
};
