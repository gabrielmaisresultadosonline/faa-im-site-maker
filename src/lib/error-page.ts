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
    <div class="card" style="background: #1A1B1A; border: 1px solid rgba(255,255,255,0.1); color: white; text-align: center; max-width: 580px;">
      <div class="brand" style="color: #DC0D0D; font-size: 2rem; margin-bottom: 2rem;">LOVABLACK</div>
      
      <div style="width: 80px; height: 80px; background: rgba(255,255,255,0.05); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 2rem; border: 4px solid rgba(220,13,13,0.2);">
        <svg style="width: 40px; height: 40px; color: #DC0D0D; margin: auto;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      </div>

      <h1 style="color: white; font-size: 2.5rem; font-weight: 900; letter-spacing: -0.05em; margin-bottom: 1rem;">
        ESTAMOS EM ATUALIZAÇÃO
      </h1>
      
      <p style="color: #a3a3a3; font-size: 1.25rem; font-weight: 500; line-height: 1.6; margin-bottom: 2rem;">
        Estamos passando por uma atualização importante.<br>
        Voltamos daqui algumas horas com novidades incríveis.
      </p>

      <div style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1.25rem; border-radius: 9999px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); font-size: 0.875rem; font-weight: 700; color: #737373; text-transform: uppercase; letter-spacing: 0.1em;">
        <span style="color: #DC0D0D;">⚡</span> Manutenção Programada
      </div>

      ${stack ? `
        <div style="margin-top: 2rem; padding: 1rem; background: rgba(0,0,0,0.3); border-radius: 0.5rem; text-align: left; font-family: monospace; font-size: 0.75rem; color: #444; overflow: hidden; max-height: 100px;">
          DEBUG_INFO: ${stack.split('\n')[0]}
        </div>
      ` : ''}
    </div>
  </body>
</html>`;
}
