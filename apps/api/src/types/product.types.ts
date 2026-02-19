export type ProductListInput = {
  q?: string;
  companyId?: string;
  page?: number;
  pageSize?: number;
};

export type ProductObjectionType =
  | 'PRECO'
  | 'QUALIDADE'
  | 'OPERACAO'
  | 'LOGISTICA'
  | 'CONFIANCA'
  | 'OUTRO';

export type ProductConservationType =
  | 'CONGELADO'
  | 'REFRIGERADO'
  | 'AMBIENTE'
  | 'OUTRO';

export type ProductSaleUnit =
  | 'UNIDADE'
  | 'CAIXA'
  | 'LITRO'
  | 'GALAO'
  | 'OUTRO';

export type ProductReadyToUseType = 'SIM' | 'NAO' | 'OUTRO';

export type ProductObjectionInput = {
  objecaoCliente: string;
  tipoObjecao: ProductObjectionType;
  tipoObjecaoOutro?: string | null;
  respostaArgumento: string;
  quandoUsar?: string | null;
};

export type CreateProductInput = {
  id?: string;
  nome: string;
  descricaoComercial?: string | null;
  codigoInternoSku?: string | null;
  marca?: string | null;
  categorias: string[];
  categoriaOutro?: string | null;
  tipologiasClientes: string[];
  tipologiaClienteOutro?: string | null;
  sugestoesReceitas?: string | null;
  codigoBarrasEan?: string | null;
  codigoBarrasDun?: string | null;
  codigoFiscalNcm?: string | null;
  tipoConservacao?: ProductConservationType | null;
  tipoConservacaoOutro?: string | null;
  validadeEmbalagemFechada?: string | null;
  validadeAposAbertura?: string | null;
  validadeAposPreparo?: string | null;
  instrucoesConservacaoProduto?: string | null;
  restricoesProduto?: string | null;
  unidadeVenda?: ProductSaleUnit | null;
  unidadeVendaOutro?: string | null;
  pesoLiquidoVolume?: string | null;
  pesoBruto?: string | null;
  qtdUnidadesPorCaixa?: string | null;
  instrucoesConservacaoEmbalagem?: string | null;
  restricoesEmbalagem?: string | null;
  possuiIngredientes?: boolean | null;
  ingredientes?: string | null;
  alergenos?: string | null;
  produtoProntoUso?: ProductReadyToUseType | null;
  produtoProntoUsoOutro?: string | null;
  modoPreparo?: string | null;
  observacoesUso?: string | null;
  objecoesArgumentacoes: ProductObjectionInput[];
  fotosProduto: string[];
  videosMaterial: string[];
  observacoesImagens?: string | null;
  informacoesTecnicasComplementares?: string | null;
  certificacoesRegistros?: string | null;
  observacoesComerciais?: string | null;
  diferenciaisProduto?: string | null;
  observacoesGerais?: string | null;
};

export type UpdateProductInput = {
  nome?: string;
  descricaoComercial?: string | null;
  codigoInternoSku?: string | null;
  marca?: string | null;
  categorias?: string[];
  categoriaOutro?: string | null;
  tipologiasClientes?: string[];
  tipologiaClienteOutro?: string | null;
  sugestoesReceitas?: string | null;
  codigoBarrasEan?: string | null;
  codigoBarrasDun?: string | null;
  codigoFiscalNcm?: string | null;
  tipoConservacao?: ProductConservationType | null;
  tipoConservacaoOutro?: string | null;
  validadeEmbalagemFechada?: string | null;
  validadeAposAbertura?: string | null;
  validadeAposPreparo?: string | null;
  instrucoesConservacaoProduto?: string | null;
  restricoesProduto?: string | null;
  unidadeVenda?: ProductSaleUnit | null;
  unidadeVendaOutro?: string | null;
  pesoLiquidoVolume?: string | null;
  pesoBruto?: string | null;
  qtdUnidadesPorCaixa?: string | null;
  instrucoesConservacaoEmbalagem?: string | null;
  restricoesEmbalagem?: string | null;
  possuiIngredientes?: boolean | null;
  ingredientes?: string | null;
  alergenos?: string | null;
  produtoProntoUso?: ProductReadyToUseType | null;
  produtoProntoUsoOutro?: string | null;
  modoPreparo?: string | null;
  observacoesUso?: string | null;
  objecoesArgumentacoes?: ProductObjectionInput[];
  fotosProduto?: string[];
  videosMaterial?: string[];
  observacoesImagens?: string | null;
  informacoesTecnicasComplementares?: string | null;
  certificacoesRegistros?: string | null;
  observacoesComerciais?: string | null;
  diferenciaisProduto?: string | null;
  observacoesGerais?: string | null;
};
