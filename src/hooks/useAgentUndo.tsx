import { createContext, useCallback, useContext, useState, ReactNode } from 'react';

export interface UndoEntry {
  label: string;
  run: () => Promise<void> | void;
}

interface UndoCtx {
  entry: UndoEntry | null;
  set: (e: UndoEntry | null) => void;
  clear: () => void;
}

const Ctx = createContext<UndoCtx | undefined>(undefined);

export function AgentUndoProvider({ children }: { children: ReactNode }) {
  const [entry, setEntry] = useState<UndoEntry | null>(null);
  const clear = useCallback(() => setEntry(null), []);
  return <Ctx.Provider value={{ entry, set: setEntry, clear }}>{children}</Ctx.Provider>;
}

export function useAgentUndo() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAgentUndo requires AgentUndoProvider');
  return ctx;
}