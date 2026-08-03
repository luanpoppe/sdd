<!DOCTYPE html>
<html lang="{{lang}}">
<head>
  <meta charset="UTF-8">
  <title>Plano — {{change_id}}</title>
  <link rel="stylesheet" href="../../assets/styles.css">
</head>
<body>
  <header class="lp-header">
    <p class="lp-breadcrumb"><strong>{{change_id}}</strong> / plan</p>
    <h1>{{title}}</h1>
    <p class="lp-meta">Atualizado em {{updated}}</p>
  </header>

  <main class="lp-main">
    <!-- Espelha o plan.md. Preencha as seções abaixo com o MESMO conteúdo do .md. -->

    <section id="contexto">
      <h2>Contexto</h2>
      <p>{{contexto}}</p>
    </section>

    <section id="decisoes">
      <h2>Decisões macro</h2>
      <ul><!-- <li> por decisão --></ul>
    </section>

    <section id="features">
      <h2>Features (executadas sequencialmente)</h2>
      <ol>
        <!-- <li><strong>slug</strong> — resumo de 1 frase.</li> por feature, na ordem -->
      </ol>
    </section>

    <section id="escopo">
      <h2>Escopo</h2>
      <p><strong>Dentro:</strong> …</p>
      <p><strong>Fora:</strong> …</p>
    </section>
  </main>

  <footer class="lp-footer">
    <p>Gerado pelo SDD <code>lp:new</code>. Espelho HTML do <code>plan.md</code> (fonte é o .md).</p>
  </footer>
</body>
</html>
