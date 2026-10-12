import type { TicketStatus } from "./types";

const NEXT: Record<TicketStatus, TicketStatus | null> = {
  received: "in_progress",
  in_progress: "ready",
  ready: "completed",
  completed: null,
};

export function allowedNext(from: TicketStatus): TicketStatus | null {
  return NEXT[from];
}

export function isTicketStatus(v: unknown): v is TicketStatus {
  return typeof v === "string" && v in NEXT;
}
