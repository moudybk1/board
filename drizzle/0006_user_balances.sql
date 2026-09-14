CREATE TABLE "user_balances" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"available" numeric(20, 2) DEFAULT '0' NOT NULL,
	"chain" text DEFAULT 'Robinhood Chain' NOT NULL,
	"wallet_address" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_balances" ADD CONSTRAINT "user_balances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;