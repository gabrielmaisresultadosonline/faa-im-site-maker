export function renderErrorPage(stack?: string): string {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Erro de Configuração - LOVABLACK</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      * { box-sizing: border-box; }
      body {
        font: 16px/1.6 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background: #f5f5f0;
        color: #1a1a1a;
        display: grid;
        place-items: center;
        min-height: 100vh;
        margin: 0;
        padding: 1.5rem;
      }
      .card {
        max-width: 640px;
        width: 100%;
        background: #ffffff;
        border-radius: 1rem;
        box-shadow: 0 10px 40px rgba(0,0,0,0.08);
        padding: 2.5rem;
        text-align: left;
      }
      .brand {
        font-weight: 800;
        font-size: 1.25rem;
        letter-spacing: -0.02em;
        margin-bottom: 1.5rem;
        color: #111;
      }
      h1 {
        font-size: 1.5rem;
        margin: 0 0 1rem;
        color: #111;
      }
      p {
        color: #4b5563;
        margin: 0 0 1rem;
      }
      .highlight {
        background: #fef3c7;
        border: 1px solid #f59e0b;
        border-radius: 0.5rem;
        padding: 1rem;
        margin: 1.25rem 0;
      }
      .highlight strong {
        color: #92400e;
      }
      .project-id {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        background: #111;
        color: #fff;
        padding: 0.5rem 0.75rem;
        border-radius: 0.375rem;
        display: inline-block;
        margin-top: 0.5rem;
        font-size: 0.95rem;
      }
      ol {
        padding-left: 1.2rem;
        margin: 0.75rem 0 0;
      }
      ol li {
        margin-bottom: 0.75rem;
        color: #374151;
      }
      code {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        background: #f3f4f6;
        padding: 0.15rem 0.35rem;
        border-radius: 0.25rem;
        font-size: 0.9em;
        word-break: break-word;
      }
      .code-block {
        background: #111827;
        color: #f9fafb;
        padding: 1rem;
        border-radius: 0.5rem;
        overflow-x: auto;
        font-size: 0.85rem;
        margin: 0.75rem 0 1.25rem;
      }
      .actions {
        display: flex;
        gap: 0.75rem;
        justify-content: flex-start;
        flex-wrap: wrap;
        margin-top: 1.5rem;
      }
      a, button {
        padding: 0.75rem 1.25rem;
        border-radius: 0.5rem;
        font: inherit;
        font-weight: 600;
        cursor: pointer;
        text-decoration: none;
        border: 1px solid transparent;
        transition: opacity 0.2s;
      }
      a:hover, button:hover { opacity: 0.9; }
      .primary { background: #111; color: #fff; }
      .secondary { background: #fff; color: #111; border-color: #d1d5db; }
      .footer {
        margin-top: 1.5rem;
        font-size: 0.85rem;
        color: #6b7280;
        border-top: 1px solid #e5e7eb;
        padding-top: 1rem;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="brand">LOVABLACK</div>
      <h1>Próximo passo seguro</h1>
      <p>
        Precisamos recuperar a <strong>Service Role Key</strong> do projeto correto para que o site funcione 100% no seu VPS.
      </p>

      <div class="highlight">
        <strong>Project ID:</strong>
        <div class="project-id">zjvmfmdyuxmyanuuralq</div>
      </div>

      <p><strong>Configuração Automática via Deploy:</strong></p>
      <ol>
        <li>O script <code>deploy-vps.sh</code> foi atualizado para injetar as chaves automaticamente.</li>
        <li>Se você não tem a chave, eu já configurei o Project ID <code>zjvmfmdyuxmyanuuralq</code> como padrão.</li>
        <li>No terminal do VPS, execute o comando abaixo apenas uma vez para definir sua chave:
          <div class="code-block">export SUPABASE_SERVICE_ROLE_KEY=sua_chave_aqui</div>
        </li>
        <li>Depois, rode o deploy normalmente:
          <div class="code-block">./deploy-vps.sh</div>
        </li>
        <li>O PM2 agora receberá a chave via <code>--update-env</code> automaticamente durante o processo.</li>
      </ol>

      <div class="actions">
        <button class="primary" onclick="location.reload()">Tentar Novamente</button>
        <a class="secondary" href="/">Voltar ao Início</a>
      </div>

      <div class="footer">
        Dica: O SSR exige acesso administrativo para gerenciar sessões e assinaturas. Certifique-se de que a chave configurada pertence ao Project ID <strong>zjvmfmdyuxmyanuuralq</strong>.
      </div>
    </div>
  </body>
</html>`;
}
