<!DOCTYPE html>
<html lang="{{lang}}">
<head>
  <meta charset="UTF-8">
  <title>Spec: {{feature_slug}} — {{change_id}}</title>
  <link rel="stylesheet" href="../../../../assets/styles.css">
</head>
<body>
  <header class="lp-header">
    <p class="lp-breadcrumb"><a href="../../plan.html">{{change_id}}</a> / specs / <strong>{{feature_slug}}</strong> / spec</p>
    <h1>Spec: {{feature_slug}}</h1>
    <p class="lp-meta">Atualizado em {{updated}}</p>
  </header>

  <main class="lp-main">
    <!-- Espelha o spec.md desta feature. Mesmo conteúdo do .md, na mesma ordem de revisão. -->

    <section id="resumo">
      <h2>Resumo</h2>
      <p>{{resumo}}</p>
    </section>

    <section id="requirements">
      <h2>Requirements (cenários BDD)</h2>
      <!-- Cada cenário: <h3> título + bloco Dado/Quando/Então (ou Given/When/Then conforme lang). -->
    </section>

    <section id="edge-cases">
      <h2>Edge cases</h2>
      <ul><!-- <li> por caso --></ul>
    </section>

    <section id="contratos">
      <h2>Contratos</h2>
      <!-- tipos, schemas, endpoints, eventos — em <pre><code> quando fizer sentido -->
    </section>
  </main>

  <footer class="lp-footer">
    <p>Gerado pelo SDD <code>lp:continue</code>. Espelho HTML do <code>spec.md</code> (fonte é o .md).</p>
  </footer>
</body>
</html>
