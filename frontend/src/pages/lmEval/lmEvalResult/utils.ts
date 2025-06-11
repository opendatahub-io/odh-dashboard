import { EvaluationResult } from './LMEvalResultTable';

export const parseEvaluationResults = (resultsString: string): EvaluationResult[] => {
  try {
    const parsedResults = JSON.parse(resultsString);
    const resultArray: EvaluationResult[] = [];

    if (parsedResults && typeof parsedResults === 'object' && !Array.isArray(parsedResults)) {
      for (const [taskName, taskData] of Object.entries(parsedResults)) {
        if (taskData && typeof taskData === 'object' && !Array.isArray(taskData)) {
          for (const [metricName, metricData] of Object.entries(taskData)) {
            if (metricData && typeof metricData === 'object' && !Array.isArray(metricData)) {
              const value = Number(metricData.value || metricData.score) || 0;
              const error = metricData.stderr || metricData.error;

              resultArray.push({
                task: taskName,
                metric: metricName,
                value,
                error: error ? Number(error) : undefined,
              });
            }
          }
        }
      }
    }

    return resultArray;
  } catch {
    return [];
  }
};
