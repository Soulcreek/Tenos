CREATE TABLE "equipped_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"character_id" integer NOT NULL,
	"slot" text NOT NULL,
	"item_id" integer NOT NULL,
	"upgrade_level" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "equipped_char_slot_idx" UNIQUE("character_id","slot")
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"character_id" integer NOT NULL,
	"slot" integer NOT NULL,
	"item_id" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"upgrade_level" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "inventory_char_slot_idx" UNIQUE("character_id","slot")
);
--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "yang" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "equipped_items" ADD CONSTRAINT "equipped_items_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "equipped_character_id_idx" ON "equipped_items" USING btree ("character_id");--> statement-breakpoint
CREATE INDEX "inventory_character_id_idx" ON "inventory_items" USING btree ("character_id");