[{
  "table_definition": "CREATE TABLE comments (created_at timestamp with time zone, card_id integer, id integer NOT NULL, user_id integer, content character varying NOT NULL);"
}, {
  "table_definition": "CREATE TABLE boards (owner_id integer, id integer NOT NULL, title character varying NOT NULL);"
}, {
  "table_definition": "CREATE TABLE board_members (user_id integer NOT NULL, board_id integer NOT NULL);"
}, {
  "table_definition": "CREATE TABLE board_invitations (created_at timestamp without time zone, sender_id integer, id integer NOT NULL, recipient_id integer, board_id integer, status character varying);"
}, {
  "table_definition": "CREATE TABLE cards (status character varying, id integer NOT NULL, description character varying, due_date timestamp with time zone, completed_at timestamp with time zone, last_moved_at timestamp with time zone, priority character varying, board_id integer, title character varying NOT NULL, assigned_to integer);"
}, {
  "table_definition": "CREATE TABLE users (first_name character varying NOT NULL, handle character varying NOT NULL, hashed_password character varying, bio text, last_name character varying NOT NULL, google_id character varying, id integer NOT NULL, updated_at timestamp without time zone, last_seen timestamp with time zone, created_at timestamp without time zone, email character varying NOT NULL, is_active boolean);"
}, {
  "table_definition": "CREATE TABLE notifications (card_id integer, message character varying NOT NULL, id integer NOT NULL, is_read boolean, user_id integer, is_archived boolean, created_at timestamp with time zone, type character varying);"
}]
