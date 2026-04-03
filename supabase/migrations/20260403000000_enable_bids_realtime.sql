-- Enable Supabase Realtime for the bids table so that postgres_changes
-- subscriptions (used in BidsContext) receive INSERT / UPDATE / DELETE events.
-- REPLICA IDENTITY FULL ensures UPDATE events carry the full row.

ALTER TABLE bids REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE bids;
