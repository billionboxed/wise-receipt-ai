import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Loader2, Send, Sparkles, Check, X, Undo2, Wrench, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { AgentUndoProvider, useAgentUndo } from '@/hooks/useAgentUndo';
import { useAgentTools } from '@/hooks/useAgentTools';
import { TOOLS, TOOL_MAP, isDestructive } from '@/lib/agent/tools';
import { useCurrency } from '@/context/CurrencyContext';

// ---------- Message types ----------
interface ToolCall { id: string; type: 'function'; function: { name: string; arguments: string } }

type ApiMessage =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content?: string | null; tool_calls?: ToolCall[] }
  | { role: 'tool'; tool_call_id: string; name: string; content: string };

interface ToolCallStatus {
  status: 'awaiting-approval' | 'running' | 'done' | 'denied' | 'error';
  result?: any;
  error?: string;
}

// Compact tool result cards (JSON strings kept but UI shows summary)
function safeParseArgs(s: string) { try { return JSON.parse(s || '{}'); } catch { return {}; } }

function ToolBubble({ call, status, onApprove, onDeny }: {
  call: ToolCall;
  status: ToolCallStatus;
  onApprove: () => void;
  onDeny: () => void;
}) {
  const [open, setOpen] = useState(false);
  const def = TOOL_MAP[call.function.name];
  const args = safeParseArgs(call.function.arguments);
  const summary = def?.summary?.(args) ?? def?.description ?? call.function.name;

  return (
    <Card className="mb-2 p-3 bg-muted/40 border-border/60 text-sm">
      <div className="flex items-start gap-2">
        <Wrench className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{call.function.name}</span>
            {status.status === 'awaiting-approval' && (
              <Badge variant="outline" className="text-amber-600 border-amber-500/50">Approval needed</Badge>
            )}
            {status.status === 'running' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {status.status === 'done' && <Badge variant="outline" className="text-green-600 border-green-500/50">Done</Badge>}
            {status.status === 'denied' && <Badge variant="outline">Denied</Badge>}
            {status.status === 'error' && <Badge variant="destructive">Error</Badge>}
          </div>
          {status.status === 'awaiting-approval' && (
            <p className="mt-1 text-muted-foreground">{summary}</p>
          )}
          <button
            className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            Details
          </button>
          {open && (
            <pre className="mt-2 text-xs whitespace-pre-wrap break-words bg-background/50 p-2 rounded max-h-48 overflow-auto">
{`args: ${JSON.stringify(args, null, 2)}${status.result !== undefined ? `\n\nresult: ${JSON.stringify(status.result, null, 2)}` : ''}${status.error ? `\n\nerror: ${status.error}` : ''}`}
            </pre>
          )}
          {status.status === 'awaiting-approval' && (
            <div className="mt-2 flex gap-2">
              <Button size="sm" onClick={onApprove} className="h-8"><Check className="w-3.5 h-3.5 mr-1" /> Approve</Button>
              <Button size="sm" variant="outline" onClick={onDeny} className="h-8"><X className="w-3.5 h-3.5 mr-1" /> Deny</Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function ChatInner() {
  const { execute, summaryContext } = useAgentTools();
  const { entry: undoEntry, clear: clearUndo } = useAgentUndo();
  const { currency } = useCurrency();

  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [toolStatus, setToolStatus] = useState<Record<string, ToolCallStatus>>({});
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current?.parentElement;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, toolStatus, loading]);

  // The core loop: send current message history to the edge function.
  // Runs any non-approval tools automatically, then re-calls the model.
  // Stops when the model returns no tool_calls, or when a needsApproval call is pending.
  const runLoop = useCallback(async (history: ApiMessage[]) => {
    let current = history;
    for (let step = 0; step < 8; step++) {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('agent-chat', {
        body: {
          messages: current,
          tools: TOOLS.map((t) => ({ name: t.name, description: t.description, parameters: t.parameters })),
          systemContext: `Currency: ${currency.code} (${currency.symbol})\n${summaryContext}`,
        },
      });
      setLoading(false);
      if (error) {
        toast({ title: 'AI error', description: error.message, variant: 'destructive' });
        return;
      }
      const msg = data?.message as ApiMessage | undefined;
      if (!msg) return;
      const assistantMsg: ApiMessage = {
        role: 'assistant',
        content: (msg as any).content ?? null,
        tool_calls: (msg as any).tool_calls,
      };
      current = [...current, assistantMsg];
      setMessages(current);

      const calls = assistantMsg.tool_calls || [];
      if (calls.length === 0) return;

      // Initialize statuses; pause on any approval-needed tool.
      const nextStatus: Record<string, ToolCallStatus> = {};
      let hasApproval = false;
      for (const c of calls) {
        if (isDestructive(c.function.name)) {
          nextStatus[c.id] = { status: 'awaiting-approval' };
          hasApproval = true;
        } else {
          nextStatus[c.id] = { status: 'running' };
        }
      }
      setToolStatus((s) => ({ ...s, ...nextStatus }));

      if (hasApproval) return; // wait for user to click Approve/Deny

      // Execute all auto tools, collect tool-result messages.
      const toolMessages: ApiMessage[] = [];
      for (const c of calls) {
        const args = safeParseArgs(c.function.arguments);
        const res = await execute(c.function.name, args);
        setToolStatus((s) => ({
          ...s,
          [c.id]: res.ok
            ? { status: 'done', result: res.data }
            : { status: 'error', error: res.error },
        }));
        toolMessages.push({
          role: 'tool',
          tool_call_id: c.id,
          name: c.function.name,
          content: JSON.stringify(res.ok ? { ok: true, data: res.data } : { ok: false, error: res.error }),
        });
      }
      current = [...current, ...toolMessages];
      setMessages(current);
    }
  }, [execute, summaryContext, currency]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const next: ApiMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    await runLoop(next);
  }, [input, loading, messages, runLoop]);

  // Handle Approve / Deny on a specific tool call.
  const resolveApproval = useCallback(async (callId: string, approve: boolean) => {
    // Find the tool call in the last assistant message.
    const lastAsst = [...messages].reverse().find((m) => m.role === 'assistant' && m.tool_calls);
    const call = lastAsst && (lastAsst as any).tool_calls?.find((c: ToolCall) => c.id === callId);
    if (!call) return;
    const args = safeParseArgs(call.function.arguments);

    if (!approve) {
      setToolStatus((s) => ({ ...s, [callId]: { status: 'denied' } }));
      const toolMsg: ApiMessage = {
        role: 'tool', tool_call_id: callId, name: call.function.name,
        content: JSON.stringify({ ok: false, error: 'User denied this action.' }),
      };
      // Also auto-resolve any other still-pending approvals in the same batch to denied? Keep them pending independently.
      const next = [...messages, toolMsg];
      setMessages(next);
      await runLoop(next);
      return;
    }

    setToolStatus((s) => ({ ...s, [callId]: { status: 'running' } }));
    const res = await execute(call.function.name, args);
    setToolStatus((s) => ({
      ...s,
      [callId]: res.ok ? { status: 'done', result: res.data } : { status: 'error', error: res.error },
    }));
    const toolMsg: ApiMessage = {
      role: 'tool', tool_call_id: callId, name: call.function.name,
      content: JSON.stringify(res.ok ? { ok: true, data: res.data } : { ok: false, error: res.error }),
    };
    const next = [...messages, toolMsg];
    setMessages(next);
    await runLoop(next);
  }, [messages, execute, runLoop]);

  const doUndo = useCallback(async () => {
    if (!undoEntry) return;
    try {
      await undoEntry.run();
      toast({ title: 'Reverted', description: undoEntry.label });
    } catch (e: any) {
      toast({ title: 'Undo failed', description: e?.message || 'Try again', variant: 'destructive' });
    } finally {
      clearUndo();
    }
  }, [undoEntry, clearUndo]);

  const quickActions = useMemo(() => [
    'What did I spend this month?',
    'Scan all my SMS',
    'Show my pending SMS',
  ], []);

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-10rem)] lg:h-[calc(100vh-6rem)]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-semibold text-foreground text-sm">ClearSpends Assistant</h1>
              <p className="text-xs text-muted-foreground">Chat, then act — bulk changes need your OK.</p>
            </div>
          </div>
          {undoEntry && (
            <Button size="sm" variant="outline" onClick={doUndo} className="h-8">
              <Undo2 className="w-3.5 h-3.5 mr-1.5" />
              Undo
            </Button>
          )}
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 pr-2">
          <div ref={scrollRef} className="space-y-3 py-4">
            {messages.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-8">
                <p className="mb-3">Ask me anything about your spending — or ask me to do it.</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {quickActions.map((q) => (
                    <Button key={q} size="sm" variant="outline" className="h-8 text-xs"
                      onClick={() => { setInput(q); setTimeout(() => sendMessage(), 0); }}>
                      {q}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => {
              if (m.role === 'user') {
                return (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl px-4 py-2 bg-primary text-primary-foreground text-sm">
                      {m.content}
                    </div>
                  </div>
                );
              }
              if (m.role === 'assistant') {
                return (
                  <div key={i} className="max-w-[95%]">
                    {m.content && (
                      <div className="text-sm whitespace-pre-wrap text-foreground mb-2">{m.content}</div>
                    )}
                    {(m.tool_calls || []).map((c) => (
                      <ToolBubble
                        key={c.id}
                        call={c}
                        status={toolStatus[c.id] || { status: 'done' }}
                        onApprove={() => resolveApproval(c.id, true)}
                        onDeny={() => resolveApproval(c.id, false)}
                      />
                    ))}
                  </div>
                );
              }
              return null; // tool messages hidden — status shown via ToolBubble above
            })}
            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Thinking…
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Composer */}
        <div className="pt-3 border-t border-border/50 flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Add ₹250 coffee, scan SMS, delete last expense…"
            disabled={loading}
            className="flex-1"
            autoFocus
          />
          <Button onClick={sendMessage} disabled={!input.trim() || loading} size="icon">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </Layout>
  );
}

export default function AIChat() {
  return (
    <AgentUndoProvider>
      <ChatInner />
    </AgentUndoProvider>
  );
}