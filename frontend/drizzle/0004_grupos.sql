CREATE TABLE "grupos" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"host_id" integer,
	"codigo_convite" text NOT NULL,
	"objetivo" text DEFAULT '' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"finalizado_em" timestamp with time zone,
	CONSTRAINT "grupos_codigo_convite_unique" UNIQUE("codigo_convite")
);
--> statement-breakpoint
CREATE TABLE "membros_grupo" (
	"id" serial PRIMARY KEY NOT NULL,
	"grupo_id" integer NOT NULL,
	"usuario_id" integer NOT NULL,
	"pode_registrar" boolean DEFAULT true NOT NULL,
	"pode_editar_todas" boolean DEFAULT false NOT NULL,
	"pode_gerenciar_listas" boolean DEFAULT false NOT NULL,
	"pode_convidar" boolean DEFAULT false NOT NULL,
	"entrou_em" timestamp with time zone DEFAULT now() NOT NULL,
	"saiu_em" timestamp with time zone,
	CONSTRAINT "membros_grupo_grupo_usuario_unique" UNIQUE("grupo_id","usuario_id")
);
--> statement-breakpoint
ALTER TABLE "agentes" DROP CONSTRAINT "agentes_usuario_id_nome_unique";--> statement-breakpoint
ALTER TABLE "categorias" DROP CONSTRAINT "categorias_usuario_id_nome_unique";--> statement-breakpoint
ALTER TABLE "agentes" ADD COLUMN "grupo_id" integer;--> statement-breakpoint
ALTER TABLE "categorias" ADD COLUMN "grupo_id" integer;--> statement-breakpoint
ALTER TABLE "transacoes" ADD COLUMN "grupo_id" integer;--> statement-breakpoint
ALTER TABLE "grupos" ADD CONSTRAINT "grupos_host_id_usuarios_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membros_grupo" ADD CONSTRAINT "membros_grupo_grupo_id_grupos_id_fk" FOREIGN KEY ("grupo_id") REFERENCES "public"."grupos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membros_grupo" ADD CONSTRAINT "membros_grupo_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "membros_grupo_usuario_id_idx" ON "membros_grupo" USING btree ("usuario_id");--> statement-breakpoint
ALTER TABLE "agentes" ADD CONSTRAINT "agentes_grupo_id_grupos_id_fk" FOREIGN KEY ("grupo_id") REFERENCES "public"."grupos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_grupo_id_grupos_id_fk" FOREIGN KEY ("grupo_id") REFERENCES "public"."grupos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transacoes" ADD CONSTRAINT "transacoes_grupo_id_grupos_id_fk" FOREIGN KEY ("grupo_id") REFERENCES "public"."grupos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agentes_grupo_id_idx" ON "agentes" USING btree ("grupo_id");--> statement-breakpoint
CREATE INDEX "categorias_grupo_id_idx" ON "categorias" USING btree ("grupo_id");--> statement-breakpoint
CREATE INDEX "transacoes_grupo_id_idx" ON "transacoes" USING btree ("grupo_id");--> statement-breakpoint
ALTER TABLE "agentes" ADD CONSTRAINT "agentes_dono_nome_unique" UNIQUE NULLS NOT DISTINCT("usuario_id","grupo_id","nome");--> statement-breakpoint
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_dono_nome_unique" UNIQUE NULLS NOT DISTINCT("usuario_id","grupo_id","nome");