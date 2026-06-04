/**
 * ThinkTagParser — stateful parser for embedded <think>...</think> reasoning blocks.
 *
 * Some LLM models embed reasoning tokens directly in output_text.delta events using
 * one of two formats:
 *   - "<think>reasoning</think>answer"  (explicit open + close tags)
 *   - "reasoning</think>answer"         (bare close tag, no opener)
 *
 * Models that use a dedicated response.reasoning_text.delta channel never embed tags;
 * call notifyDedicatedReasoningEvent() when one arrives and processOutputDelta() will
 * return content-only after that.
 *
 * One instance should be created per streaming response. Call:
 *   - notifyDedicatedReasoningEvent() for each response.reasoning_text.delta event
 *   - processOutputDelta(delta) for each response.output_text.delta event
 *   - flush() once after the stream ends
 *
 * Each call returns { reasoning?, content? } — the caller routes each to onStreamData.
 */

export type ThinkTagOutput = {
  reasoning?: string;
  content?: string;
};

type ThinkTagState = 'initial' | 'in_think' | 'detecting_close' | 'done';

const THINK_OPEN = '<think>';
const THINK_CLOSE = '</think>';

export class ThinkTagParser {
  private state: ThinkTagState = 'initial';
  private buffer = '';
  private _hasDedicatedChannel = false;

  /**
   * Call when a response.reasoning_text.delta event arrives.
   * Marks the model as using a dedicated reasoning channel — subsequent
   * processOutputDelta calls will return content-only without tag parsing.
   */
  notifyDedicatedReasoningEvent(): void {
    this._hasDedicatedChannel = true;
    if (this.state === 'initial') {
      this.state = 'done';
    }
  }

  /**
   * Whether the model uses response.reasoning_text.delta for reasoning.
   * When true, all output_text.delta events are pure content — skip parsing.
   */
  get hasDedicatedChannel(): boolean {
    return this._hasDedicatedChannel;
  }

  /**
   * Process one response.output_text.delta chunk.
   * Returns reasoning and/or content to emit via onStreamData.
   */
  processOutputDelta(delta: string): ThinkTagOutput {
    if (this._hasDedicatedChannel) {
      return { content: delta };
    }

    if (this.state === 'initial') {
      return this.handleInitial(delta);
    }

    if (this.state === 'in_think') {
      return this.handleInThink(delta);
    }

    if (this.state === 'detecting_close') {
      return this.handleDetectingClose(delta);
    }

    // state === 'done' — normal output
    return { content: delta };
  }

  /**
   * Flush any buffered partial tag content at end of stream.
   * Must be called once after the stream loop ends.
   */
  flush(): ThinkTagOutput {
    if (!this.buffer) {
      return {};
    }
    const buffered = this.buffer;
    this.buffer = '';

    if (this.state === 'detecting_close' || this.state === 'in_think') {
      return { reasoning: buffered };
    }
    // initial or done — treat as content
    return { content: buffered };
  }

  // ─── private state handlers ───────────────────────────────────────────────

  private handleInitial(delta: string): ThinkTagOutput {
    if (delta.startsWith(THINK_OPEN)) {
      this.state = 'in_think';
      const remainder = delta.slice(THINK_OPEN.length);
      if (!remainder) {
        return {};
      }
      return this.handleInThink(remainder);
    }

    if (delta.startsWith('<') && THINK_OPEN.startsWith(delta)) {
      // Partial open tag at start of stream — buffer and wait
      this.buffer = delta;
      this.state = 'in_think';
      return {};
    }

    if (delta.includes(THINK_CLOSE)) {
      // Bare form: "reasoning</think>answer"
      const closeIdx = delta.indexOf(THINK_CLOSE);
      const reasoning = delta.slice(0, closeIdx);
      const content = delta.slice(closeIdx + THINK_CLOSE.length);
      this.state = 'done';
      return {
        ...(reasoning ? { reasoning } : {}),
        ...(content ? { content } : {}),
      };
    }

    // No think tags — model uses plain output
    this.state = 'done';
    return { content: delta };
  }

  private handleInThink(rawDelta: string): ThinkTagOutput {
    // If there's a buffered partial open tag, prepend it
    let delta = rawDelta;
    if (this.buffer) {
      delta = this.buffer + delta;
      this.buffer = '';
      if (delta.startsWith(THINK_OPEN)) {
        delta = delta.slice(THINK_OPEN.length);
        if (!delta) {
          return {};
        }
      }
    }

    const closeIdx = delta.indexOf(THINK_CLOSE);
    if (closeIdx !== -1) {
      // Found </think> — split reasoning from content
      const reasoning = delta.slice(0, closeIdx);
      const afterClose = delta.slice(closeIdx + THINK_CLOSE.length);
      this.state = 'done';
      const trimmedContent = afterClose.replace(/^\n+/, '');
      return {
        ...(reasoning ? { reasoning } : {}),
        ...(trimmedContent ? { content: trimmedContent } : {}),
      };
    }

    // Check for partial </think> at end of chunk
    const partialClose = this.findPartialClose(delta);
    if (partialClose) {
      const safeChunk = delta.slice(0, -partialClose.length);
      this.buffer = partialClose;
      this.state = 'detecting_close';
      return safeChunk ? { reasoning: safeChunk } : {};
    }

    // Whole delta is reasoning
    return { reasoning: delta };
  }

  private handleDetectingClose(delta: string): ThinkTagOutput {
    this.buffer += delta;

    if (this.buffer.length >= THINK_CLOSE.length) {
      if (this.buffer.startsWith(THINK_CLOSE)) {
        // Confirmed close tag
        const afterClose = this.buffer.slice(THINK_CLOSE.length);
        this.state = 'done';
        this.buffer = '';
        const trimmed = afterClose.replace(/^\n+/, '');
        return trimmed ? { content: trimmed } : {};
      }

      // Not a close tag — the buffer was a false alarm; treat as reasoning
      const buffered = this.buffer;
      this.buffer = '';
      this.state = 'in_think';
      return { reasoning: buffered };
    }

    if (!THINK_CLOSE.startsWith(this.buffer)) {
      // Buffer can no longer form a close tag — flush as reasoning
      const buffered = this.buffer;
      this.buffer = '';
      this.state = 'in_think';
      return { reasoning: buffered };
    }

    // Still accumulating — need more chunks
    return {};
  }

  private findPartialClose(delta: string): string {
    for (let i = 1; i < THINK_CLOSE.length; i++) {
      if (delta.endsWith(THINK_CLOSE.slice(0, i))) {
        return THINK_CLOSE.slice(0, i);
      }
    }
    return '';
  }
}
