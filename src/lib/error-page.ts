export function renderErrorPage(stack?: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>This page didn't load</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: #fafafa; color: #111; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
      p { color: #4b5563; margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.5rem 1rem; border-radius: 0.375rem; font: inherit; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      .primary { background: #111; color: #fff; }
      .secondary { background: #fff; color: #111; border-color: #d1d5db; }
    </style>
  </head>
  <body>
    <div class="card">
       <h1>Próximo passo seguro</h1>
      <p>Precisamos recuperar a Service Role Key do projeto Supabase correto:</p>
      <div style="text-align: left; background: #eee; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1.5rem;">
        <strong>Project ID:</strong><br/>
        <code style="font-family: monospace; word-break: break-all;">zjvmfmdyuxmyanuuralq</code>
      </div>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Tentar Novamente</button>
        <a class="secondary" href="/">Voltar ao Início</a>
      </div>
    </div>
  </body>
</html>`;
}
