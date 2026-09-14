CREATE TYPE "public"."ludo_player_status" AS ENUM('alive', 'finished');--> statement-breakpoint
CREATE TABLE "ludo_matches" (
	"match_id" uuid PRIMARY KEY NOT NULL,
	"active_seat" smallint DEFAULT 1 NOT NULL,
	"turn" integer DEFAULT 1 NOT NULL,
	"turn_ends_at" timestamp with time zone NOT NULL,
	"last_roll" smallint,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ludo_players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"seat" smallint NOT NULL,
	"status" "ludo_player_status" DEFAULT 'alive' NOT NULL,
	"ready" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ludo_matches" ADD CONSTRAINT "ludo_matches_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ludo_players" ADD CONSTRAINT "ludo_players_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ludo_players" ADD CONSTRAINT "ludo_players_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ludo_players_match_user_uidx" ON "ludo_players" USING btree ("match_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ludo_players_match_seat_uidx" ON "ludo_players" USING btree ("match_id","seat");