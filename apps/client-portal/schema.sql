CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  pass TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'client',   -- 'client' or 'team'; set only by the server
  company TEXT, site TEXT, industry TEXT, goal TEXT,
  ga4 TEXT,                              -- GA4 property ID (digits)
  onboarded INTEGER NOT NULL DEFAULT 0,
  google_token TEXT,                     -- encrypted Google refresh token
  created INTEGER NOT NULL
);
