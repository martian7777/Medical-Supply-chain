-- Support the public verification path.
--
-- Two access patterns, both on the unauthenticated endpoint, so both must be cheap:
--
--   1. Rate limiting: "how many times has THIS caller hit us in the last minute?"
--      We reuse verification_scans as the counter rather than adding a Redis. The
--      public endpoint is the only unauthenticated surface, and it already records
--      every hit — a separate store would be a second source of truth for the same
--      fact, plus another service to operate.
--
--   2. Anomaly detection: "how many times, and from how many regions, has THIS CODE
--      been checked?" — the query that catches a QR code photocopied onto a thousand
--      fake boxes.

create index if not exists verification_scans_ip_window_idx
  on verification_scans (ip_hash, scanned_at desc);

-- Old scan rows are only useful in aggregate. A retention job can trim them later;
-- the anomaly counters read the recent window.
comment on table verification_scans is
  'Append-only public scan telemetry. No personal data: ip/ua are salted hashes, '
  'region is coarse. Doubles as the rate-limit counter for the public verify endpoint.';
