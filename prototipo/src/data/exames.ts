import type { Exame, ItemResultado } from './types'

// RESULTADOS FICTÍCIOS para a demonstração. Valores de referência simplificados.
// Linguagem: o que é, o que o número quer dizer e o que ajuda. Nunca diagnóstico: quem explica é a médica no retorno.

const ATUAL: ItemResultado[] = [
  {
    nome: 'Glicemia em jejum',
    simples: 'Açúcar no sangue',
    valor: '98 mg/dL',
    referencia: '70 a 99',
    situacao: 'normal',
    explicacao: 'Dentro do esperado.',
  },
  {
    nome: 'Hemoglobina glicada (HbA1c)',
    simples: 'Média do açúcar nos últimos 3 meses',
    valor: '5,6%',
    referencia: 'abaixo de 5,7',
    situacao: 'normal',
    explicacao: 'Dentro do esperado, mas perto do limite. Vale manter a caminhada.',
  },
  {
    nome: 'Colesterol total',
    simples: 'Gordura no sangue',
    valor: '228 mg/dL',
    referencia: 'abaixo de 190',
    situacao: 'atencao',
    explicacao: 'Um pouco acima. Alimentação e caminhada ajudam; a nutricionista combina isso com você.',
  },
  {
    nome: 'Triglicerídeos',
    simples: 'Outro tipo de gordura no sangue',
    valor: '190 mg/dL',
    referencia: 'abaixo de 150',
    situacao: 'atencao',
    explicacao: 'Acima do esperado. Diminuir embutidos e bebida alcoólica costuma ajudar bastante.',
  },
  {
    nome: 'Hemograma completo',
    simples: 'Células do sangue',
    valor: 'Sem alterações',
    referencia: '—',
    situacao: 'normal',
    explicacao: 'Tudo certo.',
  },
  {
    nome: 'Creatinina sérica',
    simples: 'Como os rins estão funcionando',
    valor: '0,9 mg/dL',
    referencia: '0,7 a 1,3',
    situacao: 'normal',
    explicacao: 'Dentro do esperado.',
  },
  {
    nome: '25-hidroxivitamina D',
    simples: 'Vitamina D',
    valor: '24 ng/mL',
    referencia: '20 a 60',
    situacao: 'normal',
    explicacao: 'Dentro do esperado. Tomar um pouco de sol fora do turno ajuda a manter.',
  },
]

const CHECKUP_ANTERIOR: ItemResultado[] = [
  { nome: 'Glicemia em jejum', simples: 'Açúcar no sangue', valor: '95 mg/dL', referencia: '70 a 99', situacao: 'normal', explicacao: 'Dentro do esperado.' },
  {
    nome: 'Colesterol total',
    simples: 'Gordura no sangue',
    valor: '212 mg/dL',
    referencia: 'abaixo de 190',
    situacao: 'atencao',
    explicacao: 'Um pouco acima. Foi conversado no retorno.',
  },
  { nome: 'Hemograma completo', simples: 'Células do sangue', valor: 'Sem alterações', referencia: '—', situacao: 'normal', explicacao: 'Tudo certo.' },
]

export function exameAtual(id: string, medico: string, dataPedido: string, passoId?: string): Exame {
  return { id: `${id}-ex1`, titulo: 'Exames de sangue e urina', pedidoPor: medico, dataPedido, status: 'pedido', passoId, itens: ATUAL }
}

export function exameAnterior(id: string, medico: string, data: string): Exame {
  return {
    id: `${id}-ex0`,
    titulo: 'Exames do último check-up',
    pedidoPor: medico,
    dataPedido: data,
    dataColeta: data,
    dataResultado: data,
    status: 'resultado',
    itens: CHECKUP_ANTERIOR,
  }
}
