# ExamShell (Rank 02): simulador de exame da 42SP no navegador

Data: 2026-11-25
Status: rascunho para aprovação

## 1. Intenção e o porquê

Criar um simulador de exame da 42SP inspirado no [42exam.net](https://42exam.net), começando pelo **Rank 02 (C)**. Ranks posteriores vêm depois.

O 42exam.net é só um catálogo de enunciados: não compila nem corrige nada. Aqui o cadete escreve o código num editor no próprio site, clica para validar e recebe um retorno de **onde o código quebrou** (qual entrada, o que era esperado, o que saiu, se travou) e **dicas que ajudam sem entregar a resposta**.

O objetivo é **encorajar e treinar os cadetes**, não aplicar uma prova. O tom de tudo (textos, cores, feedback) é de quem está do lado do cadete.

Público: cadetes da 42 (o autor e colegas) treinando para o exame. O site é público, hospedado num serviço de hospedagem estática genérico (GitHub Pages ou similar), sem servidor.

## 2. Objetivos, não-objetivos e anti-objetivos

### Objetivos
- Os 57 exercícios do Rank 02, nos 4 níveis, com enunciado, bateria de testes e dicas.
- Dois modos:
  - **Treino livre:** o cadete escolhe qualquer exercício de qualquer nível.
  - **Modo aleatório:** o site sorteia um exercício por nível, em sequência, como no exame.
- Editor de código no navegador, compilação e execução de C **inteiramente no navegador do cadete**.
- Feedback útil quando falha: erro de compilação, função proibida, saída errada (com diff), travamento (segfault), loop infinito (tempo esgotado).
- Dicas em camadas, sempre disponíveis, nos dois modos.
- Progresso salvo no próprio navegador.

### Não-objetivos (por agora)
- Ranks 03 em diante (o design deve permitir adicioná-los depois sem refazer a base).
- Contas, login, ranking entre cadetes, sincronização entre dispositivos.
- Tutor com IA.
- Norminette e verificação de vazamento de memória (o exame de Rank 02 não cobra).
- Programar pelo celular. As telas de navegação devem funcionar no celular, mas a área de código é pensada para desktop.

### Anti-objetivos (o que tornaria isto um fracasso mesmo funcionando)
- **Mostrar a solução.** Nenhuma tela, dica ou arquivo publicado no site pode conter código de solução. As dicas nunca contêm código que resolva o exercício.
- **Parecer punitivo.** Falhar não bloqueia, não zera nada, não tem penalidade. O relógio do modo aleatório é informativo.
- **Depender de servidor ou de serviço de terceiros para corrigir.** Se o site for publicado como arquivos estáticos, ele precisa funcionar sozinho.

## 3. Restrições

- **Hospedagem estática** (GitHub Pages ou similar): sem backend, sem banco de dados. Tudo roda no navegador.
- **Arquivos publicados são públicos:** qualquer um abre o DevTools. Por isso o site publicado só contém entradas de teste e saídas esperadas, nunca as soluções de referência.
- **GitHub Pages:** limite de 100 MB por arquivo e 1 GB por site. Não dá para contar com compressão automática de `.wasm`.
- **Fidelidade ao exame:** compila com `-Wall -Wextra -Werror`, como na prova. Funções fora da lista de permitidas reprovam.

## 4. Abordagens consideradas (compilação do C)

| Abordagem | Ganho | Custo | Decisão |
|---|---|---|---|
| **1. Clang em WebAssembly no navegador** (pacote `@yowasp/clang`) | Site 100% estático, funciona offline, erros reais do Clang com `-Werror`, sem terceiros | ~25 MB de download na 1ª visita (depois fica em cache); alguns segfaults sutis não se reproduzem | **Escolhida pelo autor** |
| 2. Serviço externo de compilação (ex.: Compiler Explorer) | gcc real no Linux, segfaults idênticos aos da prova, site leve | Depende de serviço de terceiros (limite de uso, pode sair do ar), o código sai do navegador | Descartada |
| 3. Linux emulado no navegador (v86) com gcc/tcc | Fidelidade total | Imagem pesada, boot e compilação lentos, montagem complexa | Descartada antes da escolha |
| 4. Compiladores C minúsculos (xcc, tcc-wasm) | Download pequeno | Não reproduzem os avisos de `-Wall -Wextra -Werror`, onde muitos cadetes reprovam | Descartada antes da escolha |

### O que um teste rápido já confirmou (Node, `@yowasp/clang` 22.0.0)
- Compila C com `-Wall -Wextra -Werror` e devolve as mensagens reais do Clang (ex.: `unused variable 'x' [-Werror,-Wunused-variable]`). Cada compilação leva cerca de 75 ms depois que o compilador já carregou.
- O pacote já traz o sysroot WASI (`unistd.h`, `stdlib.h`, libc), então `write`, `malloc` e `free` funcionam.
- Escrever num ponteiro NULL **não** trava por padrão no WebAssembly. Com `-fsanitize=null,bounds -fsanitize-trap=all`, `p[0] = 'x'` com `p == NULL` vira um trap (detectável como segfault).
- Recursão infinita estoura a pilha e vira um trap (`memory access out of bounds`), também detectável.
- **Não detectado:** leitura em `p[3]` com `p == NULL` (endereço baixo diferente de zero). No Linux isso daria segfault.
- Tamanho: `llvm.core.wasm` tem 72 MB (22,6 MB com gzip), e `llvm-resources.tar` tem 29 MB (inclui headers de C++ que não precisamos).
- **Ainda não testado:** o mesmo pacote rodando dentro de um navegador real. É o primeiro risco a eliminar no plano.

## 5. Decisões do autor

- Hospedagem estática genérica, sem servidor.
- Dois modos: **treino livre** (escolhe o exercício) e **aleatório** (sorteia um por nível).
- É material de encorajamento e treino, não prova.
- Direção visual **A, "Examshell, só que gentil"** (detalhes na seção 7).
- Compilação com Clang em WebAssembly no navegador (abordagem 1).
- Começar pelo Rank 02. Os outros ranks vêm depois.
- No modo aleatório, quem não consegue passar pode **sortear outro exercício do mesmo nível** ou **pular para o próximo nível** (ver 6.4).

## 6. Como funciona

### 6.1 Fluxo de validação (um clique em "grademe")
1. **Compilar** os arquivos do cadete (mais o `main` de teste, nos exercícios de função) com `-Wall -Wextra -Werror` e com as flags de detecção de NULL. Se falhar, mostrar a mensagem do Clang, com uma explicação em português para os erros mais comuns.
2. **Checar funções proibidas:** compilar o código do cadete para objeto e listar os símbolos externos (via `llvm-nm -u`, disponível no mesmo pacote). Qualquer símbolo fora da lista de permitidas do exercício reprova, com a mensagem "você usou `printf`, que não está permitida aqui". Símbolos que o próprio compilador gera (ex.: `memset` e `memcpy` em inicializações) ficam numa lista branca interna.
3. **Rodar cada caso de teste** num Web Worker, com tempo limite (ex.: 2 s). Passar os argumentos (`argv`), capturar a saída padrão e o código de saída.
4. **Comparar** a saída com a esperada, byte a byte. Parar no primeiro teste que falhar, como o exame, mas mostrar quantos passaram até ali.
5. **Mostrar o resultado** no painel de log (ver 6.3).

### 6.2 Tipos de exercício
- **Programa** (ex.: `first_word`, `inter`, `rev_print`): o cadete escreve um `main`. O teste roda com conjuntos de `argv`.
- **Função** (ex.: `ft_strlen`, `ft_atoi`, `ft_split`): o cadete escreve só a função. O site compila junto um `main` de teste (que é público e não é solução) que chama a função com várias entradas e imprime os resultados. Se o cadete escrever um `main` **no arquivo da função**, o link falha por `main` duplicado, e o feedback explica que neste exercício não se entrega `main` (e aponta a aba de rascunho, ver 6.7).
- **Com header** (exercícios de lista, `flood_fill`, `sort_list`): o editor tem abas, uma para cada arquivo esperado (`.c` e `.h`). Quando o exame fornece um header pronto, ele aparece como aba somente leitura.

### 6.3 Feedback: onde quebrou + dicas
Para cada falha, o log mostra, no estilo de trace do exame:
- **Saída errada:** o comando executado (ex.: `./first_word "  lorem,ipsum  "`), o esperado e o recebido, com fim de linha marcado com `$` (como `cat -e`). O primeiro caractere diferente fica destacado.
- **Travou (segfault):** a entrada que causou o travamento. Se der para mapear o trap até a linha do código (compilando com `-g` e usando `llvm-symbolizer`, também no pacote), mostrar "travou na linha 14". Isso é desejável; se não for viável, mostrar só a entrada.
- **Tempo esgotado:** a entrada e a sugestão de procurar um loop que não termina.
- **Erro de compilação / função proibida:** como em 6.1.

**Dicas em camadas.** Cada caso de teste tem uma *categoria* (ex.: `espacos-no-inicio`, `string-vazia`, `argc-errado`, `negativos`, `int-min`). Cada exercício tem, por categoria, uma escada de 3 dicas:
1. Vaga, uma pergunta: "E se a string já começar com espaços?"
2. Aponta o conceito: "Antes de imprimir, o seu loop precisa passar por cima dos separadores."
3. Bem direta, ainda sem código: "Pule espaços e tabs até achar o primeiro caractere visível; só então comece a imprimir."

O cadete revela as dicas uma a uma (botão "pedir dica"). Também há dicas genéricas, que valem para qualquer exercício, para segfault, loop infinito, `\n` faltando ou sobrando, e erros de compilação comuns.

### 6.4 Modos
- **Treino livre:** a lista de exercícios por nível, com o estado de cada um (não tentado, tentado, passou). Ao abrir um exercício, o rascunho anterior é restaurado.
- **Modo aleatório:** sorteia um exercício do nível 1. Passou, sorteia o do nível 2, e assim até o 4. O relógio de 3h corre e é só informativo. Dá para tentar o mesmo exercício quantas vezes quiser. Ninguém fica preso (decisão do autor):
  - **Sortear outro deste nível:** botão que aparece depois de um grademe que falhou, como na prova de verdade. O exercício abandonado fica registrado na sessão.
  - **Pular para o próximo nível:** sempre disponível. O nível fica marcado como "pulado".
  - **Encerrar sessão:** sempre disponível. Leva direto ao resumo.

  No fim, um resumo em tom de incentivo: tempo, e por nível o exercício que passou (ou "pulado"), tentativas, exercícios trocados e dicas usadas. A sessão em andamento sobrevive a um recarregamento da página.

### 6.5 Progresso
Salvo no `localStorage`: rascunho por exercício, status por exercício (tentado/passou), estatísticas simples e a sessão aleatória em andamento. Botão para limpar o progresso.

### 6.6 Primeiro carregamento do compilador
O compilador (~25 MB comprimido) só é baixado quando o cadete abre o primeiro exercício, com barra de progresso e o texto "baixando o compilador, só na primeira vez". Depois fica em cache no navegador (Cache API / service worker). O `.wasm` é publicado já comprimido e descomprimido no navegador (`DecompressionStream`), porque o GitHub Pages pode não comprimir `.wasm`. O `llvm-resources.tar` é enxugado para conter só o necessário para C.

### 6.7 Testar por conta própria (minha decisão, sugerida pelo revisor)
Na prova de verdade, o cadete compila e testa o próprio código antes do grademe. Aqui também:
- **Exercícios de programa:** um campo "rodar com argumentos", tipo `./first_word "  lorem ipsum"`, que compila e roda o código com os argumentos digitados e mostra a saída no log (com `$` no fim de linha). Não conta como tentativa.
- **Exercícios de função:** uma aba opcional de rascunho, `main.c` (de teste), onde o cadete escreve o próprio `main` para chamar a função. "Rodar" compila o arquivo da função junto com esse rascunho. **O grademe ignora essa aba** e usa o `main` de teste do site.
- O log de baixo funciona como um mini terminal: mostra a saída das execuções do cadete e os resultados do grademe, em ordem.

### 6.8 Tamanho de `long` (minha decisão, sugerida pelo revisor)
No WebAssembly de 32 bits, `long` tem 32 bits. No Linux do exame, tem 64. Um padrão comum de cadete (`long n = nb; if (n < 0) n = -n;` para tratar `INT_MIN` em `ft_itoa`, `ft_atoi_base`, `print_hex`…) daria resultado errado aqui e reprovaria um código que passaria na prova. Isso vai contra a ideia de encorajar.

Solução: antes de compilar, reescrever no código do cadete o tipo `long` sozinho (fora de comentários e strings) como `long long`, de modo que `sizeof(long) == 8`, como no Linux. `long long` continua `long long`. As mensagens do compilador que citarem `long long` por causa da reescrita são traduzidas de volta para `long`, e os números de linha não mudam (a reescrita não adiciona linhas). Isso precisa ser validado no primeiro teste no navegador. Se a reescrita não funcionar bem, o plano B é detectar `long` e explicar no feedback ("no exame isso funcionaria; aqui o `long` tem 32 bits").

Ponteiros e `size_t` continuam com 32 bits. É uma diferença aceita, porque raramente importa no Rank 02.

## 7. Visual: "Examshell, só que gentil" (direção A, escolhida)

Parece o terminal da prova de verdade, para o cadete se acostumar com o ambiente, mas acolhedor.
- **Tipografia:** JetBrains Mono em toda a interface.
- **Paleta de referência do mockup:** fundo `#0E1621`, texto `#D8E1E8`, ciano da 42 `#00BABC` (barra superior e destaques), âmbar `#F2B84B` (dicas), vermelho suave `#FF6B6B` (falhas), cinza-azulado `#5F7488` (rótulos).
- **Layout da tela de exercício:** barra superior ciano (rank, nível, exercício); painel esquerdo com o enunciado no formato da prova (`Assignment name / Expected files / Allowed functions`); painel direito com o editor em cima e o log do grademe embaixo; barra de status inferior (tempo, tentativas, modo), no estilo tmux.
- **Falhas e dicas** aparecem como blocos destacados no log (vermelho para a falha, âmbar para a dica).

Mockup de referência: `.superpowers/brainstorm/374-1795609048/content/visual-direction.html` (opção A).

```
┌ examshell · rank 02 ─────────────────── nível 1/4 · first_word ┐
│ Assignment name  : first_word │  8  if (argc == 2)             │
│ Expected files   : first_word.c│ 10   while (argv[1][i] && …   │
│ Allowed functions: write      │ ────────────────────────────── │
│ ----------------------------- │ examshell> grademe             │
│ Write a program that takes a  │ ✗ teste 3/8 ./first_word "  …" │
│ string and displays its first │   esperado: lorem,ipsum$       │
│ word, followed by a newline.  │   recebido: $                  │
│                               │ dica 1/3 · E se a string já    │
│                               │ começar com espaços?           │
├ tempo 2:41:07 · tentativas 2 · modo aleatório ─────────────────┤
```

## 8. Conteúdo

### 8.1 Exercícios do Rank 02 (57)
- **Nível 1 (12):** first_word, fizzbuzz, ft_putstr, ft_strcpy, ft_strlen, ft_swap, repeat_alpha, rev_print, rot_13, rotone, search_and_replace, ulstr
- **Nível 2 (20):** alpha_mirror, camel_to_snake, do_op, ft_atoi, ft_strcmp, ft_strcspn, ft_strdup, ft_strpbrk, ft_strrev, ft_strspn, inter, is_power_of_2, last_word, max, print_bits, reverse_bits, snake_to_camel, swap_bits, union, wdmatch
- **Nível 3 (15):** add_prime_sum, epur_str, expand_str, ft_atoi_base, ft_list_size, ft_range, ft_rrange, hidenp, lcm, paramsum, pgcd, print_hex, rstr_capitalizer, str_capitalizer, tab_mult
- **Nível 4 (10):** flood_fill, fprime, ft_itoa, ft_list_foreach, ft_list_remove_if, ft_split, rev_wstr, rostring, sort_int_tab, sort_list

### 8.2 O que cada exercício traz
- Enunciado no formato da prova, em inglês (como no exame), com um botão para ver a tradução em português.
- Tipo (programa/função), arquivos esperados, funções permitidas, protótipo (se função), headers fornecidos.
- Exemplos do enunciado.
- Casos de teste (`argv` ou chamadas de função), cada um com uma categoria. A bateria deve cobrir os casos de borda clássicos: sem argumentos, argumentos demais, string vazia, só espaços, tabs, `INT_MIN`/`INT_MAX`, negativos, listas vazias.
- Saídas esperadas, **geradas fora do site**: as soluções de referência são compiladas com gcc (no WSL ou no CI) e as saídas são gravadas em arquivos de dados.
- Escadas de dicas por categoria.

### 8.3 Onde ficam as soluções de referência
No repositório, numa pasta que **nunca entra no site publicado** (ex.: `reference/`). Um script gera as saídas esperadas a partir delas. O build garante que nada de `reference/` vai para o pacote publicado. Isso evita entregar a resposta no site. Quem abrir o repositório consegue ver as soluções, mas elas já existem aos montes no GitHub.

## 9. Escolhas técnicas (feitas por mim, não pelo autor)
- **Vite + TypeScript + React**: site estático simples de publicar e fácil para outros cadetes contribuírem.
- **CodeMirror 6** como editor, com destaque de sintaxe C, tabs de verdade e **modo vim opcional** (é o editor mais usado no exame).
- **`@yowasp/clang`** para compilar e **`@bjorn3/browser_wasi_shim`** (ou equivalente) para rodar o `.wasm` gerado, tudo dentro de Web Workers (o worker de execução é descartado quando o tempo estoura).
- **Publicação via GitHub Actions** no GitHub Pages.
- **Formato dos dados:** um arquivo por exercício (ex.: JSON ou YAML), com enunciado, metadados, testes, saídas esperadas e dicas.
- **Próximos ranks:** suponho que eles sigam o 42exam.net, ou seja, Ranks 03 a 06 em **Python**. Por isso o "executor" (compilar e rodar) fica atrás de uma interface por linguagem (C agora, Python via Pyodide no futuro), e o formato do caso de teste já aceita **entrada padrão (stdin)** além de `argv`, porque o custo agora é baixo. Nada específico de Python é construído agora. Se os próximos ranks forem de C antigo (`get_next_line`, `ft_printf`) ou C++, é preciso rever o enxugamento dos headers e as flags `-D`.
- **Navegadores:** Chrome, Edge e Firefox recentes são obrigatórios. Safari funciona se der, sem garantia.
- **Interface e dicas em português.** Enunciados em inglês, com tradução.

## 10. Riscos conhecidos
1. **`@yowasp/clang` dentro de um navegador real** ainda não foi testado (só no Node). Primeiro passo do plano: uma página mínima que compila e roda o `first_word` no Chrome e no Firefox.
   - **Passa se:** compila e roda o `first_word` (com `-Werror`, a detecção de NULL e a reescrita de `long`) nos dois navegadores; o primeiro carregamento termina em menos de ~1 minuto numa conexão de 10 Mbps; as visitas seguintes ficam prontas em poucos segundos; a aba não estoura memória numa máquina de 8 GB.
   - **Se precisar de cabeçalhos de isolamento (COOP/COEP)**, que o GitHub Pages não envia: primeiro tentar o `coi-serviceworker` no próprio Pages; senão, trocar para outra hospedagem estática genérica que permita cabeçalhos (Cloudflare Pages, Netlify). Isso continua dentro de "hosting genérico".
   - **Se não rodar de jeito nenhum no navegador:** parar e voltar ao autor antes de trocar de abordagem. A abordagem 2 viola um anti-objetivo.
2. **Tamanho do download** (~25 MB). A mitigação é baixar só ao abrir o primeiro exercício, mostrar o progresso e cachear.
3. **Segfaults sutis não reproduzidos** (leitura em endereço baixo não-nulo, estouro de buffer no heap). A mitigação é a cobertura do `-fsanitize=null,bounds` e dicas que avisam "isso provavelmente daria segfault na prova" quando o teste é de borda.
4. **Diferenças entre Clang e gcc** em avisos. O exame usa gcc/cc. A diferença é pequena com `-Wall -Wextra -Werror`, e aceitamos.
5. **Modelo de 32 bits** (`long`, ponteiros, `size_t`). Tratado em 6.8.

## 11. O que fica para quem construir
- Estrutura de pastas, nomes de componentes, formato exato dos arquivos de dados.
- Texto exato dos enunciados (reescritos a partir do conhecimento público dos subjects), traduções e dicas, respeitando as regras da seção 6.3.
- Quantidade de casos de teste por exercício (sugestão: 6 a 15).
- Animações e microinterações, dentro do estilo da seção 7.
- Detalhes do cache do compilador e do enxugamento do `llvm-resources.tar`.
