/**
 * Fetch RayJob driver logs by exec-ing into the head pod and reading
 * /tmp/ray/session_latest/logs/job-driver-{jobId}.log
 *
 * Uses the backend endpoint:
 *   GET /api/ray-job-logs/{namespace}/{podName}/{containerName}/{jobId}
 */
export const getRayJobDriverLogs = async (
  namespace: string,
  podName: string,
  containerName: string,
  jobId: string,
): Promise<string> => {
  const url = `/api/ray-job-logs/${encodeURIComponent(namespace)}/${encodeURIComponent(
    podName,
  )}/${encodeURIComponent(containerName)}/${encodeURIComponent(jobId)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch logs: ${response.statusText}`);
  }
  return response.text();
};
