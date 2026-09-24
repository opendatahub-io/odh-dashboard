package models

// KueueAvailability describes the Kueue integration state for a namespace.
type KueueAvailability struct {
	// Enabled means Kueue is installed and manages the namespace. It controls
	// whether the UI exposes Kueue configuration.
	Enabled bool `json:"enabled"`
	// SchedulingReady means the namespace has an available LocalQueue and can
	// start a queue-backed evaluation.
	SchedulingReady      bool     `json:"scheduling_ready"`
	ClusterEnabled       bool     `json:"cluster_enabled"`
	NamespaceManaged     bool     `json:"namespace_managed"`
	LocalQueuesAvailable bool     `json:"local_queues_available"`
	LocalQueueNames      []string `json:"local_queue_names"`
}

// KueueWorkloadState describes Kueue's admission state for the Kubernetes
// Workloads belonging to an evaluation.
type KueueWorkloadState string

const (
	KueueWorkloadStateQueued    KueueWorkloadState = "queued"
	KueueWorkloadStateAdmitted  KueueWorkloadState = "admitted"
	KueueWorkloadStateFinished  KueueWorkloadState = "finished"
	KueueWorkloadStatePreempted KueueWorkloadState = "preempted"
)

// KueueWorkloadStatus is the aggregated Kueue status for one EvalHub
// evaluation. A benchmark suite can create more than one Workload.
type KueueWorkloadStatus struct {
	EvaluationID string             `json:"evaluation_id"`
	QueueName    string             `json:"queue_name"`
	State        KueueWorkloadState `json:"state"`
	Message      string             `json:"message,omitempty"`
}

type KueueWorkloadStatusesResponse struct {
	Items []KueueWorkloadStatus `json:"items"`
}
