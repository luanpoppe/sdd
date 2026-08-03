<!DOCTYPE html>
<html lang="{{lang}}">
<head>
  <meta charset="UTF-8">
  <title>Tasks: {{feature_slug}} — {{change_id}}</title>
  <link rel="stylesheet" href="../../../../assets/styles.css">
</head>
<body>
  <header class="lp-header">
    <p class="lp-breadcrumb"><a href="../../plan.html">{{change_id}}</a> / specs / <strong>{{feature_slug}}</strong> / tasks</p>
    <h1>Tasks: {{feature_slug}}</h1>
    <p class="lp-meta">Atualizado em {{updated}}</p>
  </header>

  <main class="lp-main">
    <!-- Espelha o tasks.md. Um bloco por chunk, na ordem. Reflita o status: pendente / em revisão / concluído. -->

    <!-- Exemplo de um chunk: -->
    <section class="lp-chunk" data-chunk="F1.C1" data-status="pending">
      <h2>F1.C1 — {{chunk_title}} <span class="lp-status">[pendente]</span></h2>
      <ul class="lp-chunk-meta">
        <li><strong>Arquivos:</strong> <code>a.ts</code>, <code>b.ts</code></li>
        <li><strong>Depende de:</strong> nenhum</li>
        <li><strong>Ordem de revisão:</strong> 1) <code>a.ts</code> → 2) <code>b.ts</code></li>
      </ul>
      <p><strong>Faz:</strong> {{chunk_summary}}</p>
      <p><strong>Validação:</strong> <code>{{validation_cmd}}</code></p>
    </section>
    <!-- data-status: pending | in-review | done — espelha os checkboxes do .md -->
  </main>

  <footer class="lp-footer">
    <p>Gerado pelo SDD <code>lp:continue</code>. Espelho HTML do <code>tasks.md</code> (fonte é o .md).</p>
  </footer>
</body>
</html>
