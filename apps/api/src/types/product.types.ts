export type ProductListInput = {
  q?: string;
  company_id?: string;
  page?: number;
  page_size?: number;
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
  objecao_cliente: string;
  tipo_objecao: ProductObjectionType;
  tipo_objecao_outro?: string | null;
  resposta_argumento: string;
  quando_usar?: string | null;
};

export type CreateProductInput = {
  id?: string;
  nome: string;
  descricao_comercial?: string | null;
  codigo_interno_sku?: string | null;
  marca?: string | null;
  categorias: string[];
  categoria_outro?: string | null;
  tipologias_clientes: string[];
  tipologia_cliente_outro?: string | null;
  sugestoes_receitas?: string | null;
  codigo_barras_ean?: string | null;
  codigo_barras_dun?: string | null;
  codigo_fiscal_ncm?: string | null;
  tipo_conservacao?: ProductConservationType | null;
  tipo_conservacao_outro?: string | null;
  validade_embalagem_fechada?: string | null;
  validade_apos_abertura?: string | null;
  validade_apos_preparo?: string | null;
  instrucoes_conservacao_produto?: string | null;
  restricoes_produto?: string | null;
  unidade_venda?: ProductSaleUnit | null;
  unidade_venda_outro?: string | null;
  peso_liquido_volume?: string | null;
  peso_bruto?: string | null;
  qtd_unidades_por_caixa?: string | null;
  instrucoes_conservacao_embalagem?: string | null;
  restricoes_embalagem?: string | null;
  possui_ingredientes?: boolean | null;
  ingredientes?: string | null;
  alergenos?: string | null;
  produto_pronto_uso?: ProductReadyToUseType | null;
  produto_pronto_uso_outro?: string | null;
  modo_preparo?: string | null;
  observacoes_uso?: string | null;
  objecoes_argumentacoes: ProductObjectionInput[];
  fotos_produto: string[];
  videos_material: string[];
  observacoes_imagens?: string | null;
  informacoes_tecnicas_complementares?: string | null;
  certificacoes_registros?: string | null;
  observacoes_comerciais?: string | null;
  diferenciais_produto?: string | null;
  observacoes_gerais?: string | null;
};

export type UpdateProductInput = {
  nome?: string;
  descricao_comercial?: string | null;
  codigo_interno_sku?: string | null;
  marca?: string | null;
  categorias?: string[];
  categoria_outro?: string | null;
  tipologias_clientes?: string[];
  tipologia_cliente_outro?: string | null;
  sugestoes_receitas?: string | null;
  codigo_barras_ean?: string | null;
  codigo_barras_dun?: string | null;
  codigo_fiscal_ncm?: string | null;
  tipo_conservacao?: ProductConservationType | null;
  tipo_conservacao_outro?: string | null;
  validade_embalagem_fechada?: string | null;
  validade_apos_abertura?: string | null;
  validade_apos_preparo?: string | null;
  instrucoes_conservacao_produto?: string | null;
  restricoes_produto?: string | null;
  unidade_venda?: ProductSaleUnit | null;
  unidade_venda_outro?: string | null;
  peso_liquido_volume?: string | null;
  peso_bruto?: string | null;
  qtd_unidades_por_caixa?: string | null;
  instrucoes_conservacao_embalagem?: string | null;
  restricoes_embalagem?: string | null;
  possui_ingredientes?: boolean | null;
  ingredientes?: string | null;
  alergenos?: string | null;
  produto_pronto_uso?: ProductReadyToUseType | null;
  produto_pronto_uso_outro?: string | null;
  modo_preparo?: string | null;
  observacoes_uso?: string | null;
  objecoes_argumentacoes?: ProductObjectionInput[];
  fotos_produto?: string[];
  videos_material?: string[];
  observacoes_imagens?: string | null;
  informacoes_tecnicas_complementares?: string | null;
  certificacoes_registros?: string | null;
  observacoes_comerciais?: string | null;
  diferenciais_produto?: string | null;
  observacoes_gerais?: string | null;
};


