CREATE TYPE "public"."ludo_pawn_status" AS ENUM('yard', 'track', 'home', 'finished');--> statement-breakpoint
CREATE TABLE "ludo_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"seat" smallint,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ludo_pawns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"seat" smallint NOT NULL,
	"pawn_index" smallint NOT NULL,
	"status" "ludo_pawn_status" DEFAULT 'yard' NOT NULL,
	"steps" smallint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ludo_logs" ADD CONSTRAINT "ludo_logs_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ludo_pawns" ADD CONSTRAINT "ludo_pawns_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ludo_pawns_match_seat_pawn_uidx" ON "ludo_pawns" USING btree ("match_id","seat","pawn_index");