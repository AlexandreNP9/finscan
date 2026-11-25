CREATE TABLE "sessoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"usuario_id" integer NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessoes_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"senha_hash" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "transacoes" ADD COLUMN "usuario_id" integer;--> statement-breakpoint
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sessoes_usuario_id_idx" ON "sessoes" USING btree ("usuario_id");--> statement-breakpoint
ALTER TABLE "transacoes" ADD CONSTRAINT "transacoes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transacoes_usuario_id_idx" ON "transacoes" USING btree ("usuario_id");