package pipelines

import "testing"

func TestSortAndPaginateRuns(t *testing.T) {
	runs := []PipelineRun{
		{RunID: "r1", CreatedAt: "2024-01-01T00:00:00Z"},
		{RunID: "r3", CreatedAt: "2024-01-03T00:00:00Z"},
		{RunID: "r2", CreatedAt: "2024-01-02T00:00:00Z"},
		{RunID: "r4", CreatedAt: "2024-01-03T00:00:00Z"}, // same time as r3, higher ID
	}

	t.Run("sorts descending by created_at then run_id", func(t *testing.T) {
		input := make([]PipelineRun, len(runs))
		copy(input, runs)

		result := SortAndPaginateRuns(input, 1, 10)
		if result.TotalSize != 4 {
			t.Errorf("TotalSize = %d, want 4", result.TotalSize)
		}
		if len(result.Runs) != 4 {
			t.Fatalf("expected 4 runs, got %d", len(result.Runs))
		}
		// r4 > r3 (same date, higher ID), then r2, then r1
		want := []string{"r4", "r3", "r2", "r1"}
		for i, id := range want {
			if result.Runs[i].RunID != id {
				t.Errorf("Runs[%d].RunID = %q, want %q", i, result.Runs[i].RunID, id)
			}
		}
	})

	t.Run("pagination page 1", func(t *testing.T) {
		input := make([]PipelineRun, len(runs))
		copy(input, runs)

		result := SortAndPaginateRuns(input, 1, 2)
		if len(result.Runs) != 2 {
			t.Fatalf("expected 2 runs, got %d", len(result.Runs))
		}
		if result.TotalSize != 4 {
			t.Errorf("TotalSize = %d, want 4", result.TotalSize)
		}
		if result.Runs[0].RunID != "r4" || result.Runs[1].RunID != "r3" {
			t.Errorf("wrong runs: %v", result.Runs)
		}
	})

	t.Run("pagination page 2", func(t *testing.T) {
		input := make([]PipelineRun, len(runs))
		copy(input, runs)

		result := SortAndPaginateRuns(input, 2, 2)
		if len(result.Runs) != 2 {
			t.Fatalf("expected 2 runs, got %d", len(result.Runs))
		}
		if result.Runs[0].RunID != "r2" || result.Runs[1].RunID != "r1" {
			t.Errorf("wrong runs: %v", result.Runs)
		}
	})

	t.Run("page beyond range returns empty", func(t *testing.T) {
		input := make([]PipelineRun, len(runs))
		copy(input, runs)

		result := SortAndPaginateRuns(input, 10, 2)
		if len(result.Runs) != 0 {
			t.Errorf("expected 0 runs, got %d", len(result.Runs))
		}
		if result.TotalSize != 4 {
			t.Errorf("TotalSize = %d, want 4", result.TotalSize)
		}
	})

	t.Run("empty input", func(t *testing.T) {
		result := SortAndPaginateRuns(nil, 1, 10)
		if len(result.Runs) != 0 {
			t.Errorf("expected 0 runs, got %d", len(result.Runs))
		}
		if result.TotalSize != 0 {
			t.Errorf("TotalSize = %d, want 0", result.TotalSize)
		}
	})

	t.Run("page 0 returns empty (1-indexed)", func(t *testing.T) {
		input := []PipelineRun{{RunID: "r1", CreatedAt: "2024-01-01T00:00:00Z"}}
		result := SortAndPaginateRuns(input, 0, 10)
		// page 0 → start = (0-1)*10 = -10 → clamped to 0, end = 0 → empty
		if len(result.Runs) != 0 {
			t.Errorf("expected 0 runs for page 0 (1-indexed), got %d", len(result.Runs))
		}
	})

	t.Run("last page partial", func(t *testing.T) {
		input := make([]PipelineRun, len(runs))
		copy(input, runs)

		result := SortAndPaginateRuns(input, 2, 3)
		if len(result.Runs) != 1 {
			t.Errorf("expected 1 run on last page, got %d", len(result.Runs))
		}
	})
}
