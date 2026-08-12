# Planejamento de Estabilização de Infraestrutura (VPS)

## Problema Identificado
O diagnóstico revelou que `lovblack.online` tinha dois VirtualHosts ativos simultaneamente (`lovablack` e `lovablack_exclusivo`), o que causa comportamento imprevisível no Nginx. Além disso, o teste local retornou `404`, sugerindo que o proxy estava apontando para a porta errada ou o serviço estava offline.

## Ações Realizadas
- Analisado o log de rastreamento completo da VPS.
- Criado o script `fix_nginx_lovblack.sh` que:
  - Remove o link simbólico redundante.
  - Ajusta a configuração para a porta `8080` (padrão TanStack).
  - Reinicia o serviço de forma segura.

## Próximos Passos
1. O usuário deve executar o comando de reparo fornecido.
2. Verificar se o processo Bun/PM2 está ativo na porta 8080.
3. Se o site abrir, rodar `sudo certbot --nginx -d lovblack.online -d www.lovblack.online` para restaurar o SSL.

## Detalhes Técnicos
- **VirtualHosts removidos:** `/etc/nginx/sites-enabled/lovablack`
- **Porta de destino:** `127.0.0.1:8080`
- **Configuração Exclusiva:** Mantida em `/etc/nginx/sites-available/lovablack_exclusivo`
