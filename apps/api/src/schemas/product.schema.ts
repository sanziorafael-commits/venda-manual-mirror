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
    objecaoCliente: z.string().trim().min(1).max(2000),
    tipoObjecao: productObjectionTypeSchema,
    tipoObjecaoOutro: optionalTextSchema,
    respostaArgumento: z.string().trim().min(1).max(2000),
    quandoUsar: optionalTextSchema,
  })
  .superRefine((value, context) => {
    if (value.tipoObjecao === 'OUTRO' && !value.tipoObjecaoOutro?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tipoObjecaoOutro'],
        message: 'tipoObjecaoOutro e obrigatorio quando tipoObjecao = OUTRO',
      });
    }

    if (value.tipoObjecao !== 'OUTRO' && value.tipoObjecaoOutro?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tipoObjecaoOutro'],
        message: 'tipoObjecaoOutro deve ser vazio quando tipoObjecao != OUTRO',
      });
    }
  });

const productPayloadBaseSchema = z.object({
  nome: z.string().trim().min(1).max(255),
  descricaoComercial: optionalTextSchema,
  codigoInternoSku: optionalShortTextSchema,
  marca: optionalShortTextSchema,
  categorias: z.array(z.string().trim().min(1).max(120)).max(30).default([]),
  categoriaOutro: optionalTextSchema,
  tipologiasClientes: z.array(z.string().trim().min(1).max(120)).max(30).default([]),
  tipologiaClienteOutro: optionalTextSchema,
  sugestoesReceitas: optionalTextSchema,
  codigoBarrasEan: optionalShortTextSchema,
  codigoBarrasDun: optionalShortTextSchema,
  codigoFiscalNcm: optionalShortTextSchema,
  tipoConservacao: productConservationTypeSchema.nullable().optional(),
  tipoConservacaoOutro: optionalTextSchema,
  validadeEmbalagemFechada: optionalShortTextSchema,
  validadeAposAbertura: optionalShortTextSchema,
  validadeAposPreparo: optionalShortTextSchema,
  instrucoesConservacaoProduto: optionalTextSchema,
  restricoesProduto: optionalTextSchema,
  unidadeVenda: productSaleUnitSchema.nullable().optional(),
  unidadeVendaOutro: optionalTextSchema,
  pesoLiquidoVolume: optionalShortTextSchema,
  pesoBruto: optionalShortTextSchema,
  qtdUnidadesPorCaixa: optionalShortTextSchema,
  instrucoesConservacaoEmbalagem: optionalTextSchema,
  restricoesEmbalagem: optionalTextSchema,
  possuiIngredientes: z.boolean().nullable().optional(),
  ingredientes: optionalTextSchema,
  alergenos: optionalTextSchema,
  produtoProntoUso: productReadyToUseSchema.nullable().optional(),
  produtoProntoUsoOutro: optionalTextSchema,
  modoPreparo: optionalTextSchema,
  observacoesUso: optionalTextSchema,
  objecoesArgumentacoes: z.array(productObjectionSchema).max(30).default([]),
  fotosProduto: z.array(z.string().url().max(2048)).max(100).default([]),
  videosMaterial: z.array(z.string().url().max(2048)).max(30).default([]),
  observacoesImagens: optionalTextSchema,
  informacoesTecnicasComplementares: optionalTextSchema,
  certificacoesRegistros: optionalTextSchema,
  observacoesComerciais: optionalTextSchema,
  diferenciaisProduto: optionalTextSchema,
  observacoesGerais: optionalTextSchema,
});

function validateOtherFieldRules(
  value: {
    categorias?: string[];
    categoriaOutro?: string | null;
    tipologiasClientes?: string[];
    tipologiaClienteOutro?: string | null;
    tipoConservacao?: string | null;
    tipoConservacaoOutro?: string | null;
    unidadeVenda?: string | null;
    unidadeVendaOutro?: string | null;
    produtoProntoUso?: string | null;
    produtoProntoUsoOutro?: string | null;
  },
  context: z.RefinementCtx,
  options: { strict: boolean },
) {
  const hasCategoriaOutro = Boolean(value.categoriaOutro?.trim());
  const categoriaHasOutro = value.categorias?.includes('OUTRO') ?? false;
  if (categoriaHasOutro && !hasCategoriaOutro) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['categoriaOutro'],
      message: 'categoriaOutro e obrigatorio quando categorias inclui OUTRO',
    });
  }
  if (options.strict && !categoriaHasOutro && hasCategoriaOutro) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['categoriaOutro'],
      message: 'categoriaOutro deve ser vazio quando OUTRO nao estiver selecionado',
    });
  }

  const hasTipologiaOutro = Boolean(value.tipologiaClienteOutro?.trim());
  const tipologiaHasOutro = value.tipologiasClientes?.includes('OUTRO') ?? false;
  if (tipologiaHasOutro && !hasTipologiaOutro) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['tipologiaClienteOutro'],
      message: 'tipologiaClienteOutro e obrigatorio quando tipologiasClientes inclui OUTRO',
    });
  }
  if (options.strict && !tipologiaHasOutro && hasTipologiaOutro) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['tipologiaClienteOutro'],
      message: 'tipologiaClienteOutro deve ser vazio quando OUTRO nao estiver selecionado',
    });
  }

  const hasConservacaoOutro = Boolean(value.tipoConservacaoOutro?.trim());
  if (value.tipoConservacao === 'OUTRO' && !hasConservacaoOutro) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['tipoConservacaoOutro'],
      message: 'tipoConservacaoOutro e obrigatorio quando tipoConservacao = OUTRO',
    });
  }
  if (options.strict && value.tipoConservacao !== 'OUTRO' && hasConservacaoOutro) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['tipoConservacaoOutro'],
      message: 'tipoConservacaoOutro deve ser vazio quando tipoConservacao != OUTRO',
    });
  }

  const hasUnidadeOutro = Boolean(value.unidadeVendaOutro?.trim());
  if (value.unidadeVenda === 'OUTRO' && !hasUnidadeOutro) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['unidadeVendaOutro'],
      message: 'unidadeVendaOutro e obrigatorio quando unidadeVenda = OUTRO',
    });
  }
  if (options.strict && value.unidadeVenda !== 'OUTRO' && hasUnidadeOutro) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['unidadeVendaOutro'],
      message: 'unidadeVendaOutro deve ser vazio quando unidadeVenda != OUTRO',
    });
  }

  const hasProntoUsoOutro = Boolean(value.produtoProntoUsoOutro?.trim());
  if (value.produtoProntoUso === 'OUTRO' && !hasProntoUsoOutro) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['produtoProntoUsoOutro'],
      message: 'produtoProntoUsoOutro e obrigatorio quando produtoProntoUso = OUTRO',
    });
  }
  if (options.strict && value.produtoProntoUso !== 'OUTRO' && hasProntoUsoOutro) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['produtoProntoUsoOutro'],
      message: 'produtoProntoUsoOutro deve ser vazio quando produtoProntoUso != OUTRO',
    });
  }
}

export const productQuerySchema = z.object({
  q: z.string().optional(),
  companyId: z.string().cuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
});

export const productReadScopeQuerySchema = z.object({
  companyId: z.string().cuid().optional(),
});

export const productParamSchema = z.object({
  productId: z.string().uuid(),
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
    const hasTipologias = value.tipologiasClientes !== undefined;
    const hasConservacao = value.tipoConservacao !== undefined;
    const hasUnidade = value.unidadeVenda !== undefined;
    const hasProntoUso = value.produtoProntoUso !== undefined;

    if (Object.keys(value).length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe ao menos um campo para atualizacao',
      });
      return;
    }

    if (hasCategorias || value.categoriaOutro !== undefined) {
      validateOtherFieldRules(
        {
          categorias: value.categorias,
          categoriaOutro: value.categoriaOutro,
        },
        context,
        { strict: hasCategorias },
      );
    }

    if (hasTipologias || value.tipologiaClienteOutro !== undefined) {
      validateOtherFieldRules(
        {
          tipologiasClientes: value.tipologiasClientes,
          tipologiaClienteOutro: value.tipologiaClienteOutro,
        },
        context,
        { strict: hasTipologias },
      );
    }

    if (hasConservacao || value.tipoConservacaoOutro !== undefined) {
      validateOtherFieldRules(
        {
          tipoConservacao: value.tipoConservacao,
          tipoConservacaoOutro: value.tipoConservacaoOutro,
        },
        context,
        { strict: hasConservacao },
      );
    }

    if (hasUnidade || value.unidadeVendaOutro !== undefined) {
      validateOtherFieldRules(
        {
          unidadeVenda: value.unidadeVenda,
          unidadeVendaOutro: value.unidadeVendaOutro,
        },
        context,
        { strict: hasUnidade },
      );
    }

    if (hasProntoUso || value.produtoProntoUsoOutro !== undefined) {
      validateOtherFieldRules(
        {
          produtoProntoUso: value.produtoProntoUso,
          produtoProntoUsoOutro: value.produtoProntoUsoOutro,
        },
        context,
        { strict: hasProntoUso },
      );
    }
  });
