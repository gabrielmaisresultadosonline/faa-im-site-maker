# Migração para PostgreSQL na VPS

## Comando único

No diretório do projeto, execute como `root`:

```bash
ADMIN_PASSWORD='defina-uma-senha-forte' SSL_EMAIL='seu-email@dominio.com' bash deploy-vps.sh
```

O script instala PostgreSQL, Nginx, Bun, PM2 e Certbot; cria banco e usuário; aplica `db/schema.sql`; cria/atualiza o administrador; compila; reinicia o app; configura o proxy e valida a porta 8098.

## Dados antigos

O novo banco é independente. Usuários antigos precisam ser importados com hashes de senha compatíveis ou redefinir a senha. Nunca é possível recuperar senhas a partir dos hashes do provedor anterior. Arquivos novos ficam em `/var/lib/lovablack/uploads`; os três tutoriais do YouTube já são criados pelo schema.

## Variáveis opcionais

`STRIPE_SECRET_KEY`, `FB_ACCESS_TOKEN` e `FB_PIXEL_ID` podem ser exportadas antes do comando. O script grava segredos somente em `.env.production`, com permissão `600`.