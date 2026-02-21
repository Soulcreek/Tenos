CREATE TABLE "characters" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"name" text NOT NULL,
	"character_class" text DEFAULT 'warrior' NOT NULL,
	"zone" text DEFAULT 'village-shinsoo' NOT NULL,
	"pos_x" real DEFAULT 0 NOT NULL,
	"pos_y" real DEFAULT 0 NOT NULL,
	"pos_z" real DEFAULT 0 NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"stat_points" integer DEFAULT 0 NOT NULL,
	"str" integer DEFAULT 12 NOT NULL,
	"dex" integer DEFAULT 8 NOT NULL,
	"int_stat" integer DEFAULT 5 NOT NULL,
	"vit" integer DEFAULT 10 NOT NULL,
	"hp_current" real DEFAULT 0 NOT NULL,
	"mp_current" real DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"display_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_login_at" timestamp,
	CONSTRAINT "players_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "characters_player_id_idx" ON "characters" USING btree ("player_id");--> statement-breakpoint
CREATE UNIQUE INDEX "characters_name_idx" ON "characters" USING btree ("name");