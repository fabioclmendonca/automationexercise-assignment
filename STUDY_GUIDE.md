# Guia de Estudo — Como dominar este projeto

> Documento de uso pessoal, para você estudar e conseguir explicar esta
> solução com confiança (ex.: numa entrevista). Não faz parte do
> entregável formal do assignment — por isso está em português, diferente
> dos demais documentos do repositório (`README.md`, `docs/*.md`), que
> permanecem em inglês por serem parte da entrega.

## Objetivo

Depois de seguir este guia, você deve conseguir: (1) explicar cada decisão
de arquitetura sem olhar o código, (2) descrever o que cada teste prova e
por quê, e (3) responder perguntas de entrevistador sobre estratégia,
qualidade e tradeoffs apontando para evidências concretas no repositório.

## Roteiro de estudo (siga nesta ordem)

### Passo 0 — Recapitular o enunciado e as regras do jogo

Releia os 5 requisitos do assignment (estratégia, API, E2E, execução/CI,
exploratório) e o arquivo `CLAUDE.md`. O `CLAUDE.md` é a peça-chave: quase
toda decisão de arquitetura do projeto é uma resposta direta a uma regra
dele (ex.: "não crie uma abstração sem um problema concreto"). Se você
entender o `CLAUDE.md`, entende o "porquê" por trás de tudo o que vem
depois.

### Passo 1 — A big picture: `docs/test-strategy.md`

Este é o documento mais importante para uma entrevista. Leia com atenção:
- A seção **"Priorities and rationale"** — por que auth/cart vêm antes de
  product details, por que checkout para na "safe boundary".
- A tabela **"API vs E2E coverage decisions"** — a regra geral no final dela
  ("don't duplicate the same assertion at both layers without a reason") é
  a frase que resume toda a filosofia do projeto.
- **"Key risks"** e **"Assumptions"** — note que os riscos não são
  genéricos: cada um tem uma evidência real por trás (ex.: o risco de
  poluição de dados foi *comprovado*, não suposto — ver Passo 7).

### Passo 2 — Configuração: como o framework é montado

Leia, nesta ordem: `playwright.config.ts`, `tsconfig.json`, `package.json`.
Preste atenção em:
- Os **4 `projects`**: `api` (sem browser, `baseURL` = API) e
  `chromium`/`firefox`/`webkit` (escopados a `tests/e2e`). Isso é o que
  permite `npm run test:api` e `npm run test:e2e` sem nenhuma lógica
  customizada de separação — é o mecanismo nativo do Playwright.
- `strict: true` no `tsconfig.json` — mencionado explicitamente como
  não-negociável no `CLAUDE.md`.
- Os scripts do `package.json` — saiba explicar o que cada um faz sem
  precisar rodar.

### Passo 3 — O padrão de Page Object

Leia `pages/HomePage.ts` primeiro — é o mais simples e o "modelo" que os
outros seguem. Depois leia os outros 4 (`SignupLoginPage`, `ProductsPage`,
`ProductDetailPage`, `CartPage`). Em cada um, observe:
- **O que expõem**: locators (`readonly ... : Locator`) e ações (métodos
  `async`), sempre via `getByRole`/`getByLabel` ou, quando não há
  alternativa semântica boa, um `data-qa` ou seletor CSS estável.
- **O que NÃO expõem**: nenhum `expect()` dentro da classe. As asserções
  ficam sempre no arquivo de teste. Esse é um dos pontos que mais vale a
  pena saber explicar — é uma escolha deliberada, documentada no skill
  `typescript-playwright-standards`.
- Por que existem exatamente esses 5 (nenhum a mais): cada um mapeia para
  uma página/estado real que pelo menos um teste concreto precisa. Não há
  um Page Object "especulativo".

### Passo 4 — Como os testes recebem os Page Objects: `fixtures/fixtures.ts`

Arquivo pequeno, mas conceitualmente importante. Ele usa `test.extend` do
Playwright para injetar `homePage`, `signupLoginPage`, `productsPage`,
`productDetailPage` e `cartPage` como parâmetros que qualquer teste E2E pode
simplesmente "pedir" na assinatura da função de teste (desestruturação),
sem precisar instanciar nada manualmente. Note o comentário no topo do
arquivo — ele documenta que essa fixture cresceu de 1 para 5 Page Objects de
forma orgânica, não foi projetada assim desde o início.

### Passo 5 — Testes de API (nesta ordem, do mais simples ao mais completo)

1. `tests/api/smoke.spec.ts`
2. `tests/api/products-brands.spec.ts`
3. `tests/api/search.spec.ts`
4. `tests/api/login-negative.spec.ts`
5. `tests/api/account-lifecycle.spec.ts`

Em todos eles, a coisa mais importante a entender é o padrão repetido:
`expect(response.status()).toBe(200)` **seguido de**
`expect(body.responseCode).toBe(...)`. Isso não é redundância — é a resposta
direta a uma característica real da API (ver Passo 7, achado F4): ela
**sempre** responde HTTP 200, mesmo em erro, e codifica o resultado real
dentro do JSON. Um teste que checasse só o status HTTP passaria mesmo
quando a chamada falhou de verdade. Saiba explicar isso de cabeça — é
provavelmente a pergunta técnica mais provável sobre a camada de API.

### Passo 6 — Testes E2E (mesma lógica, do mais simples ao mais completo)

1. `tests/e2e/smoke.spec.ts`
2. `tests/e2e/registration.spec.ts`
3. `tests/e2e/product-details.spec.ts`
4. `tests/e2e/cart.spec.ts`
5. `tests/e2e/checkout-gating.spec.ts`

Preste atenção especial aos dois testes que usam `test.fail()` (um em
`cart.spec.ts`, outro em `product-details.spec.ts`) — eles são diferentes de
todos os outros e merecem uma explicação própria (ver seção "Explicação
breve de cada teste" abaixo e o Glossário).

### Passo 7 — Conectar os achados exploratórios aos testes: `docs/exploratory-testing.md`

Leia o charter e os 5 achados (F1 a F5). Depois volte ao código e ache, via
busca de texto, cada `finding F` citado nos comentários dos testes — isso
mostra a você (e a um entrevistador) que a exploração não foi um exercício
isolado: ela **gerou** dois testes automatizados reais (F1 e F3) e
justificou decisões de design em outros dois (F4 → padrão `responseCode`;
F5 → dados únicos por execução, nunca reaproveitar e-mails "óbvios").

### Passo 8 — Rodar tudo na prática

```bash
npm install
npx playwright install
npm run test:ui       # explore visualmente cada teste, passo a passo
npm run test:api      # 11 testes, todos verdes
npm run test:e2e      # 7 testes x 3 browsers = 21 execuções
npm run typecheck
```

No `test:ui`, rode especificamente os dois testes com `test.fail()` e
observe como o relatório os marca — é diferente de um teste comum passando
ou falhando, e vale ver isso com os próprios olhos antes de explicar para
alguém.

### Passo 9 — Exercício de fixação

Sem olhar o código, tente responder em voz alta:
- Por que não existe um `BrowserFactory`, um `ApiClient` genérico ou uma
  `BasePage`?
- Por que `account-lifecycle.spec.ts` é um único teste com `test.step`, em
  vez de vários testes separados?
- Por que o cleanup de conta no `finally` não tem `expect()`?
- Por que os testes de `registration` e `account-lifecycle` cada um gera seu
  próprio e-mail único, em vez de compartilhar um helper?

Se você travar em alguma, volte à seção correspondente do
`docs/test-strategy.md` ou `docs/implementation-plan.md` — a justificativa
de cada uma está escrita lá.

## Explicação breve de cada teste

### API (`tests/api/`) — 11 testes, todos no project `api` (sem browser)

| Arquivo | Teste | O que prova |
|---|---|---|
| `smoke.spec.ts` | GET `/productsList` retorna produtos com `responseCode` de sucesso | Teste original da fundação do framework — prova que a pipeline de API (config, `baseURL`, asserção de dois níveis) funciona ponta a ponta. Mantido mesmo depois da cobertura "de verdade" existir. |
| `products-brands.spec.ts` | GET `/productsList` retorna catálogo com `responseCode` de sucesso | Contrato positivo de um endpoint somente-leitura, invisível na UI. |
| `products-brands.spec.ts` | POST `/productsList` não é suportado | Contrato negativo: método errado deve ser rejeitado (via `responseCode` 405, já que o HTTP status não ajuda aqui). |
| `products-brands.spec.ts` | GET `/brandsList` retorna catálogo de marcas | Mesmo raciocínio do primeiro, para o outro endpoint somente-leitura. |
| `products-brands.spec.ts` | PUT `/brandsList` não é suportado | Contrato negativo equivalente para `brandsList`. |
| `search.spec.ts` | POST `/searchProduct` com termo retorna produtos | Contrato positivo da busca — parâmetro presente e válido. |
| `search.spec.ts` | POST `/searchProduct` sem parâmetro é rejeitado | Contrato negativo — validação de parâmetro obrigatório (`responseCode` 400). |
| `login-negative.spec.ts` | POST `/verifyLogin` sem parâmetros obrigatórios | Validação de campos obrigatórios ausentes (400). |
| `login-negative.spec.ts` | POST `/verifyLogin` com credenciais inexistentes | Caminho de "usuário não encontrado" (404) — usa um e-mail gerado na hora, nunca uma string "óbvia", para não esbarrar no achado F5 (dados de terceiros no dataset compartilhado). |
| `login-negative.spec.ts` | DELETE `/verifyLogin` não é suportado | Contrato negativo de método, mesmo padrão dos outros endpoints. |
| `account-lifecycle.spec.ts` | Ciclo completo: criar → consultar → logar → atualizar → confirmar atualização → apagar | Único teste que exercita um login **real** e um ciclo CRUD completo de conta. Estruturado como **um teste sequencial** com `test.step` por etapa (não vários testes separados) porque cada etapa depende do estado criado na anterior — a alternativa seria estado mutável compartilhado entre testes, que o projeto evita deliberadamente. O `deleteAccount` de limpeza roda em `finally` sem `expect()` (best-effort), enquanto a etapa que realmente prova que a exclusão funcionou fica dentro do `try`, como último passo do caminho feliz. |

### E2E (`tests/e2e/`) — 7 testes, cada um rodado em chromium + firefox + webkit

| Arquivo | Teste | O que prova |
|---|---|---|
| `smoke.spec.ts` | Home carrega e mostra a seção "Features Items" | Teste original da fundação — prova que a pipeline E2E (browser, `baseURL`, Page Object, fixture) funciona ponta a ponta. Mantido junto com a cobertura real. |
| `registration.spec.ts` | Cadastro → formulário de conta → "Account Created!" → header mostra "Logged in as ..." → a própria conta é apagada no final | Único teste que prova a jornada completa de cadastro multi-etapa e o estado de sessão refletido na UI — algo que nenhuma chamada de API sozinha prova. Faz sua própria limpeza (apaga a conta que criou) para não poluir o site público compartilhado. |
| `product-details.spec.ts` | Buscar um produto pelo nome capturado da listagem e conferir que a página de detalhes mostra o mesmo nome/preço | Cobre descoberta de produto (busca) e a página de detalhes numa única jornada, sem fixar conteúdo do catálogo (usa um nome capturado dinamicamente, não um valor fixo — o catálogo pode mudar). |
| `product-details.spec.ts` | **[`test.fail()`]** Produto com ID inexistente não dá nenhum sinal de "não encontrado" | Regressão do achado exploratório **F3**: a página renderiza em branco com HTTP 200 em vez de um estado claro de erro. `test.fail()` documenta esse defeito conhecido como "esperado falhar hoje" — se o site for corrigido, o teste passa a passar inesperadamente, o que aparece como sinal visível no relatório (em vez de simplesmente sumir). |
| `cart.spec.ts` | Adicionar produto com quantidade realista (2) e conferir nome/quantidade/total na página do carrinho | Cobre a área de maior risco identificada na estratégia (carrinho não tem nenhuma cobertura possível via API). |
| `cart.spec.ts` | **[`test.fail()`]** Adicionar quantidade negativa (-5) deveria resultar em total não-negativo | Regressão do achado exploratório **F1**: o carrinho aceita quantidade negativa e calcula um total negativo. Mesmo padrão do teste anterior — documenta o defeito sem "normalizá-lo" como comportamento correto. |
| `checkout-gating.spec.ts` | Visitante sem login, com item no carrinho, tenta finalizar compra | Confirma que o site exibe um modal de login/cadastro (`#checkoutModal`) em vez de deixar prosseguir — comportamento confirmado via `curl` antes de escrever o teste, não assumido. Cobre checkout até o limite seguro definido na estratégia (sem completar uma compra fake). |

## Perguntas prováveis de entrevista (e onde buscar a resposta)

A seção "What We Evaluate" do enunciado lista exatamente os temas que
provavelmente vão virar perguntas. Para cada um, o material já existe —
seu trabalho é estudá-lo, não decorar uma resposta pronta:

- **"Como você priorizou o que testar?"** → `docs/test-strategy.md`,
  seção "Priorities and rationale". Saiba explicar por que cart e auth
  vêm antes de product details, e por que isso não é uma ordem arbitrária.
- **"Como você decide API vs E2E?"** → mesma doc, seção "API vs E2E
  coverage decisions" + a regra geral no final da tabela.
- **"Por que essa arquitetura e não uma mais 'robusta'?"** → seção
  "Architecture decisions" em `docs/test-strategy.md` (BrowserFactory,
  ApiClient, BasePage, ESLint) — cada "não" tem um "porque" ao lado.
- **"Como você garante que os testes são estáveis?"** → dados únicos por
  execução (timestamps nos e-mails), sem asserções sobre conteúdo fixo do
  catálogo, `normalize()` para lidar com espaçamento inconsistente vindo de
  scripts de anúncio de terceiros (ver `product-details.spec.ts` e
  `cart.spec.ts`).
- **"Fale sobre seu processo de teste exploratório."** →
  `docs/exploratory-testing.md` inteiro — charter, achados, severidade. Two
  desses achados (F1, F3) viraram testes automatizados reais.
- **"Que tradeoffs você fez?"** → seção "Intentional exclusions" e
  "Residual risk" em `docs/test-strategy.md`, mais a decisão de não
  compartilhar um data-builder entre API e E2E (documentada em
  `docs/implementation-plan.md`).

## Glossário rápido

- **Fixture (Playwright)**: mecanismo de injeção de dependência nativo do
  Playwright Test. `test.extend` permite declarar algo (ex.: um Page
  Object já instanciado) que qualquer teste pode "pedir" apenas
  desestruturando o parâmetro da função — sem `new` manual, sem import
  extra.
- **Page Object**: uma classe que encapsula os locators e ações de uma
  página/fluxo de UI, para que os testes leiam como uma sequência de ações
  de negócio, não como uma lista de seletores CSS.
- **`APIRequestContext`**: a API do Playwright para fazer chamadas HTTP
  diretamente (sem browser) — é o que a fixture nativa `request` expõe, e é
  o que os testes em `tests/api/` usam.
- **`test.step`**: agrupa um bloco de ações dentro de um teste com um nome
  legível, aparecendo como uma sub-etapa no relatório — usado em
  `account-lifecycle.spec.ts` e `registration.spec.ts` para deixar um teste
  sequencial de várias etapas legível sem precisar virar vários testes
  separados.
- **`test.fail()`**: anotação do Playwright que marca o teste inteiro como
  "espera-se que falhe". Diferente de pular (`test.skip`) — o teste ainda
  roda de verdade; se ele passar inesperadamente, isso aparece como sinal
  no relatório (útil para documentar um defeito conhecido sem escondê-lo
  nem fingir que é comportamento correto).
- **`responseCode` vs status HTTP**: a API deste site sempre responde HTTP
  200, mesmo em erro — o resultado real (200, 400, 404, 405...) vem dentro
  do corpo JSON, no campo `responseCode`. Todo teste de API deste projeto
  lê esse campo, nunca confia só no status HTTP.
