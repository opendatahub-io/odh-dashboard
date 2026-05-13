package pipelines

import "sort"

// SortAndPaginateRuns sorts runs by created_at descending (ties broken by run_id)
// and returns the requested page. Uses int64 arithmetic to prevent overflow.
// page is 1-indexed; pageSize must be > 0.
func SortAndPaginateRuns(runs []PipelineRun, page int64, pageSize int32) PaginatedRuns {
	sort.Slice(runs, func(i, j int) bool {
		ti := runs[i].CreatedAt
		tj := runs[j].CreatedAt
		switch {
		case ti == nil && tj == nil:
			return runs[i].RunID > runs[j].RunID
		case ti == nil:
			return false
		case tj == nil:
			return true
		case !ti.Equal(*tj):
			return ti.After(*tj)
		default:
			return runs[i].RunID > runs[j].RunID
		}
	})

	total := int64(len(runs))
	start := (page - 1) * int64(pageSize)
	end := start + int64(pageSize)

	if start < 0 {
		start = 0
	}
	if start > total {
		start = total
	}
	if end < start {
		end = start
	}
	if end > total {
		end = total
	}

	return PaginatedRuns{
		Runs:      runs[int(start):int(end)],
		TotalSize: int32(total),
	}
}
