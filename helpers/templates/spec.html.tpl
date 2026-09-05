<!DOCTYPE html>
<html lang="{{lang}}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Spec: {{feature_slug}} — {{change_id}}</title>
  <link rel="stylesheet" href="../../../../assets/styles.css">
</head>
<body>
  <aside class="toc">
    <p class="toc-title">Índice</p>
    <ol>
      <li><a href="#resumo">Resumo</a></li>
      <li><a href="#requirements">Requirements</a></li>
      <li><a href="#edge-cases">Edge cases</a></li>
      <!-- A linha abaixo só entra se a seção "Contratos expostos" existir no spec.md. -->
      <li><a href="#contratos-expostos">Contratos expostos</a></li>
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
      <summary><h2>Requirements</h2></summary>
      <!--
        Espelha o spec.md, que mistura dois formatos na mesma lista numerada:
        - BDD (há ator externo): <h3> título + bloco Dado/Quando/Então (Given/When/Then),
          com uma afirmação por <li> — as seguintes começam com "E" ("And"), nunca
          empilhadas com ponto e vírgula na mesma linha. Duas partes que são mesmo da
          mesma linha (valor e motivo, resultado e ressalva) vão separadas por
          "&nbsp;||&nbsp;", nunca por ";".
        - Entrada/Saída (comportamento interno): <h3> título + Entrada/Saída/Erro, com o
          valor literal em <code>. Payload longo em <pre><code>.
        A numeração é contínua entre os dois — não separe em duas listas.
      -->
    </details>

    <details class="lp-sec" id="edge-cases" open>
      <summary><h2>Edge cases</h2></summary>
      <ul><!-- <li> por caso --></ul>
    </details>

    <!--
      Bloco CONDICIONAL: só gere se o spec.md desta feature tem a seção "Contratos
      expostos". Feature sem borda externa não leva o bloco vazio — nem aqui, nem
      no índice acima. Espelhe o .md: referência a arquivo em <code>, e <pre><code>
      só no caso de contrato novo que ainda não tem arquivo para apontar.
    -->
    <details class="lp-sec" id="contratos-expostos" open>
      <summary><h2>Contratos expostos</h2></summary>
      <!-- endpoints, eventos, colunas, assinatura pública — por referência ao arquivo -->
    </details>
  </main>

  <footer class="lp-footer">
    <p>Gerado pelo SDD <code>lp:continue</code>. Espelho HTML do <code>spec.md</code> (fonte é o .md).</p>
  </footer>
</body>
</html>
