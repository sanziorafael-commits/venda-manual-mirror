import { z } from 'zod';

const optionalTextSchema = z.string().trim().max(4000).nullable().optional();
const optionalShortTextSchema = z.string().trim().max(255).nullable().optional();

export const productConservationTypeSchema = z.enum([
  'CONGELADO',
  'REFRIGERADO',
  'AMBIENTE',
  'OUTRO',
]);

export const productSaleUnitSchema = z.enum([
  'UNIDADE',
  'CAIXA',
  'LITRO',
  'GALAO',
  'OUTRO',
]);

export const productReadyToUseSchema = z.enum(['SIM', 'NAO', 'OUTRO']);

export const productObjectionTypeSchema = z.enum([
  'PRECO',
  'QUALIDADE',
  'OPERACAO',
  'LOGISTICA',
  'CONFIANCA',
  'OUTRO',
]);

export const productObjectionSchema = z
  .object({
    objecao_cliente: z.string().trim().min(1).max(2000),
    tipo_objecao: productObjectionTypeSchema,
    tipo_objecao_outro: optionalTextSchema,
    resposta_argumento: z.string().trim().min(1).max(2000),
    quando_usar: optionalTextSchema,
  })
  .superRefine((value, context) => {
    if (value.tipo_objecao === 'OUTRO' && !value.tipo_objecao_outro?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tipo_objecao_outro'],
        message: 'tipo_objecao_outro e obrigatorio quando tipo_objecao = OUTRO',
      });
    }

    if (value.tipo_objecao !== 'OUTRO' && value.tipo_objecao_outro?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tipo_objecao_outro'],
        message: 'tipo_objecao_outro deve ser vazio quando tipo_objecao != OUTRO',
      });
    }
  });

const productPayloadBaseSchema = z.object({
  nome: z.string().trim().min(1).max(255),
  descricao_comercial: optionalTextSchema,
  codigo_interno_sku: optionalShortTextSchema,
  marca: optionalShortTextSchema,
  categorias: z.array(z.string().trim().min(1).max(120)).max(30).default([]),
  categoria_outro: optionalTextSchema,
  tipologias_clientes: z.array(z.string().trim().min(1).max(120)).max(30).default([]),
  tipologia_cliente_outro: optionalTextSchema,
  sugestoes_receitas: optionalTextSchema,
  codigo_barras_ean: optionalShortTextSchema,
  codigo_barras_dun: optionalShortTextSchema,
  codigo_fiscal_ncm: optionalShortTextSchema,
  tipo_conservacao: productConservationTypeSchema.nullable().optional(),
  tipo_conservacao_outro: optionalTextSchema,
  validade_embalagem_fechada: optionalShortTextSchema,
  validade_apos_abertura: optionalShortTextSchema,
  validade_apos_preparo: optionalShortTextSchema,
  instrucoes_conservacao_produto: optionalTextSchema,
  restricoes_produto: optionalTextSchema,
  unidade_venda: productSaleUnitSchema.nullable().optional(),
  unidade_venda_outro: optionalTextSchema,
  peso_liquido_volume: optionalShortTextSchema,
  peso_bruto: optionalShortTextSchema,
  qtd_unidades_por_caixa: optionalShortTextSchema,
  instrucoes_conservacao_embalagem: optionalTextSchema,
  restricoes_embalagem: optionalTextSchema,
  possui_ingredientes: z.boolean().nullable().optional(),
  ingredientes: optionalTextSchema,
  alergenos: optionalTextSchema,
  produto_pronto_uso: productReadyToUseSchema.nullable().optional(),
  produto_pronto_uso_outro: optionalTextSchema,
  modo_preparo: optionalTextSchema,
  observacoes_uso: optionalTextSchema,
  objecoes_argumentacoes: z.array(productObjectionSchema).max(30).default([]),
  fotos_produto: z.array(z.string().url().max(2048)).max(100).default([]),
  videos_material: z.array(z.string().url().max(2048)).max(30).default([]),
  observacoes_imagens: optionalTextSchema,
  informacoes_tecnicas_complementares: optionalTextSchema,
  certificacoes_registros: optionalTextSchema,
  observacoes_comerciais: optionalTextSchema,
  diferenciais_produto: optionalTextSchema,
  observacoes_gerais: optionalTextSchema,
});

function validateOtherFieldRules(
  value: {
    categorias?: string[];
    categoria_outro?: string | null;
    tipologias_clientes?: string[];
    tipologia_cliente_outro?: string | null;
    tipo_conservacao?: string | null;
    tipo_conservacao_outro?: string | null;
    unidade_venda?: string | null;
    unidade_venda_outro?: string | null;
    produto_pronto_uso?: string | null;
    produto_pronto_uso_outro?: string | null;
  },
  context: z.RefinementCtx,
  options: { strict: boolean },
) {
  const hasCategoriaOutro = Boolean(value.categoria_outro?.trim());
  const categoriaHasOutro = value.categorias?.includes('OUTRO') ?? false;
  if (categoriaHasOutro && !hasCategoriaOutro) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['categoria_outro'],
      message: 'categoria_outro e obrigatorio quando categorias inclui OUTRO',
    });
  }
  if (options.strict && !categoriaHasOutro && hasCategoriaOutro) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['categoria_outro'],
      message: 'categoria_outro deve ser vazio quando OUTRO nao estiver selecionado',
    });
  }

  const hasTipologiaOutro = Boolean(value.tipologia_cliente_outro?.trim());
  const tipologiaHasOutro = value.tipologias_clientes?.includes('OUTRO') ?? false;
  if (tipologiaHasOutro && !hasTipologiaOutro) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['tipologia_cliente_outro'],
      message: 'tipologia_cliente_outro e obrigatorio quando tipologias_clientes inclui OUTRO',
    });
  }
  if (options.strict && !tipologiaHasOutro && hasTipologiaOutro) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['tipologia_cliente_outro'],
      message: 'tipologia_cliente_outro deve ser vazio quando OUTRO nao estiver selecionado',
    });
  }

  const hasConservacaoOutro = Boolean(value.tipo_conservacao_outro?.trim());
  if (value.tipo_conservacao === 'OUTRO' && !hasConservacaoOutro) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['tipo_conservacao_outro'],
      message: 'tipo_conservacao_outro e obrigatorio quando tipo_conservacao = OUTRO',
    });
  }
  if (options.strict && value.tipo_conservacao !== 'OUTRO' && hasConservacaoOutro) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['tipo_conservacao_outro'],
      message: 'tipo_conservacao_outro deve ser vazio quando tipo_conservacao != OUTRO',
    });
  }

  const hasUnidadeOutro = Boolean(value.unidade_venda_outro?.trim());
  if (value.unidade_venda === 'OUTRO' && !hasUnidadeOutro) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['unidade_venda_outro'],
      message: 'unidade_venda_outro e obrigatorio quando unidade_venda = OUTRO',
    });
  }
  if (options.strict && value.unidade_venda !== 'OUTRO' && hasUnidadeOutro) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['unidade_venda_outro'],
      message: 'unidade_venda_outro deve ser vazio quando unidade_venda != OUTRO',
    });
  }

  const hasProntoUsoOutro = Boolean(value.produto_pronto_uso_outro?.trim());
  if (value.produto_pronto_uso === 'OUTRO' && !hasProntoUsoOutro) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['produto_pronto_uso_outro'],
      message: 'produto_pronto_uso_outro e obrigatorio quando produto_pronto_uso = OUTRO',
    });
  }
  if (options.strict && value.produto_pronto_uso !== 'OUTRO' && hasProntoUsoOutro) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['produto_pronto_uso_outro'],
      message: 'produto_pronto_uso_outro deve ser vazio quando produto_pronto_uso != OUTRO',
    });
  }
}

export const productQuerySchema = z.object({
  q: z.string().optional(),
  company_id: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().positive().max(100).default(10),
});

export const productReadScopeQuerySchema = z.object({
  company_id: z.string().uuid().optional(),
});

export const productParamSchema = z.object({
  product_id: z.string().uuid(),
});

export const createProductSchema = productPayloadBaseSchema
  .extend({
    id: z.string().uuid().optional(),
  })
  .superRefine((value, context) => {
    validateOtherFieldRules(value, context, { strict: true });
  });

export const updateProductSchema = productPayloadBaseSchema
  .partial()
  .superRefine((value, context) => {
    const hasCategorias = value.categorias !== undefined;
    const hasTipologias = value.tipologias_clientes !== undefined;
    const hasConservacao = value.tipo_conservacao !== undefined;
    const hasUnidade = value.unidade_venda !== undefined;
    const hasProntoUso = value.produto_pronto_uso !== undefined;

    if (Object.keys(value).length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe ao menos um campo para atualizacao',
      });
      return;
    }

    if (hasCategorias || value.categoria_outro !== undefined) {
      validateOtherFieldRules(
        {
          categorias: value.categorias,
          categoria_outro: value.categoria_outro,
        },
        context,
        { strict: hasCategorias },
      );
    }

    if (hasTipologias || value.tipologia_cliente_outro !== undefined) {
      validateOtherFieldRules(
        {
          tipologias_clientes: value.tipologias_clientes,
          tipologia_cliente_outro: value.tipologia_cliente_outro,
        },
        context,
        { strict: hasTipologias },
      );
    }

    if (hasConservacao || value.tipo_conservacao_outro !== undefined) {
      validateOtherFieldRules(
        {
          tipo_conservacao: value.tipo_conservacao,
          tipo_conservacao_outro: value.tipo_conservacao_outro,
        },
        context,
        { strict: hasConservacao },
      );
    }

    if (hasUnidade || value.unidade_venda_outro !== undefined) {
      validateOtherFieldRules(
        {
          unidade_venda: value.unidade_venda,
          unidade_venda_outro: value.unidade_venda_outro,
        },
        context,
        { strict: hasUnidade },
      );
    }

    if (hasProntoUso || value.produto_pronto_uso_outro !== undefined) {
      validateOtherFieldRules(
        {
          produto_pronto_uso: value.produto_pronto_uso,
          produto_pronto_uso_outro: value.produto_pronto_uso_outro,
        },
        context,
        { strict: hasProntoUso },
      );
    }
  });


