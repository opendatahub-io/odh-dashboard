import { ConfigMapKind } from '~/k8sTypes';
import { mockConfigMap } from '~/__mocks__/mockConfigMap';

type MockKserveMetricsConfigMapType = {
  namespace?: string;
  modelName?: string;
  supported?: boolean;
  config?: string;
};

export const MOCK_KSERVE_METRICS_CONFIG_1 = `
{
  "config": [
    {
      "title": "Number of incoming requests",
      "type": "REQUEST_COUNT",
      "queries": [
        {
          "title": "Successful requests",
          "query": "sum(increase(ovms_requests_success{namespace='models',name='mnist'}[5m]))"
        },
        {
          "title": "Failed requests",
          "query": "sum(increase(ovms_requests_fail{namespace='models',name='mnist'}[5m]))"
        }
      ]
    },
    {
      "title": "Mean Model Latency",
      "type": "MEAN_LATENCY",
      "queries": [
        {
          "title": "Mean inference latency",
          "query": "sum by (name) (rate(ovms_inference_time_us_sum{namespace='models', name='mnist'}[1m])) / sum by (name) (rate(ovms_inference_time_us_count{namespace='models', name='mnist'}[1m]))"
        },
        {
          "title": "Mean request latency",
          "query": "sum by (name) (rate(ovms_request_time_us_sum{name='mnist'}[1m])) / sum by (name) (rate(ovms_request_time_us_count{name='mnist'}[1m]))"
        }
      ]
    },
    {
      "title": "CPU usage",
      "type": "CPU_USAGE",
      "queries": [
        {
          "title": "CPU usage",
          "query": "sum(node_namespace_pod_container:container_cpu_usage_seconds_total:sum_irate{namespace='models'}* on(namespace,pod) group_left(workload, workload_type) namespace_workload_pod:kube_pod_owner:relabel{namespace='models', workload=~'mnist-predictor-.*', workload_type=~'deployment'}) by (pod)"
        }
      ]
    },
    {
      "title": "Memory usage",
      "type": "MEMORY_USAGE",
      "queries": [
        {
          "title": "Memory usage",
          "query": "sum(container_memory_working_set_bytes{namespace='models', container!='', image!=''} * on(namespace,pod) group_left(workload, workload_type) namespace_workload_pod:kube_pod_owner:relabel{cluster='', namespace='models', workload=~'mnist-.*', workload_type=~'deployment'}) by (pod)"
        }
      ]
    }
  ]
}`;

export const MOCK_KSERVE_METRICS_CONFIG_MISSING_QUERY = `{
    "config": [
			{
				"title": "Requests per 5 minutes",
				"type": "REQUEST_COUNT",
				"queries": [
					{
						"title": "Number of successful incoming requests",
						"query": "round(sum(increase(vllm:request_success_total{namespace='test-project',model_name='test vllm'}[5m])))"
					}
				]
			},
			{
				"title": "Average response time (ms)",
				"type": "MEAN_LATENCY",
				"queries": [
					{
						"title": "Average e2e latency",
						"query": "histogram_quantile(0.5, sum(rate(vllm:e2e_request_latency_seconds_bucket{namespace='test-project', model_name='test-vllm'}[1m])) by (le, model_name))"
					}
				]
			},
			{
				"title": "CPU utilization %",
				"type": "CPU_USAGE",
				"queries": [
					{
						"title": "CPU usage",
						"query":  "sum(pod:container_cpu_usage:sum{namespace='test-project', pod=~'test-vllm-predictor-.*'})/sum(kube_pod_resource_limit{resource='cpu', pod=~'test-vllm-predictor-.*', namespace='test-project'})"
					}
				]
			},
			{
				"title": "Memory utilization %",
				"type": "MEMORY_USAGE",
				"queries": [
					{
						"title": "Memory usage",
						"query":  "sum(container_memory_working_set_bytes{namespace='test-project', pod=~'test-vllm-predictor-.*'})/sum(kube_pod_resource_limit{resource='memory', pod=~'test-vllm-predictor-.*', namespace='test-project'})"
					}
				]
			}
		]
  }`;

export const MOCK_KSERVE_METRICS_CONFIG_2 =
  '{ I am malformed JSON and I am here to ruin your day }';

export const MOCK_KSERVE_METRICS_CONFIG_3 = `
{
  "config": [
    {
      "title": "Number of incoming requests",
      "type": "REQUEST_COUNT",
      "queries": [
        {
          "title": "Successful requests",
          "query": "sum(increase(ovms_requests_success{namespace='models',name='mnist'}[5m]))"
        },
        {
          "title": "Failed requests",
          "query": "sum(increase(ovms_requests_fail{namespace='models',name='mnist'}[5m]))"
        }
      ]
    },
    {
      "title": "Mean Model Latency",
      "type": "MEAN_LATENCY",
      "queries": [
        {
          "title": "Mean inference latency",
          "query": "sum by (name) (rate(ovms_inference_time_us_sum{namespace='models', name='mnist'}[1m])) / sum by (name) (rate(ovms_inference_time_us_count{namespace='models', name='mnist'}[1m]))"
        },
        {
          "title": "Mean request latency",
          "query": "sum by (name) (rate(ovms_request_time_us_sum{name='mnist'}[1m])) / sum by (name) (rate(ovms_request_time_us_count{name='mnist'}[1m]))"
        }
      ]
    }
  ]
}`;

export const mockKserveMetricsConfigMap = ({
  namespace = 'test-project',
  modelName = 'test-inference-service',
  supported = true,
  config = MOCK_KSERVE_METRICS_CONFIG_1,
}: MockKserveMetricsConfigMapType): ConfigMapKind => {
  const data = {
    metrics: config,
    supported: String(supported),
  };
  return mockConfigMap({ data, namespace, name: `${modelName}-metrics-dashboard` });
};
