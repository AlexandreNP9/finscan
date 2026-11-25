ALTER TABLE "agentes" DROP CONSTRAINT "agentes_nome_unique";--> statement-breakpoint
ALTER TABLE "categorias" DROP CONSTRAINT "categorias_nome_unique";--> statement-breakpoint
ALTER TABLE "agentes" ADD COLUMN "usuario_id" integer;--> statement-breakpoint
ALTER TABLE "categorias" ADD COLUMN "usuario_id" integer;--> statement-breakpoint
ALTER TABLE "agentes" ADD CONSTRAINT "agentes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agentes_usuario_id_idx" ON "agentes" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "categorias_usuario_id_idx" ON "categorias" USING btree ("usuario_id");--> statement-breakpoint
ALTER TABLE "agentes" ADD CONSTRAINT "agentes_usuario_id_nome_unique" UNIQUE NULLS NOT DISTINCT("usuario_id","nome");--> statement-breakpoint
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_usuario_id_nome_unique" UNIQUE NULLS NOT DISTINCT("usuario_id","nome");