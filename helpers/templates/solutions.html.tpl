<!DOCTYPE html>
<html lang="{{lang}}">
<head>
  <meta charset="UTF-8">
  <title>Opções de correção: {{title}} — {{change_id}}</title>
  <link rel="stylesheet" href="../../assets/styles.css">
</head>
<body>
  <aside class="toc">
    <p class="toc-title">Índice</p>
    <ol>
      <li><a href="#contexto">Contexto</a></li>
      <li><a href="#opcoes">Opções</a></li>
      <li><a href="#recomendacao">Recomendação</a></li>
    </ol>
  </aside>

  <header class="lp-header">
    <p class="lp-breadcrumb"><strong>{{change_id}}</strong> / opções de correção</p>
    <h1>Opções de correção: {{title}}</h1>
    <p class="lp-meta">Bug · atualizado em {{updated}} · causa em <a href="diagnosis.html">diagnosis.html</a></p>
  </header>

  <main class="lp-main">
    <!-- Espelha o solutions.md. Uma opção por <details class="lp-sec" open>. -->

    <details class="lp-sec" id="contexto" open>
      <summary><h2>Contexto</h2></summary>
      <p>{{contexto}}</p>
    </details>

    <section id="opcoes">
      <details class="lp-sec" open>
        <summary><h2>Opção 1 — {{opcao_1_titulo}} {{opcao_1_tag}}</h2></summary>
        <ul>
          <li><strong>Abordagem</strong>: {{opcao_1_abordagem}}</li>
          <li><strong>Prós</strong>: {{opcao_1_pros}}</li>
          <li><strong>Contras</strong>: {{opcao_1_contras}}</li>
          <li><strong>Esforço / risco</strong>: {{opcao_1_esforco}}</li>
        </ul>
      </details>

      <details class="lp-sec" open>
        <summary><h2>Opção 2 — {{opcao_2_titulo}}</h2></summary>
        <ul>
          <li><strong>Abordagem</strong>: {{opcao_2_abordagem}}</li>
          <li><strong>Prós</strong>: {{opcao_2_pros}}</li>
          <li><strong>Contras</strong>: {{opcao_2_contras}}</li>
          <li><strong>Esforço / risco</strong>: {{opcao_2_esforco}}</li>
        </ul>
      </details>
      <!-- 2 a 4 opções. -->
    </section>

    <details class="lp-sec" id="recomendacao" open>
      <summary><h2>Recomendação</h2></summary>
      <p>{{recomendacao}}</p>
    </details>
  </main>

  <footer class="lp-footer">
    <p>Gerado pelo SDD <code>lp:bug-fix</code>. Espelho HTML do <code>solutions.md</code> (fonte é o .md).</p>
  </footer>
</body>
</html>
