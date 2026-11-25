CREATE TABLE "agentes" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "agentes_nome_unique" UNIQUE("nome")
);
--> statement-breakpoint
CREATE TABLE "categorias" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "categorias_nome_unique" UNIQUE("nome")
);
--> statement-breakpoint
CREATE TABLE "itens" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "itens_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"transacao_id" bigint NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"codigo" text,
	"descricao" text NOT NULL,
	"qtd" numeric(15, 4) DEFAULT '1' NOT NULL,
	"un" text DEFAULT 'UN' NOT NULL,
	"vl_unit" numeric(21, 10) DEFAULT '0' NOT NULL,
	"vl_total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"categoria_id" integer
);
--> statement-breakpoint
CREATE TABLE "transacoes" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "transacoes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"chave_acesso" text,
	"estabelecimento" text DEFAULT '' NOT NULL,
	"valor_total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"desconto" numeric(12, 2) DEFAULT '0' NOT NULL,
	"data_emissao" date,
	"hora_emissao" time,
	"agente_id" integer,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "itens" ADD CONSTRAINT "itens_transacao_id_transacoes_id_fk" FOREIGN KEY ("transacao_id") REFERENCES "public"."transacoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itens" ADD CONSTRAINT "itens_categoria_id_categorias_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transacoes" ADD CONSTRAINT "transacoes_agente_id_agentes_id_fk" FOREIGN KEY ("agente_id") REFERENCES "public"."agentes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "itens_transacao_id_idx" ON "itens" USING btree ("transacao_id");--> statement-breakpoint
CREATE INDEX "itens_categoria_id_idx" ON "itens" USING btree ("categoria_id");