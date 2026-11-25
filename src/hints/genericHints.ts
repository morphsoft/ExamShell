import type { HintLadder } from '../engine/types';

export type GenericHintKey =
  | 'compile'
  | 'forbidden'
  | 'duplicate-main'
  | 'missing-symbol'
  | 'missing-main'
  | 'crash'
  | 'timeout'
  | 'newline'
  | 'wrong-output';

export const GENERIC_HINTS: Record<GenericHintKey, HintLadder> = {
  compile: [
    'O compilador parou em algum ponto do código. Que linha ele aponta na primeira mensagem de erro?',
    'Erros de compilação costumam vir de um detalhe pequeno: um ponto e vírgula faltando, um parêntese sem par, um nome escrito diferente do declarado. Muitas vezes o erro real está na linha de cima da que foi apontada.',
    'Leia só a primeira mensagem de erro, corrija esse ponto e compile de novo. Os erros seguintes costumam ser consequência do primeiro e somem sozinhos. Você está perto!',
  ],
  forbidden: [
    'Este exercício só permite algumas funções da biblioteca. Você lembra quais estão listadas no enunciado?',
    'No exame, cada exercício libera um conjunto pequeno de funções. Usar qualquer outra, mesmo que funcione, invalida a resposta. Isso treina você a entender o que está por baixo das funções prontas.',
    'Veja o nome da função proibida que apareceu no aviso e troque o seu uso por algo que você mesmo escreva com as funções permitidas, como escrever caractere por caractere. Você consegue!',
  ],
  'duplicate-main': [
    'Este exercício pede apenas uma função, mas o seu arquivo parece ter um main também. Será que ele é necessário aqui?',
    'Nos exercícios de função, o site já traz um main de teste pronto e compila junto com o seu arquivo. Dois main no mesmo programa causam um conflito na hora de ligar tudo.',
    'Remova o main do arquivo da função e deixe só a função pedida. Se quiser testar algo à mão, use a aba "main.c (rascunho)": ela existe para isso e não entra na correção.',
  ],
  'missing-symbol': [
    'O programa foi montado, mas faltou uma peça: alguma função usada não foi encontrada. Qual nome aparece na mensagem?',
    'Isso acontece quando o nome da função no seu arquivo é diferente do nome pedido no enunciado, ou quando uma função chamada nunca foi escrita. Maiúsculas, minúsculas e sublinhados importam.',
    'Compare, letra por letra, o nome e os parâmetros da sua função com o que o enunciado pede. Confirme também que cada função que você chama está definida em algum lugar. Corrigindo isso, você avança.',
  ],
  'missing-main': [
    'Por onde o seu programa começa a rodar? Quem decide qual é a primeira função a ser executada?',
    'Todo programa precisa da função de entrada que o sistema chama primeiro. Ela tem um nome exato e recebe parâmetros para os argumentos da linha de comando. Maiúsculas e minúsculas importam, e um erro de digitação no nome faz com que ela simplesmente não exista.',
    'Confira se o seu arquivo tem a função de entrada, escrita exatamente com o nome certo, e se não ficou vazio nem só com funções auxiliares. Corrija o nome ou escreva a função e tente de novo. Você está quase lá!',
  ],
  crash: [
    'O programa travou no meio da execução. Em que momento ele pode estar lendo ou escrevendo onde não deveria?',
    'Travamentos (segfault) costumam vir de acessar memória fora do que existe: passar do fim de uma string, usar um ponteiro nulo ou não reservar espaço suficiente. Entradas vazias ou sem argumentos são suspeitas clássicas. Na prova, ler ou escrever fora da memória que é sua pode derrubar o programa mesmo quando aqui ele segue rodando, então trate como aviso todo acesso que possa passar do limite, não só o que travou agora.',
    'Olhe a entrada que causou o travamento e simule o seu código com ela, passo a passo, anotando o valor de cada índice e ponteiro. Confira se algum deles sai dos limites ou fica nulo. Esse tipo de bug é um ótimo treino!',
  ],
  timeout: [
    'O programa passou do tempo limite sem terminar. Será que existe alguma repetição que nunca chega ao fim?',
    'Um laço só termina se algo dentro dele muda a condição de parada. Se o índice ou o ponteiro não avança em algum caminho, o programa fica rodando para sempre.',
    'Pegue a entrada que travou e acompanhe o laço à mão: a cada volta, o que muda? Verifique se todo caminho dentro dele avança o índice ou chega ao caractere final da string. Achar isso é meio caminho andado.',
  ],
  newline: [
    'A sua saída está quase certa! Olhando bem o final dela, tem algo diferente do esperado?',
    'O que difere está só nas quebras de linha: ou falta uma no fim, ou sobrou uma a mais. O enunciado diz quando o programa deve imprimir a quebra de linha final e quando não.',
    'Releia o enunciado e veja se ele pede a quebra de linha no fim. Depois confira se algum caminho do seu código imprime essa quebra duas vezes ou esquece de imprimir. É um ajuste pequeno!',
  ],
  'wrong-output': [
    'A saída ficou diferente do esperado nesta entrada. Que parte da entrada você acha que o seu código tratou de um jeito inesperado?',
    'Compare a saída esperada com a recebida, caractere por caractere, e veja onde elas começam a divergir. O ponto de divergência mostra qual situação o seu código não está cobrindo.',
    'Pegue exatamente essa entrada e execute o seu código à mão, passo a passo, anotando o que cada variável vale. No momento em que o resultado se afastar do esperado, você achou o bug. Vai dar certo!',
  ],
};
