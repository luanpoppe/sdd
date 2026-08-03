<!DOCTYPE html>
<html lang="{{lang}}">
<head>
  <meta charset="UTF-8">
  <title>Spec: {{feature_slug}} — {{change_id}}</title>
  <link rel="stylesheet" href="../../../../assets/styles.css">
</head>
<body>
  <aside class="toc">
    <p class="toc-title">Índice</p>
    <ol>
      <li><a href="#resumo">Resumo</a></li>
      <li><a href="#requirements">Requirements (BDD)</a></li>
      <li><a href="#edge-cases">Edge cases</a></li>
      <li><a href="#contratos">Contratos</a></li>
    </ol>
  </aside>

  <header class="lp-header">
    <p class="lp-breadcrumb"><a href="../../plan.html">{{change_id}}</a> / specs / <strong>{{feature_slug}}</strong> / spec</p>
    <h1>Spec: {{feature_slug}}</h1>
    <p class="lp-meta">Atualizado em {{updated}}</p>
  </header>

  <main class="lp-main">
    <!-- Espelha o spec.md desta feature. Cada seção é um <details class="lp-sec" open> colapsável. -->

    <details class="lp-sec" id="resumo" open>
      <summary><h2>Resumo</h2></summary>
      <p>{{resumo}}</p>
    </details>

    <details class="lp-sec" id="requirements" open>
      <summary><h2>Requirements (cenários BDD)</h2></summary>
      <!-- Cada cenário: <h3> título + bloco Dado/Quando/Então (ou Given/When/Then conforme lang). -->
    </details>

    <details class="lp-sec" id="edge-cases" open>
      <summary><h2>Edge cases</h2></summary>
      <ul><!-- <li> por caso --></ul>
    </details>

    <details class="lp-sec" id="contratos" open>
      <summary><h2>Contratos</h2></summary>
      <!-- tipos, schemas, endpoints, eventos — em <pre><code> quando fizer sentido -->
    </details>
  </main>

  <footer class="lp-footer">
    <p>Gerado pelo SDD <code>lp:continue</code>. Espelho HTML do <code>spec.md</code> (fonte é o .md).</p>
  </footer>
</body>
</html>
