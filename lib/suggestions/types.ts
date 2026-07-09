import type { Status } from "../types";

export type Classification =
  | "INTERVIEW_INVITE"
  | "REJECTION"
  | "OFFER"
  | "CONFIRMATION"
  | "OTHER";

export type RawMessage = {
  externalId: string;
  subject: string;
  fromAddress: string;
  snippet: string;
  receivedAt: Date;
};

export type SuggestionDraft = {
  externalId: string;
  provider: "GMAIL" | "OUTLOOK" | "MANUAL";
  subject: string;
  fromAddress: string;
  receivedAt: Date;
  classification: Classification;
  confidence: number;
  jobId: string | null;
  suggestedStatus: Status | null;
};

export interface SuggestionSource {
  name: "GMAIL" | "OUTLOOK" | "MANUAL";
  isConfigured(): Promise<boolean>;
  /** Fetch raw new messages since the last poll. */
  fetchSince(lastPolledAt: Date | null): Promise<RawMessage[]>;
}

export function suggestedStatusFor(c: Classification): Status | null {
  switch (c) {
    case "INTERVIEW_INVITE":
      return "INTERVIEWING";
    case "REJECTION":
      return "REJECTED";
    case "OFFER":
      return "OFFER";
    default:
      return null;
  }
}
