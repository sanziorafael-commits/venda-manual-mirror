import { z } from "zod";

export const PRODUCT_CATEGORY_OPTIONS = [
  { value: "PROTEINAS_ANIMAIS", label: "Proteínas animais" },
  { value: "LATICINIOS", label: "Laticínios" },
  { value: "CONGELADOS_NAO_CARNEOS", label: "Congelados (não cárneos)" },
  { value: "SECOS_MERCEARIA", label: "Secos e mercearia" },
  { value: "MOLHOS_CONDIMENTOS", label: "Molhos e condimentos" },
  { value: "PANIFICACAO_CONFEITARIA", label: "Panificação e confeitaria" },
  { value: "PRONTOS_SEMIPRONTOS", label: "Prontos / semi-prontos" },
  { value: "BEBIDAS", label: "Bebidas" },
  { value: "HORTIFRUTI", label: "Hortifruti" },
  { value: "INGREDIENTES_FUNCIONAIS", label: "Ingredientes funcionais" },
  { value: "OUTRO", label: "Outro" },
] as const;

export const PRODUCT_CLIENT_TYPE_OPTIONS = [
  { value: "RESTAURANTE", label: "Restaurante" },
  { value: "BAR", label: "Bar" },
  { value: "PIZZARIA", label: "Pizzaria" },
  { value: "HAMBURGUERIA", label: "Hamburgueria" },
  { value: "HOTEL", label: "Hotel" },
  { value: "PADARIA", label: "Padaria" },
  { value: "CONFEITARIA", label: "Confeitaria" },
  { value: "CAFETERIA", label: "Cafeteria" },
  { value: "LANCHONETE", label: "Lanchonete" },
  { value: "FOOD_TRUCK", label: "Food truck" },
  { value: "DARK_KITCHEN", label: "Dark kitchen" },
  { value: "BUFFET_EVENTOS", label: "Buffet / eventos" },
  { value: "CHURRASCARIA", label: "Churrascaria" },
  { value: "CANTINA_REFEITORIO", label: "Cantina / refeitório" },
  { value: "HOSPITAL_CLINICA", label: "Hospital / clínica" },
  { value: "ESCOLA_UNIVERSIDADE", label: "Escola / universidade" },
  { value: "CLUBE_ASSOCIACAO", label: "Clube / associação" },
  { value: "DELIVERY", label: "Delivery" },
  { value: "COZINHA_INDUSTRIAL", label: "Cozinha industrial" },
  { value: "OUTRO", label: "Outro" },
] as const;

export const PRODUCT_OBJECTION_TYPE_OPTIONS = [
  { value: "PRECO", label: "Preço" },
  { value: "QUALIDADE", label: "Qualidade" },
  { value: "OPERACAO", label: "Operação" },
  { value: "LOGISTICA", label: "Logística" },
  { value: "CONFIANCA", label: "Confiança" },
  { value: "OUTRO", label: "Outro" },
] as const;

export const PRODUCT_CONSERVATION_TYPE_OPTIONS = [
  { value: "CONGELADO", label: "Congelado" },
  { value: "REFRIGERADO", label: "Refrigerado" },
  { value: "AMBIENTE", label: "Ambiente" },
  { value: "OUTRO", label: "Outro" },
] as const;

export const PRODUCT_SALE_UNIT_OPTIONS = [
  { value: "UNIDADE", label: "Unidade" },
  { value: "CAIXA", label: "Caixa" },
  { value: "LITRO", label: "Litro" },
  { value: "GALAO", label: "Galão" },
  { value: "OUTRO", label: "Outro" },
] as const;

export const PRODUCT_READY_TO_USE_OPTIONS = [
  { value: "SIM", label: "Sim" },
  { value: "NAO", label: "Não" },
  { value: "OUTRO", label: "Outro" },
] as const;

export const CATEGORY_LABEL_BY_VALUE = Object.fromEntries(
  PRODUCT_CATEGORY_OPTIONS.map((option) => [option.value, option.label]),
) as Record<string, string>;

export const CLIENT_TYPE_LABEL_BY_VALUE = Object.fromEntries(
  PRODUCT_CLIENT_TYPE_OPTIONS.map((option) => [option.value, option.label]),
) as Record<string, string>;

export const OBJECTION_TYPE_LABEL_BY_VALUE = Object.fromEntries(
  PRODUCT_OBJECTION_TYPE_OPTIONS.map((option) => [option.value, option.label]),
) as Record<string, string>;

export const CONSERVATION_LABEL_BY_VALUE = Object.fromEntries(
  PRODUCT_CONSERVATION_TYPE_OPTIONS.map((option) => [option.value, option.label]),
) as Record<string, string>;

export const SALE_UNIT_LABEL_BY_VALUE = Object.fromEntries(
  PRODUCT_SALE_UNIT_OPTIONS.map((option) => [option.value, option.label]),
) as Record<string, string>;

export const READY_TO_USE_LABEL_BY_VALUE = Object.fromEntries(
  PRODUCT_READY_TO_USE_OPTIONS.map((option) => [option.value, option.label]),
) as Record<string, string>;

export const productObjectionSchema = z.object({
  objecao_cliente: z.string().trim().max(2000),
  tipo_objecao: z.enum([
    "PRECO",
    "QUALIDADE",
    "OPERACAO",
    "LOGISTICA",
    "CONFIANCA",
    "OUTRO",
  ]),
  tipo_objecao_outro: z.string().trim().max(2000),
  resposta_argumento: z.string().trim().max(2000),
  quando_usar: z.string().trim().max(2000),
});

export const productObjectionApiSchema = productObjectionSchema.extend({
  tipo_objecao_outro: z.string().trim().max(2000).nullable(),
  quando_usar: z.string().trim().max(2000).nullable(),
});

export const productListItemSchema = z.object({
  id: z.string().uuid(),
  company_id: z.string().nullable(),
  nome: z.string().min(1),
  marca: z.string().nullable(),
  codigo_interno_sku: z.string().nullable(),
  categorias: z.array(z.string()),
  tipologias_clientes: z.array(z.string()),
  total_objecoes: z.number().int().nonnegative(),
  total_fotos: z.number().int().nonnegative(),
  total_videos: z.number().int().nonnegative(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const productListMetaSchema = z.object({
  page: z.number().int().positive(),
  page_size: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  total_pages: z.number().int().positive(),
});

export const productsApiResponseSchema = z.object({
  data: z.array(productListItemSchema),
  meta: productListMetaSchema,
});

export const productMediaItemSchema = z.object({
  public_url: z.string().url(),
  signed_url: z.string().url().nullable(),
});

export const productDetailSchema = z.object({
  id: z.string().uuid(),
  company_id: z.string().nullable(),
  nome: z.string().min(1),
  descricao_comercial: z.string().nullable(),
  codigo_interno_sku: z.string().nullable(),
  marca: z.string().nullable(),
  categorias: z.array(z.string()),
  categoria_outro: z.string().nullable(),
  tipologias_clientes: z.array(z.string()),
  tipologia_cliente_outro: z.string().nullable(),
  sugestoes_receitas: z.string().nullable(),
  codigo_barras_ean: z.string().nullable(),
  codigo_barras_dun: z.string().nullable(),
  codigo_fiscal_ncm: z.string().nullable(),
  tipo_conservacao: z
    .enum(["CONGELADO", "REFRIGERADO", "AMBIENTE", "OUTRO"])
    .nullable(),
  tipo_conservacao_outro: z.string().nullable(),
  validade_embalagem_fechada: z.string().nullable(),
  validade_apos_abertura: z.string().nullable(),
  validade_apos_preparo: z.string().nullable(),
  instrucoes_conservacao_produto: z.string().nullable(),
  restricoes_produto: z.string().nullable(),
  unidade_venda: z.enum(["UNIDADE", "CAIXA", "LITRO", "GALAO", "OUTRO"]).nullable(),
  unidade_venda_outro: z.string().nullable(),
  peso_liquido_volume: z.string().nullable(),
  peso_bruto: z.string().nullable(),
  qtd_unidades_por_caixa: z.string().nullable(),
  instrucoes_conservacao_embalagem: z.string().nullable(),
  restricoes_embalagem: z.string().nullable(),
  possui_ingredientes: z.boolean().nullable(),
  ingredientes: z.string().nullable(),
  alergenos: z.string().nullable(),
  produto_pronto_uso: z.enum(["SIM", "NAO", "OUTRO"]).nullable(),
  produto_pronto_uso_outro: z.string().nullable(),
  modo_preparo: z.string().nullable(),
  observacoes_uso: z.string().nullable(),
  objecoes_argumentacoes: z.array(productObjectionApiSchema),
  fotos_produto: z.array(z.string().url()),
  videos_material: z.array(z.string().url()),
  observacoes_imagens: z.string().nullable(),
  informacoes_tecnicas_complementares: z.string().nullable(),
  certificacoes_registros: z.string().nullable(),
  observacoes_comerciais: z.string().nullable(),
  diferenciais_produto: z.string().nullable(),
  observacoes_gerais: z.string().nullable(),
  media: z
    .object({
      fotos: z.array(productMediaItemSchema),
      videos: z.array(productMediaItemSchema),
    })
    .optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const productDetailApiResponseSchema = z.object({
  data: productDetailSchema,
});

export const createdOrUpdatedProductApiResponseSchema = z.object({
  data: productDetailSchema,
});

export const productFormSchema = z
  .object({
    id: z.string().uuid().optional(),
    nome: z.string().trim().max(255),
    descricao_comercial: z.string().trim().max(4000),
    codigo_interno_sku: z.string().trim().max(255),
    marca: z.string().trim().max(255),
    categorias: z.array(z.string()),
    categoria_outro: z.string().trim().max(4000),
    tipologias_clientes: z.array(z.string()),
    tipologia_cliente_outro: z.string().trim().max(4000),
    sugestoes_receitas: z.string().trim().max(4000),
    codigo_barras_ean: z.string().trim().max(255),
    codigo_barras_dun: z.string().trim().max(255),
    codigo_fiscal_ncm: z.string().trim().max(255),
    tipo_conservacao: z
      .enum(["CONGELADO", "REFRIGERADO", "AMBIENTE", "OUTRO"])
      .nullable(),
    tipo_conservacao_outro: z.string().trim().max(4000),
    validade_embalagem_fechada: z.string().trim().max(255),
    validade_apos_abertura: z.string().trim().max(255),
    validade_apos_preparo: z.string().trim().max(255),
    instrucoes_conservacao_produto: z.string().trim().max(4000),
    restricoes_produto: z.string().trim().max(4000),
    unidade_venda: z.enum(["UNIDADE", "CAIXA", "LITRO", "GALAO", "OUTRO"]).nullable(),
    unidade_venda_outro: z.string().trim().max(4000),
    peso_liquido_volume: z.string().trim().max(255),
    peso_bruto: z.string().trim().max(255),
    qtd_unidades_por_caixa: z.string().trim().max(255),
    instrucoes_conservacao_embalagem: z.string().trim().max(4000),
    restricoes_embalagem: z.string().trim().max(4000),
    possui_ingredientes: z.boolean().nullable(),
    ingredientes: z.string().trim().max(4000),
    alergenos: z.string().trim().max(4000),
    produto_pronto_uso: z.enum(["SIM", "NAO", "OUTRO"]).nullable(),
    produto_pronto_uso_outro: z.string().trim().max(4000),
    modo_preparo: z.string().trim().max(4000),
    observacoes_uso: z.string().trim().max(4000),
    objecoes_argumentacoes: z.array(productObjectionSchema),
    fotos_produto: z.array(z.string().url()),
    videos_material: z.array(z.string().url()),
    observacoes_imagens: z.string().trim().max(4000),
    informacoes_tecnicas_complementares: z.string().trim().max(4000),
    certificacoes_registros: z.string().trim().max(4000),
    observacoes_comerciais: z.string().trim().max(4000),
    diferenciais_produto: z.string().trim().max(4000),
    observacoes_gerais: z.string().trim().max(4000),
  })
  .superRefine((value, context) => {
    if (!value.nome.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["nome"],
        message: "Nome do produto é obrigatório.",
      });
    }

    const hasCategoriaOutro = value.categorias.includes("OUTRO");
    if (hasCategoriaOutro && !value.categoria_outro.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["categoria_outro"],
        message: "Preencha a categoria 'Outro'.",
      });
    }
    if (!hasCategoriaOutro && value.categoria_outro.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["categoria_outro"],
        message: "Campo deve ficar vazio quando 'Outro' não está selecionado.",
      });
    }

    const hasTipologiaOutro = value.tipologias_clientes.includes("OUTRO");
    if (hasTipologiaOutro && !value.tipologia_cliente_outro.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tipologia_cliente_outro"],
        message: "Preencha a tipologia 'Outro'.",
      });
    }
    if (!hasTipologiaOutro && value.tipologia_cliente_outro.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tipologia_cliente_outro"],
        message: "Campo deve ficar vazio quando 'Outro' não está selecionado.",
      });
    }

    if (value.tipo_conservacao === "OUTRO" && !value.tipo_conservacao_outro.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tipo_conservacao_outro"],
        message: "Preencha o tipo de conservação 'Outro'.",
      });
    }
    if (value.tipo_conservacao !== "OUTRO" && value.tipo_conservacao_outro.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tipo_conservacao_outro"],
        message: "Campo deve ficar vazio quando tipo de conservação não é 'Outro'.",
      });
    }

    if (value.unidade_venda === "OUTRO" && !value.unidade_venda_outro.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["unidade_venda_outro"],
        message: "Preencha a unidade de venda 'Outro'.",
      });
    }
    if (value.unidade_venda !== "OUTRO" && value.unidade_venda_outro.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["unidade_venda_outro"],
        message: "Campo deve ficar vazio quando unidade de venda não é 'Outro'.",
      });
    }

    if (value.produto_pronto_uso === "OUTRO" && !value.produto_pronto_uso_outro.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["produto_pronto_uso_outro"],
        message: "Preencha o campo 'Outro' de pronto para uso.",
      });
    }
    if (value.produto_pronto_uso !== "OUTRO" && value.produto_pronto_uso_outro.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["produto_pronto_uso_outro"],
        message: "Campo deve ficar vazio quando pronto para uso não é 'Outro'.",
      });
    }

    value.objecoes_argumentacoes.forEach((item, index) => {
      if (isProductObjectionEmpty(item)) {
        return;
      }

      if (!item.objecao_cliente.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["objecoes_argumentacoes", index, "objecao_cliente"],
          message: "Informe a objeção do cliente.",
        });
      }
      if (!item.resposta_argumento.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["objecoes_argumentacoes", index, "resposta_argumento"],
          message: "Informe a resposta/argumento.",
        });
      }
      if (item.tipo_objecao === "OUTRO" && !item.tipo_objecao_outro.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["objecoes_argumentacoes", index, "tipo_objecao_outro"],
          message: "Preencha o tipo de objeção 'Outro'.",
        });
      }
      if (item.tipo_objecao !== "OUTRO" && item.tipo_objecao_outro.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["objecoes_argumentacoes", index, "tipo_objecao_outro"],
          message: "Campo deve ficar vazio quando o tipo de objeção não é 'Outro'.",
        });
      }
    });
  });

export function createEmptyProductObjection(): ProductObjection {
  return {
    objecao_cliente: "",
    tipo_objecao: "PRECO",
    tipo_objecao_outro: "",
    resposta_argumento: "",
    quando_usar: "",
  };
}

export function isProductObjectionEmpty(item: ProductObjection) {
  return (
    item.objecao_cliente.trim().length === 0 &&
    item.resposta_argumento.trim().length === 0 &&
    item.tipo_objecao_outro.trim().length === 0 &&
    item.quando_usar.trim().length === 0
  );
}

export function createEmptyProductFormValues(id?: string): ProductFormValues {
  return {
    id,
    nome: "",
    descricao_comercial: "",
    codigo_interno_sku: "",
    marca: "",
    categorias: [],
    categoria_outro: "",
    tipologias_clientes: [],
    tipologia_cliente_outro: "",
    sugestoes_receitas: "",
    codigo_barras_ean: "",
    codigo_barras_dun: "",
    codigo_fiscal_ncm: "",
    tipo_conservacao: null,
    tipo_conservacao_outro: "",
    validade_embalagem_fechada: "",
    validade_apos_abertura: "",
    validade_apos_preparo: "",
    instrucoes_conservacao_produto: "",
    restricoes_produto: "",
    unidade_venda: null,
    unidade_venda_outro: "",
    peso_liquido_volume: "",
    peso_bruto: "",
    qtd_unidades_por_caixa: "",
    instrucoes_conservacao_embalagem: "",
    restricoes_embalagem: "",
    possui_ingredientes: null,
    ingredientes: "",
    alergenos: "",
    produto_pronto_uso: null,
    produto_pronto_uso_outro: "",
    modo_preparo: "",
    observacoes_uso: "",
    objecoes_argumentacoes: [createEmptyProductObjection()],
    fotos_produto: [],
    videos_material: [],
    observacoes_imagens: "",
    informacoes_tecnicas_complementares: "",
    certificacoes_registros: "",
    observacoes_comerciais: "",
    diferenciais_produto: "",
    observacoes_gerais: "",
  };
}

export function mapProductDetailToFormValues(detail: ProductDetail): ProductFormValues {
  return {
    id: detail.id,
    nome: detail.nome,
    descricao_comercial: detail.descricao_comercial ?? "",
    codigo_interno_sku: detail.codigo_interno_sku ?? "",
    marca: detail.marca ?? "",
    categorias: detail.categorias ?? [],
    categoria_outro: detail.categoria_outro ?? "",
    tipologias_clientes: detail.tipologias_clientes ?? [],
    tipologia_cliente_outro: detail.tipologia_cliente_outro ?? "",
    sugestoes_receitas: detail.sugestoes_receitas ?? "",
    codigo_barras_ean: detail.codigo_barras_ean ?? "",
    codigo_barras_dun: detail.codigo_barras_dun ?? "",
    codigo_fiscal_ncm: detail.codigo_fiscal_ncm ?? "",
    tipo_conservacao: detail.tipo_conservacao ?? null,
    tipo_conservacao_outro: detail.tipo_conservacao_outro ?? "",
    validade_embalagem_fechada: detail.validade_embalagem_fechada ?? "",
    validade_apos_abertura: detail.validade_apos_abertura ?? "",
    validade_apos_preparo: detail.validade_apos_preparo ?? "",
    instrucoes_conservacao_produto: detail.instrucoes_conservacao_produto ?? "",
    restricoes_produto: detail.restricoes_produto ?? "",
    unidade_venda: detail.unidade_venda ?? null,
    unidade_venda_outro: detail.unidade_venda_outro ?? "",
    peso_liquido_volume: detail.peso_liquido_volume ?? "",
    peso_bruto: detail.peso_bruto ?? "",
    qtd_unidades_por_caixa: detail.qtd_unidades_por_caixa ?? "",
    instrucoes_conservacao_embalagem: detail.instrucoes_conservacao_embalagem ?? "",
    restricoes_embalagem: detail.restricoes_embalagem ?? "",
    possui_ingredientes: detail.possui_ingredientes,
    ingredientes: detail.ingredientes ?? "",
    alergenos: detail.alergenos ?? "",
    produto_pronto_uso: detail.produto_pronto_uso ?? null,
    produto_pronto_uso_outro: detail.produto_pronto_uso_outro ?? "",
    modo_preparo: detail.modo_preparo ?? "",
    observacoes_uso: detail.observacoes_uso ?? "",
    objecoes_argumentacoes:
      detail.objecoes_argumentacoes.length > 0
        ? detail.objecoes_argumentacoes.map((item) => ({
            objecao_cliente: item.objecao_cliente,
            tipo_objecao: item.tipo_objecao,
            tipo_objecao_outro: item.tipo_objecao_outro ?? "",
            resposta_argumento: item.resposta_argumento,
            quando_usar: item.quando_usar ?? "",
          }))
        : [createEmptyProductObjection()],
    fotos_produto: detail.fotos_produto ?? [],
    videos_material: detail.videos_material ?? [],
    observacoes_imagens: detail.observacoes_imagens ?? "",
    informacoes_tecnicas_complementares:
      detail.informacoes_tecnicas_complementares ?? "",
    certificacoes_registros: detail.certificacoes_registros ?? "",
    observacoes_comerciais: detail.observacoes_comerciais ?? "",
    diferenciais_produto: detail.diferenciais_produto ?? "",
    observacoes_gerais: detail.observacoes_gerais ?? "",
  };
}

export function buildProductPayloadFromForm(values: ProductFormValues) {
  return {
    ...(values.id ? { id: values.id } : {}),
    nome: values.nome.trim(),
    descricao_comercial: normalizeOptionalText(values.descricao_comercial),
    codigo_interno_sku: normalizeOptionalShortText(values.codigo_interno_sku),
    marca: normalizeOptionalShortText(values.marca),
    categorias: normalizeStringList(values.categorias),
    categoria_outro: normalizeOptionalText(values.categoria_outro),
    tipologias_clientes: normalizeStringList(values.tipologias_clientes),
    tipologia_cliente_outro: normalizeOptionalText(values.tipologia_cliente_outro),
    sugestoes_receitas: normalizeOptionalText(values.sugestoes_receitas),
    codigo_barras_ean: normalizeOptionalShortText(values.codigo_barras_ean),
    codigo_barras_dun: normalizeOptionalShortText(values.codigo_barras_dun),
    codigo_fiscal_ncm: normalizeOptionalShortText(values.codigo_fiscal_ncm),
    tipo_conservacao: values.tipo_conservacao,
    tipo_conservacao_outro: normalizeOptionalText(values.tipo_conservacao_outro),
    validade_embalagem_fechada: normalizeOptionalShortText(
      values.validade_embalagem_fechada,
    ),
    validade_apos_abertura: normalizeOptionalShortText(values.validade_apos_abertura),
    validade_apos_preparo: normalizeOptionalShortText(values.validade_apos_preparo),
    instrucoes_conservacao_produto: normalizeOptionalText(
      values.instrucoes_conservacao_produto,
    ),
    restricoes_produto: normalizeOptionalText(values.restricoes_produto),
    unidade_venda: values.unidade_venda,
    unidade_venda_outro: normalizeOptionalText(values.unidade_venda_outro),
    peso_liquido_volume: normalizeOptionalShortText(values.peso_liquido_volume),
    peso_bruto: normalizeOptionalShortText(values.peso_bruto),
    qtd_unidades_por_caixa: normalizeOptionalShortText(values.qtd_unidades_por_caixa),
    instrucoes_conservacao_embalagem: normalizeOptionalText(
      values.instrucoes_conservacao_embalagem,
    ),
    restricoes_embalagem: normalizeOptionalText(values.restricoes_embalagem),
    possui_ingredientes: values.possui_ingredientes,
    ingredientes: normalizeOptionalText(values.ingredientes),
    alergenos: normalizeOptionalText(values.alergenos),
    produto_pronto_uso: values.produto_pronto_uso,
    produto_pronto_uso_outro: normalizeOptionalText(values.produto_pronto_uso_outro),
    modo_preparo: normalizeOptionalText(values.modo_preparo),
    observacoes_uso: normalizeOptionalText(values.observacoes_uso),
    objecoes_argumentacoes: values.objecoes_argumentacoes
      .filter((item) => !isProductObjectionEmpty(item))
      .map((item) => ({
        objecao_cliente: item.objecao_cliente.trim(),
        tipo_objecao: item.tipo_objecao,
        tipo_objecao_outro: normalizeOptionalText(item.tipo_objecao_outro),
        resposta_argumento: item.resposta_argumento.trim(),
        quando_usar: normalizeOptionalText(item.quando_usar),
      })),
    fotos_produto: normalizeStringList(values.fotos_produto),
    videos_material: normalizeStringList(values.videos_material),
    observacoes_imagens: normalizeOptionalText(values.observacoes_imagens),
    informacoes_tecnicas_complementares: normalizeOptionalText(
      values.informacoes_tecnicas_complementares,
    ),
    certificacoes_registros: normalizeOptionalText(values.certificacoes_registros),
    observacoes_comerciais: normalizeOptionalText(values.observacoes_comerciais),
    diferenciais_produto: normalizeOptionalText(values.diferenciais_produto),
    observacoes_gerais: normalizeOptionalText(values.observacoes_gerais),
  };
}

function normalizeStringList(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  );
}

function normalizeOptionalText(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeOptionalShortText(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized.slice(0, 255) : null;
}

export type ProductObjection = z.infer<typeof productObjectionSchema>;
export type ProductListItem = z.infer<typeof productListItemSchema>;
export type ProductListMeta = z.infer<typeof productListMetaSchema>;
export type ProductDetail = z.infer<typeof productDetailSchema>;
export type ProductFormValues = z.infer<typeof productFormSchema>;

