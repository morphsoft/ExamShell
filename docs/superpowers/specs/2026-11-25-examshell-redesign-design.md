# ExamShell: redesenho visual e celular

Data: 2026-11-25
Status: aprovado (2026-11-25)
Base: o site do Rank 02 já publicado (spec `2026-11-25-examshell-rank02-design.md`). Este documento muda a interface. O motor, a correção e o conteúdo continuam como estão.

Protótipos de referência (fonte da verdade visual):
- `docs/superpowers/specs/prototypes/inicio-preparacao.html` (início + lista)
- `docs/superpowers/specs/prototypes/exercicio.html` (tela do exercício, treino e simulado, celular)

## 1. Intenção e o porquê

O site funciona, mas a tela inicial e a lista ficaram feias e pouco intuitivas. A tela do exercício, que o autor gostou, pede ajustes. O autor também quer que dê para **programar pelo celular**, para dar versatilidade aos cadetes.

O redesenho deixa o site mais amigável e convidativo, com uma gamificação leve, sem perder a lógica da prova.

A lógica da prova é esta: no Rank 02 cai **um exercício sorteado de cada um dos 4 níveis**. Não existe ordem de lições. O que importa é estar pronto para qualquer exercício de cada nível.

## 2. Objetivos, não-objetivos e anti-objetivos

### Objetivos
- **Novo início, que também é a lista.** A estrutura é a da prova: preparação por nível, "sortear um do nível N", "simular a prova" em destaque e "continuar de onde parou". A lista mostra os 57 exercícios por nível, com descrição curta, busca e filtros.
- **Nova tela do exercício**, na mesma linguagem visual, com os ajustes da revisão: enunciado legível, resultado atual em destaque, dicas junto da falha e o próximo passo ao passar.
- **Simulado com cara própria:** tela de início com as regras, barra da sessão (níveis, relógio, ações) e um resumo com nomes.
- **Celular como lugar de programar de verdade:** abas enunciado · código · resultado, uma barra de símbolos acima do teclado e rodar/grademe sempre à mão.
- **Tema claro e escuro**, que segue o sistema, com um botão para trocar.
- **Gamificação leve:** sequência de dias, status de preparação por nível em palavras e uma comemoração discreta ao passar.

### Não-objetivos
- XP, pontos, "vidas", níveis bloqueados, ordem obrigatória de exercícios.
- Contas, sincronização entre aparelhos, ranking entre cadetes.
- Meta diária (o autor não pediu; fica de fora).
- Divisórias arrastáveis entre os painéis (item E7 da revisão; fica para depois).

### Anti-objetivos
- **Parecer o Duolingo**, ou qualquer app conhecido: nada de mascote, marca ou trilha de lições. Uma primeira versão nessa linha foi rejeitada por "quebrar como o exame funciona".
- **Punir erro.** Errar não custa nada. A sequência de dias quebrada só convida a recomeçar.
- **Esconder a lógica da prova.** O sorteio por nível e o simulado são as ações principais.
- **Mudar a fidelidade do conteúdo.** O enunciado em inglês continua com o texto real. Só a apresentação muda: os parágrafos se ajustam à largura e os exemplos ficam em bloco.

## 3. Decisões do autor (desta conversa)

- **Início:** a direção "preparação por nível" (protótipo `inicio-preparacao.html`, "gostei mais desse").
- **Exercício:** o protótipo `exercicio.html` ("gosto bastante dessa tela").
- **Rejeitadas:**
  - terminal puro (A);
  - mapa de níveis em quadradinhos (B: "a ideia é boa, a execução falha");
  - trilha/teclado ("muito cibernético e pouco intuitivo");
  - trilha estilo Duolingo ("muito Duolingo e quebra como o exame funciona").
- **Do formato trilha, só o vertical do celular:** níveis empilhados e itens fáceis de tocar.
- **Gamificação leve:** sim. Programar no celular: sim.

## 4. Abordagens consideradas

| Abordagem | Resultado |
|---|---|
| A · Terminal de prova (menu de atalhos, tabela estilo `ls`) | Rejeitada: denso e "cibernético" |
| B · Mapa de níveis (quadradinhos por exercício) | Ideia aprovada, execução rejeitada |
| B' · Trilha vertical / teclado (protótipos clicáveis) | Rejeitada: "cibernético, pouco intuitivo" |
| C · Painel limpo (cartões) | Não escolhida |
| D · Trilha de lições estilo app de idioma | Rejeitada: impõe uma ordem que a prova não tem |
| **E · Preparação por nível** (níveis como na prova, sortear, simular, gamificação leve) | **Escolhida** |

## 5. Linguagem visual (sistema de design)

O sistema vem do protótipo e substitui `src/ui/theme.css`.

- **Fontes:**
  - **Manrope** (500/600/700/800) na interface e nos textos;
  - **JetBrains Mono** (400/500/700) só para nomes de exercício, código, terminal e argumentos, sempre **sem ligaduras** (`font-variant-ligatures: none`; `liga`/`calt` 0).
  - As fontes ficam hospedadas no próprio site (pacotes `@fontsource`), nada de Google Fonts.
- **Tokens de cor:**
  - os valores exatos estão no `:root` e nos blocos escuros dos protótipos;
  - os nomes são: `--bg --surface --raise --line --line-2 --ink --muted --soft --accent --accent-ink --accent-soft --on-accent --ok --bad --warn` (com `-soft`), cores de código `--code-bg --code-ln --kw --str --num --com`, `--term-bg`, e cores por nível `--l1..--l4` com `--l1s..--l4s`.
- **Tema:**
  - o claro está no `:root`;
  - o escuro fica em `@media (prefers-color-scheme: dark) :root:not([data-theme="light"])` e em `:root[data-theme="dark"]`;
  - o botão de sol/lua grava `settings.theme` (`'system' | 'light' | 'dark'`) e põe ou tira o `data-theme` no `<html>`;
  - o padrão é `'system'`.
- **Formas:**
  - raio de 10–16px nos cartões, 999px nas etiquetas;
  - sombra suave (`--shadow`);
  - botões com borda de 10px de raio; o primário é preenchido com `--accent`.
- **Cores dos níveis:** só em detalhes (selo do número, barra de progresso, botão de sortear). Nunca como fundo de tela.

## 6. Telas

### 6.1 Início, que também é a lista (rota `#/`; `#/treino` passa a ser a mesma tela)

Siga `inicio-preparacao.html`. Em ordem:

1. **Topo fixo:**
   - marca (`>_` + "examshell" + "rank 02");
   - navegação início · exercícios · simulado;
   - sequência de dias ("3 dias");
   - total de passados ("5/57 passaram");
   - botão de tema.
2. **Título "Bora treinar para o Rank 02"**, com o subtítulo que explica a prova: um sorteado de cada nível.
3. **Dois cartões:**
   - **Continuar de onde parou:** o último exercício aberto no treino, o nível, "na última tentativa passou em X de N testes" com uma barrinha por teste, "Abrir <id>" e "Sortear outro do nível N".
   - Se ainda não houver exercício aberto, o cartão vira um convite: "Comece pelo nível 1" com "Sortear um do nível 1".
   - **Simular a prova:** cartão de destaque, com "4 níveis · relógio de 3h · dicas liberadas" e "Começar simulado". Se houver sessão em andamento, vira "Continuar simulado · nível N · tempo restante".
4. **Sua preparação:** um item por nível com:
   - o número passado/total;
   - uma barra (passou cheio, tentou em tom claro);
   - o status em palavras: 0 → "ainda não começou"; < 1/3 → "começando"; < 2/3 → "pegando o jeito"; < 1 → "quase pronto"; = 1 → "pronto para a prova".
   - Clicar rola até o nível.
5. **Busca e filtro:** campo "Buscar exercício" (procura no nome e na descrição) e o seletor Todos · Faltam · Já passei.
6. **Seção por nível:**
   - selo com o número na cor do nível;
   - "Nível N · <título>", com o subtítulo;
   - progresso em texto e barra;
   - botão **"Sortear um do nível N"**;
   - grade de exercícios: 3 colunas no desktop, 2 no tablet, 1 no celular.
   - Cada item mostra o círculo de status (passou ✓ preenchido, tentou tracejado, novo vazio), o nome em mono, a etiqueta programa/função e a descrição curta.
   - Aparecem os 6 primeiros e "Ver todos os N do nível". Com busca ou filtro ativo, aparecem todos.
7. **Detalhe do exercício** (modal centralizado no desktop, folha que sobe de baixo no celular):
   - nível e tipo, o nome, a descrição;
   - etiquetas: testes, arquivo, permitidas, status;
   - "Começar", "Continuar" ou "Praticar de novo", e "Fechar".
   - Quando veio do sorteio, aparece o selo "caiu no sorteio", e "Fechar" vira "Sortear outro".
   - O sorteio escolhe entre os exercícios do nível ainda não passados; se todos já passaram, sorteia entre todos.

**Títulos dos níveis:**
1. Primeiros passos · strings, write e laços
2. Strings e bits · funções da libc, bits e malloc
3. Números e listas · matemática, bases e listas encadeadas
4. Algoritmos · split, ordenação e flood fill

### 6.2 Tela do exercício (`#/treino/<id>`, e dentro do simulado)

Siga `exercicio.html`.

- **Topo:**
  - voltar (com a marca);
  - etiqueta de nível ("nível 1" no treino, "nível 1 de 4" no simulado);
  - nome em mono e o tipo;
  - status: "ainda não passou · tentativa N", "passou ✓" ou "novo";
  - botão de tema.
- **Enunciado** (coluna esquerda no desktop):
  - etiquetas: arquivo, permitidas (sem funções, mostra "nenhuma"), número de testes;
  - seletor **EN | PT**, que lembra a escolha;
  - os parágrafos de prosa se ajustam à largura (as linhas de um mesmo parágrafo se juntam);
  - os blocos de código e os exemplos `$>` ficam num bloco de terminal: o `$>` em destaque, o comando em `--ink`, a saída em `--muted`;
  - o texto de cada língua não muda, só a apresentação.
- **Editor** (CodeMirror, como hoje):
  - abas: arquivos esperados, depois os fornecidos "(fornecido)" somente leitura, depois "main.c (rascunho)" nos exercícios de função;
  - ações "recomeçar" (pede confirmação na própria tela) e "vim";
  - o tema do editor segue os tokens de código.
- **Barra de rodar:**
  - `$> ./<id>` + campo de argumentos + Rodar + Grademe, com os atalhos nos botões: Ctrl/Cmd+Enter = grademe, Ctrl/Cmd+Shift+Enter = rodar;
  - nos exercícios de função sem rascunho, uma linha visível: "para rodar, escreva um main na aba main.c (rascunho)" + **"gerar main de exemplo"**;
  - esse botão preenche o rascunho com um `main` que só chama a função com o 1º exemplo do enunciado e imprime o retorno. Ele **não contém a solução**.
- **Terminal / resultado:**
  - cada "rodar" mostra o comando e a saída (com `$` no fim da linha);
  - o grademe mais recente vira um cartão:
    - **falhou:** título "✗ Falhou no teste k de N"; uma bolinha por teste (verde = passou, vermelha = a que falhou, cinza = não rodou); o comando ou a chamada; esperado e recebido com o 1º caractere diferente destacado; ou a explicação do erro de compilação, da função proibida, do main, do travamento com "na linha L de <arquivo>" ou do tempo esgotado;
    - **faixa de dica embaixo:** "Pedir dica" → "Dica 1 de 3 · …" + "Próxima dica (2/3)";
    - **passou:** "✓ Passou nos N testes" + uma frase de incentivo com o progresso do nível ("Nível 1 agora está em 6 de 12") + **"Sortear outro do nível N"** e "Voltar ao início" (no simulado, só "Ir para o nível N+1" ou "Ver resumo");
  - os cartões de grademes anteriores viram uma linha recolhida ("▸ grademe anterior: …"), que expande ao clicar;
  - o terminal rola sozinho para o resultado novo.
- **Ao passar:** um aviso discreto (toast) com o progresso do nível. Respeita o movimento reduzido.

### 6.3 Simulado

- **Tela de início** (`#/aleatorio` sem sessão): explica as regras em 2 frases (um sorteado de cada nível; o relógio de 3h só informa; dá para trocar, pular e pedir dicas) e tem "Começar simulado (o relógio começa agora)". Com sessão em andamento, entra direto nela.
- **Barra da sessão** (abaixo do topo, fora do enunciado):
  - 4 marcadores de nível: atual preenchido, passou em `--ok`, pulado em `--warn`, futuros vazios;
  - relógio grande em mono, "restantes", em `--warn` nos últimos 30 min e "tempo esgotado, mas pode continuar" depois;
  - ações "Sortear outro" (só depois de uma falha, como hoje), "Pular nível" e "Encerrar" (com confirmação na própria tela);
  - link "Sair (a sessão continua)".
- **Resumo:**
  - por nível: o exercício que passou, ou "pulado", "parou aqui", "não chegou";
  - os exercícios trocados **com os nomes**, tentativas, dicas e tempo;
  - "Treinar <id>" para cada um trocado ou pulado;
  - total e uma frase de incentivo.
- **Progresso:** passar no simulado também marca o exercício como passado no progresso do treino. Tentar marca como tentado.

### 6.4 Celular (≤ 820px)

- **Início:** tudo empilhado; os cartões em uma coluna; barra de navegação fixa embaixo (início · exercícios · simulado).
- **Exercício:**
  - **abas fixas no topo:** Enunciado · Código · Resultado;
  - **rodapé fixo** com Rodar e Grademe em largura total;
  - **na aba Código, a barra de símbolos** fica logo acima do rodapé (ou do teclado, quando ele está aberto): `{ } ( ) [ ] ; * & ' " \ | <` e `tab`. Cada tecla insere o caractere na posição do cursor do CodeMirror sem fechar o teclado, porque o botão não pode roubar o foco;
  - **rodar e grademe** levam para a aba Resultado; se o resultado chegar com a pessoa em outra aba, Resultado ganha um ponto de "novo";
  - **o editor** ocupa a altura útil da aba;
  - a barra da sessão do simulado se compacta: marcadores, relógio e ações em até 2 linhas.
- **Teclado:** usar `visualViewport` para manter barra de símbolos + rodapé visíveis acima do teclado no Android e no iOS.

## 7. Gamificação leve

- **Sequência de dias:**
  - conta dias **seguidos** com pelo menos um **grademe**, no fuso local;
  - fica salva no progresso (`streak: { last: 'YYYY-MM-DD', count }`);
  - um dia sem treinar não mostra perda: o contador volta para 1 no próximo dia treinado;
  - aparece no topo ("3 dias") e no "continuar".
- **Status de preparação por nível** (6.1) e o aviso ao passar (6.2).
- Nada de pontos, vidas ou bloqueios.

## 8. Conteúdo novo

- **Descrição curta de cada um dos 57 exercícios:** uma frase em português de até cerca de 60 caracteres, usada na lista e no detalhe. Os textos estão no array `EX` de `inicio-preparacao.html`. Ficam num campo novo `summary` no `exercise.json`, validado pelo schema e pelo teste de conteúdo (obrigatório, até 80 caracteres, sem código).
- **Títulos e subtítulos dos níveis** (6.1), em `src/content/levels.ts`.

## 9. Itens da revisão anterior

Situação dos itens da série de revisão:
- **Entram:**
  - I1–I7 (início e lista, agora dentro de 6.1);
  - E1–E6 e E8–E12 (exercício);
  - R1–R7 (simulado);
  - M1–M4 (celular).
- **Fica para depois:** E7 (divisórias arrastáveis).
- **Pendências menores da Task 17, que entram aqui:**
  - silenciar o stderr do `addr2line`;
  - pôr um limite de tempo (2 s) na busca da linha do segfault.

## 10. Riscos

1. **Compilador no celular:** baixa ~27 MB e usa ~400 MB de memória no Chromium desktop. No celular, ainda não foi testado num aparelho real; o iPhone (Safari) é o maior risco.
   - Mitigação: testar num Android e num iPhone reais antes de anunciar o recurso.
   - Se o motor falhar no aparelho, a tela mostra que esse aparelho não aguentou o compilador e sugere usar um computador. Enunciado e editor continuam funcionando.
2. **CodeMirror com teclado de celular:** precisa testar cursor, seleção, autocorreção e capitalização desligadas, além da barra de símbolos inserindo sem perder o foco.
3. **Tema claro no editor e no terminal:** checar o contraste dos tokens de código e das cores de diff nos dois temas (meta: AA).
4. **Escopo grande:** as telas mudam quase inteiras. Para segurar regressões, os testes e2e atuais precisam continuar passando, com seletores estáveis (`data-testid`).

## 11. Decisões complementares (minhas, após a leitura do revisor)

1. **Dados do "continuar".** Entram no progresso salvo dois campos novos, opcionais e compatíveis com os dados antigos:
   - `lastOpened: { id, at }`: gravado ao abrir a tela de um exercício no **treino**;
   - `lastAttempt: { [id]: { passed, total } }`: gravado a cada grademe que chega aos testes, no treino e no simulado. Erro de compilação, função proibida ou link grava `passed: 0`.
   - O cartão "continuar" usa o `lastOpened`. As barrinhas por teste vêm do `lastAttempt` desse exercício: verdes até `passed`, a seguinte vermelha se `passed < total`, o resto cinza.
2. **Sequência de dias.**
   - Conta grademes do treino e do simulado.
   - +1 quando o grademe cai no dia de calendário seguinte ao `last`; volta a 1 depois de qualquer intervalo; mais grademes no mesmo dia não somam.
   - Com sequência 0 ou quebrada, o topo mostra "comece hoje" em vez de um número.
3. **Formato salvo.** As mudanças só acrescentam dados. Nada do que já está salvo se perde (progresso, rascunhos, sessão, configurações). Leitura tolerante: campo ausente = valor padrão. Sem migração destrutiva.
4. **Dicas.** Toda escada tem exatamente 3 passos (o tipo `HintLadder` já garante), então "Dica k de 3" é fixo. No simulado as dicas funcionam igual ao treino.
5. **Celular que não aguenta o compilador.**
   - Ao iniciar o motor, gravar uma marca em `sessionStorage` e apagá-la quando o motor ficar pronto.
   - Se a página recarregar e a marca ainda estiver lá (a aba morreu por memória), ou se o motor não ficar pronto em até 60 s depois do download, mostrar: "Este aparelho pode não ter memória suficiente para o compilador. Você pode continuar lendo e escrevendo; para rodar e corrigir, tente num computador." com "tentar de novo".
   - Nada de bloqueio prévio por modelo de aparelho.
6. **Telas sem protótipo.** `exercicio.html` já inclui o layout do celular (abaixo de 820px: abas, barra de símbolos, rodapé) e a barra da sessão nos dois tamanhos. A tela de início do simulado e o resumo não têm protótipo: são derivados dos tokens e dos componentes (cartões, etiquetas, botões) das duas telas prototipadas.
7. **Descrições e títulos.** O array `EX` de `inicio-preparacao.html` tem os 57 ids do catálogo com os níveis certos. As descrições ali são a versão final, e o teste de conteúdo confere a correspondência com o catálogo.
8. **Rotas e ajustes.**
   - `#/treino` mostra o mesmo início, rolado até "exercícios". `PracticeList.tsx` deixa de existir e é absorvido pelo início.
   - `#/aleatorio`: sem sessão, mostra a tela de início do simulado; com sessão em andamento, vai direto para ela.
   - "vim" continua na barra de abas do editor; o tema fica no topo.
   - "limpar progresso" vai para o rodapé do início, como um link discreto com confirmação na própria tela.
9. **Testes e2e.** São atualizados para a nova interface. Mantêm os `data-testid` que continuam fazendo sentido (`grademe`, `run`, `run-args`, `log`, `hint`, `compiler-loader`, `compiler-retry`, `ex-<id>`, `swap`, `skip`, `finish`, `summary`, `clear-progress`, `subject-lang`, `vim-toggle`) e ganham novos para os elementos novos. Os comportamentos que os testes atuais cobrem continuam cobertos.
10. **Fontes.** Só o subconjunto `latin` (cobre os acentos do português), nos pesos listados.

## 12. O que fica para quem construir

- A estrutura de componentes React. Reaproveitar ao máximo `ExerciseScreen`, `LogPane`, `RunBar`, `EditorTabs` e `CodeEditor`, mudando estrutura e estilo.
- Como juntar os parágrafos do enunciado (heurística: linhas seguidas que não são código nem exemplo).
- Os textos de incentivo (até 5 variações), seguindo o tom deste documento.
- Detalhes de animação, dentro de "discreto" e respeitando o movimento reduzido.
