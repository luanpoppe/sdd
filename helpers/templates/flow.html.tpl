<!DOCTYPE html>
<html lang="{{LANG}}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Fluxo da implementação — {{TITLE}}</title>
  <style>
    /* Autocontido: não depende de styles.css nem de libs externas. Funciona offline. */
    :root {
      --bg: #f7f8fa; --fg: #1a1d21; --muted: #6b7280; --card: #ffffff; --line: #cbd5e1;
      --pending-bd: #cbd5e1; --pending-bg: #f1f5f9; --pending-fg: #64748b;
      --current-bd: #d97706; --current-bg: #fef3c7; --current-fg: #92400e;
      --done-bd: #16a34a; --done-bg: #dcfce7; --done-fg: #166534;
      --deviated-bd: #dc2626; --deviated-bg: #fee2e2; --deviated-fg: #991b1b;
      --accent: #2563eb;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0f1115; --fg: #e5e7eb; --muted: #9ca3af; --card: #1a1d23; --line: #374151;
        --pending-bd: #374151; --pending-bg: #1f242c; --pending-fg: #9ca3af;
        --current-bd: #f59e0b; --current-bg: #3a2e10; --current-fg: #fcd34d;
        --done-bd: #22c55e; --done-bg: #14311f; --done-fg: #86efac;
        --deviated-bd: #ef4444; --deviated-bg: #3a1414; --deviated-fg: #fca5a5;
        --accent: #60a5fa;
      }
    }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 2rem 1rem 4rem; background: var(--bg); color: var(--fg);
      font: 15px/1.5 system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
    header { max-width: 900px; margin: 0 auto 1.5rem; }
    h1 { font-size: 1.3rem; margin: 0 0 .3rem; }
    .meta { color: var(--muted); font-size: .85rem; margin: 0; }
    .progress { max-width: 900px; margin: 1rem auto; }
    .bar { height: 8px; border-radius: 6px; background: var(--pending-bg); overflow: hidden; border: 1px solid var(--line); }
    .bar > span { display: block; height: 100%; background: var(--done-bd); width: {{PCT}}%; transition: width .3s; }
    .progress-label { font-size: .85rem; color: var(--muted); margin-top: .4rem; }

    .legend { max-width: 900px; margin: 0 auto 1.5rem; display: flex; flex-wrap: wrap; gap: .75rem; font-size: .8rem; }
    .legend span { display: inline-flex; align-items: center; gap: .35rem; }
    .dot { width: 12px; height: 12px; border-radius: 3px; border: 1.5px solid; }
    .dot.pending  { background: var(--pending-bg);  border-color: var(--pending-bd); }
    .dot.current  { background: var(--current-bg);  border-color: var(--current-bd); }
    .dot.done     { background: var(--done-bg);     border-color: var(--done-bd); }
    .dot.deviated { background: var(--deviated-bg); border-color: var(--deviated-bd); }

    main { max-width: 900px; margin: 0 auto; }

    /* Grupo = feature (swimlane) — <details> colapsável */
    .feature { border: 1px solid var(--line); border-radius: 10px; background: var(--card);
      margin-bottom: 1.5rem; padding: 0 1.25rem; }
    .feature[open] { padding-bottom: 1.5rem; }
    .feature > summary { font-size: 1rem; font-weight: 600; cursor: pointer; list-style: none;
      display: flex; align-items: center; gap: .5rem; padding: 1rem 0; user-select: none; }
    .feature > summary::-webkit-details-marker { display: none; }
    .feature > summary::before { content: "▸"; color: var(--accent); font-size: .8rem; transition: transform .15s; }
    .feature[open] > summary::before { transform: rotate(90deg); }
    .feature .tag { font-size: .7rem; padding: .1rem .5rem; border-radius: 20px; border: 1px solid; }
    .feature.done > summary .tag     { background: var(--done-bg);     border-color: var(--done-bd);     color: var(--done-fg); }
    .feature.current > summary .tag  { background: var(--current-bg);  border-color: var(--current-bd);  color: var(--current-fg); }
    .feature.pending > summary .tag  { background: var(--pending-bg);  border-color: var(--pending-bd);  color: var(--pending-fg); }

    /* Fluxo vertical de stages, com conectores */
    .flow { display: flex; flex-direction: column; align-items: center; }
    .stage { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
    .connector { width: 2px; height: 24px; background: var(--line); position: relative; }
    .connector::after { content: "▼"; position: absolute; bottom: -4px; left: 50%; transform: translateX(-50%);
      color: var(--line); font-size: .7rem; }

    /* Nó = componente / chunk */
    .node { min-width: 150px; max-width: 220px; border: 1.5px solid; border-radius: 8px; padding: .6rem .8rem;
      text-align: center; position: relative; }
    .node .name { font-weight: 600; font-size: .9rem; }
    .node .sub { font-size: .72rem; color: var(--muted); margin-top: .15rem; }
    .node .badge { position: absolute; top: -9px; right: -9px; font-size: .85rem; }
    .node.pending  { background: var(--pending-bg);  border-color: var(--pending-bd);  color: var(--pending-fg); }
    .node.done     { background: var(--done-bg);     border-color: var(--done-bd);     opacity: .78; }
    .node.current  { background: var(--current-bg);  border-color: var(--current-bd);  box-shadow: 0 0 0 3px color-mix(in srgb, var(--current-bd) 25%, transparent); }
    .node.deviated { background: var(--deviated-bg); border-color: var(--deviated-bd); }
    .node.deviated .sub { color: var(--deviated-fg); }

    /* Nó clicável (tem detalhe) — afeta só nós já com conteúdo (done/current/deviated) */
    .node.has-detail { cursor: pointer; opacity: 1; transition: box-shadow .15s, transform .1s; }
    .node.has-detail:hover { box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 30%, transparent); }
    .node.has-detail:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    .node.has-detail .hint { display: block; font-size: .62rem; color: var(--accent); margin-top: .3rem; letter-spacing: .02em; }
    .node.has-detail.active { box-shadow: 0 0 0 3px var(--accent); }
    .node.has-detail.active .hint::after { content: " ▲"; }
    .node.has-detail:not(.active) .hint::after { content: " ▼"; }

    /* Painel de detalhe (um por feature; mostra o nó selecionado) */
    .detail-panel { margin-top: 1.25rem; border-top: 1px dashed var(--line); padding-top: 1.25rem; }
    .detail { }
    .detail h4 { margin: 0 0 .2rem; font-size: 1rem; display: flex; align-items: center; gap: .5rem; }
    .detail h4 .chunk-id { font-size: .72rem; font-weight: 600; color: var(--muted);
      border: 1px solid var(--line); border-radius: 20px; padding: .05rem .5rem; }
    .detail .what { margin: .1rem 0 1rem; color: var(--fg); }
    .detail .block-label { font-size: .72rem; font-weight: 600; text-transform: uppercase; letter-spacing: .04em;
      color: var(--muted); margin: 1rem 0 .35rem; }
    .detail pre { margin: 0; background: var(--bg); border: 1px solid var(--line); border-radius: 8px;
      padding: .8rem 1rem; overflow-x: auto; font: 13px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    .detail pre + .block-label { margin-top: 1.1rem; }
    .detail .data { background: var(--bg); border: 1px solid var(--line); border-radius: 8px; padding: .8rem 1rem;
      font: 13px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; overflow-x: auto; }
    .detail .note { font-size: .8rem; color: var(--muted); margin-top: 1rem; font-style: italic; }

    footer { max-width: 900px; margin: 2rem auto 0; font-size: .8rem; color: var(--muted); }
  </style>
</head>
<body>
  <header>
    <h1>Fluxo da implementação — {{TITLE}}</h1>
    <p class="meta">Mudança <code>{{ID}}</code> · atualizado em {{UPDATED}}</p>
  </header>

  <div class="progress">
    <div class="bar"><span></span></div>
    <p class="progress-label">{{PROGRESS_LABEL}}</p>
  </div>

  <div class="legend">
    <span><i class="dot pending"></i> A fazer</span>
    <span><i class="dot current"></i> Em andamento</span>
    <span><i class="dot done"></i> Concluído</span>
    <span><i class="dot deviated"></i> Feito diferente do planejado</span>
  </div>
  <p class="meta" style="max-width:900px;margin:-.5rem auto 1.5rem;">Clique num nó já implementado para ver o que ele faz, exemplo dos dados e um trecho ilustrativo.</p>

  <main>
    <!--
      Um <details class="feature ..." open> por feature do plan.md, na ordem de execução (colapsável).
      Classe da feature: done | current | pending.
      Dentro, o fluxo em .stage (cada stage = 1+ nós paralelos), separados por .connector.

      NÓ CLICÁVEL: todo nó já implementado (done/current/deviated) ganha:
        - classe extra `has-detail`, atributo `data-detail="F<n>.C<m>"`, tabindex="0",
        - um <span class="hint">detalhes</span> dentro do nó,
        - um bloco correspondente <div class="detail" data-detail-for="F<n>.C<m>" hidden> no
          `.detail-panel` da MESMA feature.
      Nós `pending` (sem código ainda) NÃO recebem has-detail nem bloco de detalhe.

      Conteúdo do bloco de detalhe (resumo/pseudo — vem da spec/tasks, NÃO de ler o código-fonte):
        - <h4> componente + <span class="chunk-id">
        - <p class="what"> 1-3 frases: o que esse chunk faz
        - "Dados fluindo" em <div class="data"> (request/response, evento, objeto de exemplo)
        - "Trecho ilustrativo" em <pre><code> (pseudo/assinatura, baseado na spec — não é o fonte real)
        - <p class="note"> opcional (ex: desvio do planejado)

      Exemplo de uma feature já com tasks.md (expandida em componentes):
    -->
    <details class="feature current" open>
      <summary>1. auth-endpoint <span class="tag">em andamento · 2/4</span></summary>
      <div class="flow">
        <div class="stage">
          <div class="node done has-detail" data-detail="F1.C1" tabindex="0"><div class="name">Config</div><div class="sub">F1.C1 · SecurityConfig</div><span class="badge">✓</span><span class="hint">detalhes</span></div>
        </div>
        <div class="connector"></div>
        <div class="stage">
          <div class="node current has-detail" data-detail="F1.C2" tabindex="0"><div class="name">Controller</div><div class="sub">F1.C2 · AuthController</div><span class="badge">►</span><span class="hint">detalhes</span></div>
        </div>
        <div class="connector"></div>
        <div class="stage">
          <div class="node pending"><div class="name">UseCase</div><div class="sub">F1.C3 · LoginUseCase</div></div>
        </div>
        <div class="connector"></div>
        <!-- fan-out: UseCase aponta para Mapper E Repository -->
        <div class="stage">
          <div class="node pending"><div class="name">Mapper</div><div class="sub">F1.C4 · UserMapper</div></div>
          <div class="node pending"><div class="name">Repository</div><div class="sub">F1.C4 · UserRepository</div></div>
        </div>
      </div>

      <!-- Painel de detalhe da feature: um .detail por nó has-detail, todos hidden (JS mostra o clicado). -->
      <div class="detail-panel" hidden>
        <div class="detail" data-detail-for="F1.C1" hidden>
          <h4>Config <span class="chunk-id">F1.C1 · SecurityConfig</span></h4>
          <p class="what">Configura a cadeia de segurança: libera o endpoint de login e exige token nos demais. Base para o restante do fluxo de auth.</p>
          <p class="block-label">Dados fluindo</p>
          <div class="data">requisição sem token → 401 · requisição com Bearer válido → segue para o controller</div>
          <p class="block-label">Trecho ilustrativo</p>
          <pre><code>http.authorizeHttpRequests(a -&gt; a
    .requestMatchers("/auth/login").permitAll()
    .anyRequest().authenticated())</code></pre>
        </div>
        <div class="detail" data-detail-for="F1.C2" hidden>
          <h4>Controller <span class="chunk-id">F1.C2 · AuthController</span></h4>
          <p class="what">Recebe o POST de login, valida o corpo e delega ao caso de uso. Devolve o token quando as credenciais batem.</p>
          <p class="block-label">Dados fluindo</p>
          <div class="data">POST /auth/login { "email": "a@b.com", "senha": "***" } → 200 { "token": "eyJ..." }</div>
          <p class="block-label">Trecho ilustrativo</p>
          <pre><code>@PostMapping("/login")
ResponseEntity&lt;TokenResponse&gt; login(@Valid @RequestBody LoginRequest req) {
    return ResponseEntity.ok(loginUseCase.execute(req));
}</code></pre>
        </div>
      </div>
    </details>

    <!-- Feature ainda sem tasks.md: um único nó macro. Sem tasks = sem código = sem has-detail. -->
    <details class="feature pending" open>
      <summary>2. refresh-token <span class="tag">a fazer</span></summary>
      <div class="flow">
        <div class="stage">
          <div class="node pending"><div class="name">refresh-token</div><div class="sub">spec ainda não gerada</div></div>
        </div>
      </div>
    </details>
  </main>

  <footer>
    Gerado pelo SDD lp:* · fluxo macro — foca no que falta implementar, não em cada linha.
  </footer>

  <script>
    // Autocontido, offline. Clicar num nó .has-detail abre/fecha o bloco de detalhe
    // correspondente no .detail-panel da MESMA feature. Um por vez por feature.
    (function () {
      function toggleNode(node) {
        var feature = node.closest('.feature');
        if (!feature) return;
        var panel = feature.querySelector('.detail-panel');
        if (!panel) return;
        var id = node.getAttribute('data-detail');
        var target = panel.querySelector('.detail[data-detail-for="' + id + '"]');
        if (!target) return;

        var wasActive = node.classList.contains('active');

        // Reset da feature: nenhum nó ativo, todos os detalhes escondidos.
        feature.querySelectorAll('.node.active').forEach(function (n) { n.classList.remove('active'); });
        feature.querySelectorAll('.detail').forEach(function (d) { d.hidden = true; });

        if (wasActive) { panel.hidden = true; return; } // clicar de novo fecha

        node.classList.add('active');
        target.hidden = false;
        panel.hidden = false;
      }

      document.addEventListener('click', function (e) {
        var node = e.target.closest('.node.has-detail');
        if (node) toggleNode(node);
      });

      document.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        var node = e.target.closest('.node.has-detail');
        if (!node) return;
        e.preventDefault();
        toggleNode(node);
      });
    })();
  </script>
</body>
</html>
