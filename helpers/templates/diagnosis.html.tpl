<!DOCTYPE html>
<html lang="{{lang}}">
<head>
  <meta charset="UTF-8">
  <title>Diagnóstico: {{title}} — {{change_id}}</title>
  <link rel="stylesheet" href="../../assets/styles.css">
</head>
<body>
  <aside class="toc">
    <p class="toc-title">Índice</p>
    <ol>
      <li><a href="#resumo">Resumo</a></li>
      <li><a href="#sintomas">Sintomas e reprodução</a></li>
      <li><a href="#investigacao">Investigação</a></li>
      <li><a href="#causa">Causa raiz</a></li>
      <li><a href="#impacto">Impacto</a></li>
    </ol>
  </aside>

  <header class="lp-header">
    <p class="lp-breadcrumb"><strong>{{change_id}}</strong> / diagnóstico</p>
    <h1>Diagnóstico: {{title}}</h1>
    <p class="lp-meta">Bug · atualizado em {{updated}} · opções em <a href="solutions.html">solutions.html</a></p>
  </header>

  <main class="lp-main">
    <!-- Espelha o diagnosis.md. Cada seção é um <details class="lp-sec" open> colapsável. -->

    <details class="lp-sec" id="resumo" open>
      <summary><h2>Resumo</h2></summary>
      <p>{{resumo}}</p>
    </details>

    <details class="lp-sec" id="sintomas" open>
      <summary><h2>Sintomas e reprodução</h2></summary>
      <ul>
        <li><strong>Sintoma</strong>: {{sintoma}}</li>
        <li><strong>Esperado</strong>: {{esperado}}</li>
        <li><strong>Reprodução</strong>: {{passos_repro}}</li>
        <li><strong>Escopo</strong>: {{escopo}}</li>
      </ul>
    </details>

    <details class="lp-sec" id="investigacao" open>
      <summary><h2>Investigação</h2></summary>
      <!-- A EVIDÊNCIA: <ul> com UMA LINHA por passo, formato "<code>arquivo:linha</code> — fato" (~12-15 palavras). SEM "olhei/constatei". NÃO reconte o código do ponto. Só o que sustenta a causa. -->
    </details>

    <details class="lp-sec" id="causa" open>
      <summary><h2>Causa raiz</h2></summary>
      <!-- SÍNTESE pura em 1-3 frases: por que o bug acontece, amarrando a evidência. PROIBIDO repetir fato ou arquivo:linha já dito na Investigação — se a frase reexplica um bullet, corte. Nada de propor correção (vai pro solutions.html). -->
    </details>

    <details class="lp-sec" id="impacto" open>
      <summary><h2>Impacto</h2></summary>
      <ul>
        <li><strong>Afeta</strong>: {{impacto}}</li>
        <li><strong>Risco de não corrigir</strong>: {{risco}}</li>
      </ul>
    </details>
  </main>

  <footer class="lp-footer">
    <p>Gerado pelo SDD <code>lp:bug-fix</code>. Espelho HTML do <code>diagnosis.md</code> (fonte é o .md).</p>
  </footer>
</body>
</html>
