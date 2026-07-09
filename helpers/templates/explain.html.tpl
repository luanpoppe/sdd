<!DOCTYPE html>
<html lang="{{lang}}">
<head>
  <meta charset="UTF-8">
  <title>{{theme}} — {{change_id}}</title>
  <link rel="stylesheet" href="../../../assets/styles.css">
</head>
<body>
  <aside class="toc">
    <p class="toc-title">Índice</p>
    <ol>
      <li><a href="#overview">Visão geral</a></li>
      <li><a href="#detalhes">Detalhes</a></li>
      <li><a href="#perguntas">Perguntas registradas</a></li>
      <!-- novas sub-entradas de tópicos em "detalhes" devem ser anexadas aqui como <ol> aninhado -->
    </ol>
  </aside>

  <header class="lp-header">
    <p class="lp-breadcrumb"><a href="../../plan.md">{{change_id}}</a> / explain / <strong>{{theme}}</strong></p>
    <h1>{{theme}}</h1>
    <p class="lp-meta">Iniciado em {{created}} · última atualização {{updated}}</p>
  </header>

  <main class="lp-main">

    <!-- LP-SECTION:overview -->
    <section id="overview" data-section="overview">
      <h2>Visão geral</h2>
      <p>{{overview}}</p>
    </section>

    <!-- LP-SECTION:detalhes -->
    <section id="detalhes" data-section="detalhes">
      <h2>Detalhes</h2>
      <!-- Novas respostas acumuladas pelo lp:explain entram aqui, em subsections com id próprio:
           <h3 id="detalhes-<slug-do-topico>">Título</h3>
           E uma entrada espelhada deve ir no <aside.toc> aninhada sob "Detalhes". -->
    </section>

    <!-- LP-SECTION:perguntas -->
    <section id="perguntas" data-section="perguntas">
      <h2>Perguntas registradas</h2>
      <ol class="lp-questions">
        <!-- Cada pergunta vira <li> com data-asked-at. -->
      </ol>
    </section>

  </main>

  <footer class="lp-footer">
    <p>Gerado pelo SDD <code>lp:explain</code>. Edite manualmente apenas se souber o que está fazendo — re-execuções podem sobrescrever.</p>
  </footer>
</body>
</html>
