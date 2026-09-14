CREATE TABLE "monopoly_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"seat" smallint,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monopoly_matches" (
	"match_id" uuid PRIMARY KEY NOT NULL,
	"active_seat" smallint DEFAULT 1 NOT NULL,
	"turn" integer DEFAULT 1 NOT NULL,
	"turn_ends_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monopoly_players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"seat" smallint NOT NULL,
	"cash" numeric(20, 2) NOT NULL,
	"tile" smallint DEFAULT 0 NOT NULL,
	"status" "room_player_status" DEFAULT 'alive' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monopoly_properties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"tile_index" smallint NOT NULL,
	"owner_seat" smallint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "monopoly_logs" ADD CONSTRAINT "monopoly_logs_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monopoly_matches" ADD CONSTRAINT "monopoly_matches_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monopoly_players" ADD CONSTRAINT "monopoly_players_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monopoly_players" ADD CONSTRAINT "monopoly_players_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monopoly_properties" ADD CONSTRAINT "monopoly_properties_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "monopoly_players_match_user_uidx" ON "monopoly_players" USING btree ("match_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "monopoly_players_match_seat_uidx" ON "monopoly_players" USING btree ("match_id","seat");--> statement-breakpoint
CREATE UNIQUE INDEX "monopoly_properties_match_tile_uidx" ON "monopoly_properties" USING btree ("match_id","tile_index");