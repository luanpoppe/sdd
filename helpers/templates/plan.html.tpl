<!DOCTYPE html>
<html lang="{{lang}}">
<head>
  <meta charset="UTF-8">
  <title>Plano — {{change_id}}</title>
  <link rel="stylesheet" href="../../assets/styles.css">
</head>
<body>
  <aside class="toc">
    <p class="toc-title">Índice</p>
    <ol>
      <li><a href="#contexto">Contexto</a></li>
      <li><a href="#decisoes">Decisões macro</a></li>
      <li><a href="#features">Features</a></li>
      <li><a href="#escopo">Escopo</a></li>
    </ol>
  </aside>

  <header class="lp-header">
    <p class="lp-breadcrumb"><strong>{{change_id}}</strong> / plan</p>
    <h1>{{title}}</h1>
    <p class="lp-meta">Atualizado em {{updated}}</p>
  </header>

  <main class="lp-main">
    <!-- Espelha o plan.md. Cada seção é um <details class="lp-sec" open> colapsável. -->

    <details class="lp-sec" id="contexto" open>
      <summary><h2>Contexto</h2></summary>
      <p>{{contexto}}</p>
    </details>

    <details class="lp-sec" id="decisoes" open>
      <summary><h2>Decisões macro</h2></summary>
      <ul><!-- <li> por decisão --></ul>
    </details>

    <details class="lp-sec" id="features" open>
      <summary><h2>Features (executadas sequencialmente)</h2></summary>
      <ol>
        <!-- <li><strong>slug</strong> — resumo de 1 frase.</li> por feature, na ordem -->
      </ol>
    </details>

    <details class="lp-sec" id="escopo" open>
      <summary><h2>Escopo</h2></summary>
      <p><strong>Dentro:</strong> …</p>
      <p><strong>Fora:</strong> …</p>
    </details>
  </main>

  <footer class="lp-footer">
    <p>Gerado pelo SDD <code>lp:new</code>. Espelho HTML do <code>plan.md</code> (fonte é o .md).</p>
  </footer>
</body>
</html>
