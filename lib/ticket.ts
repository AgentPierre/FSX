import type { Role, TicketStatus } from "./types";

const FORWARD: Record<TicketStatus, TicketStatus | null> = {
  received: "in_progress",
  in_progress: "ready",
  ready: "completed",
  completed: null,
  cancelled: null,
};

const STATUSES = Object.keys(FORWARD) as TicketStatus[];

/** The single forward step from a status, or null at the end of the line. */
export function nextStep(from: TicketStatus): TicketStatus | null {
  return FORWARD[from];
}

/**
 * Statuses a ticket may move to. Forward is one step at a time (BR-19). Only the owner may cancel
 * (BR-29), and only before the ticket is completed or already cancelled.
 */
export function allowedNext(from: TicketStatus, role: Role): TicketStatus[] {
  const out: TicketStatus[] = [];
  const step = FORWARD[from];
  if (step) out.push(step);
  if (role === "owner" && from !== "completed" && from !== "cancelled") {
    out.push("cancelled");
  }
  return out;
}

export function isTicketStatus(v: unknown): v is TicketStatus {
  return typeof v === "string" && (STATUSES as string[]).includes(v);
}
