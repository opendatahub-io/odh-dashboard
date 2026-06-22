"""Judge: How many tool calls errored?

Counts tool spans that produced errors — non-zero exit codes in Bash
commands, exception events, or ERROR status codes. Returns an integer
count. The rationale includes the command and the error response.
"""

from mlflow.entities import Feedback, SpanType
from mlflow.genai.scorers import scorer


def _extract_error_response(out_str):
    """Pull the first meaningful lines from the error output."""
    lines = out_str.replace("\\n", "\n").split("\n")
    result = []
    for line in lines:
        line = line.strip().strip("'\"{}").strip()
        if not line or line.startswith("result"):
            continue
        result.append(line)
        if len(result) >= 3:
            break
    return " | ".join(result)[:200]


def get_judges():
    @scorer(name="tool-call-errors")
    def tool_call_errors(trace) -> Feedback:
        tool_spans = trace.search_spans(span_type=SpanType.TOOL)
        errors = []

        for span in tool_spans:
            outputs = span.outputs or {}
            out_str = str(outputs)
            inputs = span.inputs or {}

            has_error_status = (
                span.status
                and hasattr(span.status, "status_code")
                and "ERROR" in str(span.status.status_code)
            )
            has_exception = any(
                getattr(event, "name", "") == "exception"
                for event in (span.events or [])
            )
            result_str = str(outputs.get("result", "")) if isinstance(outputs, dict) else out_str
            has_exit_code_error = result_str.startswith("Exit code") and not result_str.startswith("Exit code 0")

            if has_error_status or has_exception or has_exit_code_error:
                tool_name = span.name.replace("tool_", "")
                cmd = inputs.get("command", "")[:80] if isinstance(inputs, dict) else ""
                response = _extract_error_response(result_str)
                label = f"{tool_name}({cmd})" if cmd else tool_name
                label += f" -> {response}"
                errors.append(label)

        return Feedback(
            value=len(errors),
            rationale="\n".join(errors[:10]) if errors else "No tool call errors",
        )

    return [tool_call_errors]
