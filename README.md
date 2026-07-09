# SDD — `lp:*` para Claude Code

Spec-driven development em 10 skills. Chunks micro revisáveis, fluxo sequencial por feature, memória autônoma, grilling anti-assunção e revisão guiada de código existente.

## Instalação

```
/plugin marketplace add luanpoppe/sdd
/plugin install lp@sdd
```

Pronto — as skills ficam disponíveis como `lp:init`, `lp:new`, `lp:continue`, `lp:review`, etc.

> O plugin é distribuído via pacote npm [`@luanpoppe/sdd`](https://www.npmjs.com/package/@luanpoppe/sdd). O comando acima registra este repositório como marketplace; a instalação puxa o conteúdo do npm automaticamente. **É necessário que o pacote esteja publicado no npm** para o install funcionar.

## Atualização

O Claude Code checa updates no startup. Para forçar:

```
/plugin marketplace update sdd
/plugin update lp@sdd
```

O update compara a versão instalada com a do npm (`^1.0.0`) e baixa a mais recente. Novas versões saem quando o mantenedor publica um bump semver no npm.

## Skills

| Skill | O que faz |
|---|---|
| `lp:init` | Inicializa o SDD no projeto (`.sdd/config.yaml`, CSS global, preferências). |
| `lp:new` | Abre uma nova mudança com grill anti-assunção. |
| `lp:continue` | Avança 1 passo do fluxo (spec → revisão → tasks → chunks). |
| `lp:review` | Revisão guiada de código existente (walkthrough do fluxo real). |
| `lp:explain` | Gera explicação em HTML de um tópico. |
| `lp:audit` | Detecta divergência entre spec e implementação. |
| `lp:memory` | Gerencia a memória autônoma do SDD. |
| `lp:ask` | Pergunta pontual sobre o estado do SDD. |
| `lp:archive` | Arquiva uma mudança concluída. |
| `lp:help` | Ajuda das skills `lp:*`. |

## Estrutura do repositório

```
sdd/
├── .claude-plugin/
│   ├── marketplace.json   # catálogo (este repo é o marketplace)
│   └── plugin.json        # manifesto do plugin "lp"
├── skills/                # 10 skills (dir + frontmatter name sem prefixo lp-)
├── helpers/
│   ├── prompts/           # prompts compartilhados (grill, memória, state-machine…)
│   └── templates/         # templates de spec/tasks/plan/explain + styles.css
├── package.json           # @luanpoppe/sdd (publicação npm)
├── LICENSE
└── README.md
```

As skills referenciam os arquivos compartilhados por caminho relativo portável (`../../helpers/...`), então funcionam em qualquer máquina onde o plugin for instalado.

## Publicação (mantenedor)

```bash
# 1. bump da versão (semver) nos dois arquivos:
#    package.json  e  .claude-plugin/plugin.json
# 2. publicar no npm (pacote público com escopo):
npm publish --access public
# 3. commitar + tag + push no GitHub:
git add -A && git commit -m "release: vX.Y.Z" && git tag vX.Y.Z && git push --tags
```

## Licença

MIT © Luan Poppe
