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

    /* Grupo = feature (swimlane) */
    .feature { border: 1px solid var(--line); border-radius: 10px; background: var(--card);
      margin-bottom: 1.5rem; padding: 1rem 1.25rem 1.5rem; }
    .feature > h2 { font-size: 1rem; margin: 0 0 1rem; display: flex; align-items: center; gap: .5rem; }
    .feature .tag { font-size: .7rem; padding: .1rem .5rem; border-radius: 20px; border: 1px solid; }
    .feature.done > h2 .tag     { background: var(--done-bg);     border-color: var(--done-bd);     color: var(--done-fg); }
    .feature.current > h2 .tag  { background: var(--current-bg);  border-color: var(--current-bd);  color: var(--current-fg); }
    .feature.pending > h2 .tag  { background: var(--pending-bg);  border-color: var(--pending-bd);  color: var(--pending-fg); }

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

  <main>
    <!--
      Uma <section class="feature ..."> por feature do plan.md, na ordem de execução.
      Classe da feature: done | current | pending.
      Dentro, o fluxo em .stage (cada stage = 1+ nós paralelos), separados por .connector.

      Exemplo de uma feature já com tasks.md (expandida em componentes):
    -->
    <section class="feature current">
      <h2>1. auth-endpoint <span class="tag">em andamento · 2/4</span></h2>
      <div class="flow">
        <div class="stage">
          <div class="node done"><div class="name">Config</div><div class="sub">F1.C1 · SecurityConfig</div><span class="badge">✓</span></div>
        </div>
        <div class="connector"></div>
        <div class="stage">
          <div class="node current"><div class="name">Controller</div><div class="sub">F1.C2 · AuthController</div><span class="badge">►</span></div>
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
    </section>

    <!-- Feature ainda sem tasks.md: um único nó macro representando a feature inteira. -->
    <section class="feature pending">
      <h2>2. refresh-token <span class="tag">a fazer</span></h2>
      <div class="flow">
        <div class="stage">
          <div class="node pending"><div class="name">refresh-token</div><div class="sub">spec ainda não gerada</div></div>
        </div>
      </div>
    </section>
  </main>

  <footer>
    Gerado pelo SDD lp:* · fluxo macro — foca no que falta implementar, não em cada linha.
  </footer>
</body>
</html>
