-- Run once as the administrator in a NEW game-only Neon project.
-- Create a restricted login separately using a strong private password, then grant it hotel_player_api.
-- Do not run this in the Waline database and do not paste credentials into this file.
CREATE SCHEMA IF NOT EXISTS hotel;
CREATE TABLE IF NOT EXISTS hotel.rooms (
  code text PRIMARY KEY,
  data jsonb NOT NULL,
  version integer NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS hotel.sessions (
  token_hash text PRIMARY KEY,
  data jsonb NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS hotel_rooms_expiry ON hotel.rooms(expires_at);
CREATE INDEX IF NOT EXISTS hotel_sessions_expiry ON hotel.sessions(expires_at);
CREATE INDEX IF NOT EXISTS hotel_room_members ON hotel.rooms USING gin ((data->'game'->'players'));
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='hotel_player_api') THEN
    CREATE ROLE hotel_player_api NOLOGIN;
  END IF;
END $$;
GRANT USAGE ON SCHEMA hotel TO hotel_player_api;
GRANT SELECT, INSERT, UPDATE, DELETE ON hotel.rooms, hotel.sessions TO hotel_player_api;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
