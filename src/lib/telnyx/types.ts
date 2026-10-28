export type TelnyxEvent = {
  data: {
    id: string;
    event_type: string;
    occurred_at?: string;
    payload: Record<string, unknown>;
  };
  meta?: { attempt?: number };
};

export type TelnyxPhoneEndpoint = { phone_number?: string; status?: string };
