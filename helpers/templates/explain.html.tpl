<!DOCTYPE html>
<html lang="{{lang}}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{theme}} — SDD explain</title>
  <link rel="stylesheet" href="./assets/styles.css">
</head>
<!-- `data-status` é a VERDADE do estado da fila de estudo: "aberto" ou "estudado".
     O banco é índice derivado disto, e com `mcp: off` esta é a única fonte. -->
<body data-status="aberto">
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
    <p class="lp-breadcrumb">SDD / explain / <strong>{{theme}}</strong></p>
    <h1>{{theme}}</h1>
    <p class="lp-meta">Iniciado em {{created}} · última atualização {{updated}} · status <strong>aberto</strong></p>
  </header>

  <main class="lp-main">

    <!-- LP-SECTION:overview — cada seção é um <details> colapsável -->
    <details class="lp-sec" id="overview" data-section="overview" open>
      <summary><h2>Visão geral</h2></summary>
      <p>{{overview}}</p>
    </details>

    <!-- LP-SECTION:detalhes -->
    <details class="lp-sec" id="detalhes" data-section="detalhes" open>
      <summary><h2>Detalhes</h2></summary>
      <!-- Novas respostas acumuladas pelo lp:explain entram aqui, em subsections com id próprio:
           <h3 id="detalhes-<slug-do-topico>">Título</h3>
           E uma entrada espelhada deve ir no <aside.toc> aninhada sob "Detalhes". -->
    </details>

    <!-- LP-SECTION:perguntas -->
    <details class="lp-sec" id="perguntas" data-section="perguntas" open>
      <summary><h2>Perguntas registradas</h2></summary>
      <!-- Cada pergunta vira um <li> com a data e a ORIGEM — o projeto e a mudança de onde
           ela veio, ou "fora de projeto". O tema é global e acumula perguntas de
           repositórios diferentes; sem a origem, ninguém reconstrói o contexto depois:
           <li data-asked-at="2026-09-05" data-origin="the-right-movie-choice / guest-quota">
             <p class="lp-question">Como o refresh silencioso decide a hora de renovar?</p>
             <p class="lp-origin">the-right-movie-choice · guest-quota · 2026-09-05</p>
           </li> -->
      <ol class="lp-questions">
      </ol>
    </details>

  </main>

  <footer class="lp-footer">
    <p>Gerado pelo SDD <code>lp:explain</code>. Base global em <code>~/.sdd/explain/</code>, fora de qualquer repositório. Edite manualmente apenas se souber o que está fazendo — re-execuções podem sobrescrever.</p>
  </footer>
</body>
</html>
