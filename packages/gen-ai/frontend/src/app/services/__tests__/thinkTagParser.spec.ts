import { ThinkTagParser, ThinkTagOutput } from '~/app/services/thinkTagParser';

const reasoning = (text: string): ThinkTagOutput => ({ reasoning: text });
const content = (text: string): ThinkTagOutput => ({ content: text });
const both = (r: string, c: string): ThinkTagOutput => ({ reasoning: r, content: c });
const empty = (): ThinkTagOutput => ({});

describe('ThinkTagParser', () => {
  let parser: ThinkTagParser;

  beforeEach(() => {
    parser = new ThinkTagParser();
  });

  // ─── dedicated channel ────────────────────────────────────────────────────

  describe('dedicated channel', () => {
    it('hasDedicatedChannel starts false', () => {
      expect(parser.hasDedicatedChannel).toBe(false);
    });

    it('notifyDedicatedReasoningEvent sets hasDedicatedChannel', () => {
      parser.notifyDedicatedReasoningEvent();
      expect(parser.hasDedicatedChannel).toBe(true);
    });

    it('processOutputDelta returns content-only after dedicated event', () => {
      parser.notifyDedicatedReasoningEvent();
      expect(parser.processOutputDelta('The answer')).toEqual(content('The answer'));
    });

    it('multiple notifyDedicatedReasoningEvent calls are idempotent', () => {
      parser.notifyDedicatedReasoningEvent();
      parser.notifyDedicatedReasoningEvent();
      expect(parser.hasDedicatedChannel).toBe(true);
      expect(parser.processOutputDelta('ok')).toEqual(content('ok'));
    });
  });

  // ─── no think tags ────────────────────────────────────────────────────────

  describe('no think tags', () => {
    it('plain content is returned as-is', () => {
      expect(parser.processOutputDelta('Hello world')).toEqual(content('Hello world'));
    });

    it('subsequent deltas are also content after plain start', () => {
      parser.processOutputDelta('Hello');
      expect(parser.processOutputDelta(' world')).toEqual(content(' world'));
    });

    it('flush returns empty when no buffer', () => {
      parser.processOutputDelta('Hello');
      expect(parser.flush()).toEqual(empty());
    });
  });

  // ─── full <think>...</think> tag ─────────────────────────────────────────

  describe('full <think>...</think> tag', () => {
    it('single chunk containing full tags', () => {
      expect(parser.processOutputDelta('<think>I am thinking</think>The answer')).toEqual(
        both('I am thinking', 'The answer'),
      );
    });

    it('open tag and close tag in separate chunks', () => {
      expect(parser.processOutputDelta('<think>Let me reason')).toEqual(reasoning('Let me reason'));
      expect(parser.processOutputDelta(' about this</think>The answer')).toEqual(
        both(' about this', 'The answer'),
      );
    });

    it('open tag alone (no content after)', () => {
      expect(parser.processOutputDelta('<think>')).toEqual(empty());
    });

    it('reasoning content across multiple chunks', () => {
      parser.processOutputDelta('<think>chunk one');
      expect(parser.processOutputDelta(' chunk two</think>answer')).toEqual(
        both(' chunk two', 'answer'),
      );
    });

    it('leading newlines after close tag are trimmed', () => {
      expect(parser.processOutputDelta('<think>think</think>\n\nAnswer')).toEqual(
        both('think', 'Answer'),
      );
    });

    it('content after close tag is clean when no leading newlines', () => {
      expect(parser.processOutputDelta('<think>reason</think>direct')).toEqual(
        both('reason', 'direct'),
      );
    });
  });

  // ─── empty think block ────────────────────────────────────────────────────

  describe('empty think block', () => {
    it('<think></think>answer returns only content', () => {
      const result = parser.processOutputDelta('<think></think>answer');
      expect(result.reasoning).toBeUndefined();
      expect(result.content).toBe('answer');
    });

    it('<think></think> with no answer returns empty', () => {
      const result = parser.processOutputDelta('<think></think>');
      expect(result.reasoning).toBeUndefined();
      expect(result.content).toBeUndefined();
    });
  });

  // ─── partial open tag across chunks ──────────────────────────────────────

  describe('partial open tag across chunks', () => {
    it('<thi | nk>reasoning</think>answer', () => {
      expect(parser.processOutputDelta('<thi')).toEqual(empty());
      expect(parser.processOutputDelta('nk>reasoning</think>answer')).toEqual(
        both('reasoning', 'answer'),
      );
    });

    it('<t | hink>reasoning</think>answer', () => {
      expect(parser.processOutputDelta('<t')).toEqual(empty());
      expect(parser.processOutputDelta('hink>reasoning</think>answer')).toEqual(
        both('reasoning', 'answer'),
      );
    });

    it('< alone (partial) then rest of tag', () => {
      expect(parser.processOutputDelta('<')).toEqual(empty());
      expect(parser.processOutputDelta('think>reason</think>answer')).toEqual(
        both('reason', 'answer'),
      );
    });
  });

  // ─── bare </think> pattern (no opening tag) ───────────────────────────────

  describe('bare </think> pattern', () => {
    it('reasoning</think>answer splits correctly', () => {
      expect(parser.processOutputDelta('Some reasoning</think>Actual answer')).toEqual(
        both('Some reasoning', 'Actual answer'),
      );
    });

    it('</think> with no preceding reasoning', () => {
      const result = parser.processOutputDelta('</think>answer');
      expect(result.reasoning).toBeUndefined();
      expect(result.content).toBe('answer');
    });

    it('bare close tag with no following content', () => {
      const result = parser.processOutputDelta('reasoning</think>');
      expect(result.reasoning).toBe('reasoning');
      expect(result.content).toBeUndefined();
    });
  });

  // ─── partial close tag across chunks ─────────────────────────────────────

  describe('partial close tag across chunks', () => {
    it('close tag split: </thi | nk>answer', () => {
      parser.processOutputDelta('<think>reasoning</thi');
      expect(parser.processOutputDelta('nk>answer text')).toEqual(content('answer text'));
    });

    it('close tag split: </think | > (just the angle bracket in second chunk)', () => {
      parser.processOutputDelta('<think>reasoning</think');
      expect(parser.processOutputDelta('>answer')).toEqual(content('answer'));
    });

    it('false alarm: partial that turns out not to be a close tag', () => {
      // </thi is buffered, then 'ng is great' arrives — not a close tag
      parser.processOutputDelta('<think>reason');
      const r1 = parser.processOutputDelta('ing</thi');
      expect(r1).toEqual(reasoning('ing'));
      // next chunk doesn't complete the tag
      const r2 = parser.processOutputDelta('s is not a tag');
      expect(r2.reasoning).toContain('</thi');
    });
  });

  // ─── stream ends mid-think ────────────────────────────────────────────────

  describe('stream ends mid-think (flush)', () => {
    it('reasoning is emitted immediately by processOutputDelta for unclosed think tag', () => {
      // "thinking forever" is not buffered — it is returned by processOutputDelta directly
      const result = parser.processOutputDelta('<think>thinking forever');
      expect(result).toEqual(reasoning('thinking forever'));
      // flush has nothing left to emit
      expect(parser.flush()).toEqual(empty());
    });

    it('flush emits buffered partial close tag when stream ends mid-detecting_close', () => {
      // chunk ends with partial </think> — goes into detecting_close with buffer='</thi'
      const r1 = parser.processOutputDelta('<think>reason</thi');
      expect(r1).toEqual(reasoning('reason'));
      // stream ends before next chunk arrives
      const flushed = parser.flush();
      expect(flushed.reasoning).toContain('</thi');
    });

    it('flush is empty when stream ended cleanly', () => {
      parser.processOutputDelta('<think>reason</think>answer');
      expect(parser.flush()).toEqual(empty());
    });

    it('flush emits partial open tag as reasoning when stream ends mid-detecting-open', () => {
      // Stream ends while a partial <think> opener is still buffered
      const result = parser.processOutputDelta('<thi');
      expect(result).toEqual(empty()); // buffered, nothing emitted yet
      const flushed = parser.flush();
      expect(flushed.reasoning).toBe('<thi'); // partial tag flushed as reasoning
    });

    it('flush is idempotent — second call returns empty', () => {
      parser.processOutputDelta('<think>reason</thi');
      parser.flush();
      expect(parser.flush()).toEqual(empty());
    });
  });
});
