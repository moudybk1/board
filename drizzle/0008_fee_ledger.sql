CREATE TABLE "fee_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reward_payout_id" uuid NOT NULL,
	"match_id" uuid NOT NULL,
	"kind" "fee_ledger_kind" NOT NULL,
	"amount" numeric(20, 2) NOT NULL,
	"tx_hash" text,
	"proof_uri" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fee_ledger" ADD CONSTRAINT "fee_ledger_reward_payout_id_reward_payouts_id_fk" FOREIGN KEY ("reward_payout_id") REFERENCES "public"."reward_payouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_ledger" ADD CONSTRAINT "fee_ledger_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fee_ledger_payout_idx" ON "fee_ledger" USING btree ("reward_payout_id");--> statement-breakpoint
CREATE INDEX "fee_ledger_kind_created_idx" ON "fee_ledger" USING btree ("kind","created_at");