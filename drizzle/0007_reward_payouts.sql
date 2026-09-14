CREATE TYPE "public"."fee_ledger_kind" AS ENUM('treasury', 'burn');--> statement-breakpoint
CREATE TYPE "public"."reward_payout_status" AS ENUM('pending', 'paid', 'failed');--> statement-breakpoint
CREATE TABLE "reward_payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"room_id" uuid NOT NULL,
	"winner_user_id" uuid NOT NULL,
	"game_type" "game_type" NOT NULL,
	"entry_fee" numeric(20, 2) NOT NULL,
	"seats" numeric(4, 0) NOT NULL,
	"gross_pot" numeric(20, 2) NOT NULL,
	"fee_percent" numeric(5, 2) DEFAULT '2' NOT NULL,
	"fee_amount" numeric(20, 2) NOT NULL,
	"treasury_amount" numeric(20, 2) NOT NULL,
	"burn_amount" numeric(20, 2) NOT NULL,
	"net_payout" numeric(20, 2) NOT NULL,
	"status" "reward_payout_status" DEFAULT 'pending' NOT NULL,
	"tx_hash" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	CONSTRAINT "reward_payouts_match_id_unique" UNIQUE("match_id")
);
--> statement-breakpoint
ALTER TABLE "reward_payouts" ADD CONSTRAINT "reward_payouts_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_payouts" ADD CONSTRAINT "reward_payouts_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_payouts" ADD CONSTRAINT "reward_payouts_winner_user_id_users_id_fk" FOREIGN KEY ("winner_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reward_payouts_winner_created_idx" ON "reward_payouts" USING btree ("winner_user_id","created_at");--> statement-breakpoint
CREATE INDEX "reward_payouts_status_idx" ON "reward_payouts" USING btree ("status");