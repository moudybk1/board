CREATE TABLE "user_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"sfx_muted" boolean DEFAULT false NOT NULL,
	"sfx_volume" numeric(4, 3) DEFAULT '0.700' NOT NULL,
	"music_muted" boolean DEFAULT false NOT NULL,
	"music_volume" numeric(4, 3) DEFAULT '0.350' NOT NULL,
	"music_autoplay" boolean DEFAULT true NOT NULL,
	"reduced_motion" boolean DEFAULT false NOT NULL,
	"scanlines" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;