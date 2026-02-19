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
  objecaoCliente: z.string().trim().max(2000),
  tipoObjecao: z.enum([
    "PRECO",
    "QUALIDADE",
    "OPERACAO",
    "LOGISTICA",
    "CONFIANCA",
    "OUTRO",
  ]),
  tipoObjecaoOutro: z.string().trim().max(2000),
  respostaArgumento: z.string().trim().max(2000),
  quandoUsar: z.string().trim().max(2000),
});

export const productObjectionApiSchema = productObjectionSchema.extend({
  tipoObjecaoOutro: z.string().trim().max(2000).nullable(),
  quandoUsar: z.string().trim().max(2000).nullable(),
});

export const productListItemSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().nullable(),
  nome: z.string().min(1),
  marca: z.string().nullable(),
  codigoInternoSku: z.string().nullable(),
  categorias: z.array(z.string()),
  tipologiasClientes: z.array(z.string()),
  totalObjecoes: z.number().int().nonnegative(),
  totalFotos: z.number().int().nonnegative(),
  totalVideos: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const productListMetaSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().positive(),
});

export const productsApiResponseSchema = z.object({
  data: z.array(productListItemSchema),
  meta: productListMetaSchema,
});

export const productMediaItemSchema = z.object({
  publicUrl: z.string().url(),
  signedUrl: z.string().url().nullable(),
});

export const productDetailSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().nullable(),
  nome: z.string().min(1),
  descricaoComercial: z.string().nullable(),
  codigoInternoSku: z.string().nullable(),
  marca: z.string().nullable(),
  categorias: z.array(z.string()),
  categoriaOutro: z.string().nullable(),
  tipologiasClientes: z.array(z.string()),
  tipologiaClienteOutro: z.string().nullable(),
  sugestoesReceitas: z.string().nullable(),
  codigoBarrasEan: z.string().nullable(),
  codigoBarrasDun: z.string().nullable(),
  codigoFiscalNcm: z.string().nullable(),
  tipoConservacao: z
    .enum(["CONGELADO", "REFRIGERADO", "AMBIENTE", "OUTRO"])
    .nullable(),
  tipoConservacaoOutro: z.string().nullable(),
  validadeEmbalagemFechada: z.string().nullable(),
  validadeAposAbertura: z.string().nullable(),
  validadeAposPreparo: z.string().nullable(),
  instrucoesConservacaoProduto: z.string().nullable(),
  restricoesProduto: z.string().nullable(),
  unidadeVenda: z.enum(["UNIDADE", "CAIXA", "LITRO", "GALAO", "OUTRO"]).nullable(),
  unidadeVendaOutro: z.string().nullable(),
  pesoLiquidoVolume: z.string().nullable(),
  pesoBruto: z.string().nullable(),
  qtdUnidadesPorCaixa: z.string().nullable(),
  instrucoesConservacaoEmbalagem: z.string().nullable(),
  restricoesEmbalagem: z.string().nullable(),
  possuiIngredientes: z.boolean().nullable(),
  ingredientes: z.string().nullable(),
  alergenos: z.string().nullable(),
  produtoProntoUso: z.enum(["SIM", "NAO", "OUTRO"]).nullable(),
  produtoProntoUsoOutro: z.string().nullable(),
  modoPreparo: z.string().nullable(),
  observacoesUso: z.string().nullable(),
  objecoesArgumentacoes: z.array(productObjectionApiSchema),
  fotosProduto: z.array(z.string().url()),
  videosMaterial: z.array(z.string().url()),
  observacoesImagens: z.string().nullable(),
  informacoesTecnicasComplementares: z.string().nullable(),
  certificacoesRegistros: z.string().nullable(),
  observacoesComerciais: z.string().nullable(),
  diferenciaisProduto: z.string().nullable(),
  observacoesGerais: z.string().nullable(),
  media: z
    .object({
      fotos: z.array(productMediaItemSchema),
      videos: z.array(productMediaItemSchema),
    })
    .optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
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
    descricaoComercial: z.string().trim().max(4000),
    codigoInternoSku: z.string().trim().max(255),
    marca: z.string().trim().max(255),
    categorias: z.array(z.string()),
    categoriaOutro: z.string().trim().max(4000),
    tipologiasClientes: z.array(z.string()),
    tipologiaClienteOutro: z.string().trim().max(4000),
    sugestoesReceitas: z.string().trim().max(4000),
    codigoBarrasEan: z.string().trim().max(255),
    codigoBarrasDun: z.string().trim().max(255),
    codigoFiscalNcm: z.string().trim().max(255),
    tipoConservacao: z
      .enum(["CONGELADO", "REFRIGERADO", "AMBIENTE", "OUTRO"])
      .nullable(),
    tipoConservacaoOutro: z.string().trim().max(4000),
    validadeEmbalagemFechada: z.string().trim().max(255),
    validadeAposAbertura: z.string().trim().max(255),
    validadeAposPreparo: z.string().trim().max(255),
    instrucoesConservacaoProduto: z.string().trim().max(4000),
    restricoesProduto: z.string().trim().max(4000),
    unidadeVenda: z.enum(["UNIDADE", "CAIXA", "LITRO", "GALAO", "OUTRO"]).nullable(),
    unidadeVendaOutro: z.string().trim().max(4000),
    pesoLiquidoVolume: z.string().trim().max(255),
    pesoBruto: z.string().trim().max(255),
    qtdUnidadesPorCaixa: z.string().trim().max(255),
    instrucoesConservacaoEmbalagem: z.string().trim().max(4000),
    restricoesEmbalagem: z.string().trim().max(4000),
    possuiIngredientes: z.boolean().nullable(),
    ingredientes: z.string().trim().max(4000),
    alergenos: z.string().trim().max(4000),
    produtoProntoUso: z.enum(["SIM", "NAO", "OUTRO"]).nullable(),
    produtoProntoUsoOutro: z.string().trim().max(4000),
    modoPreparo: z.string().trim().max(4000),
    observacoesUso: z.string().trim().max(4000),
    objecoesArgumentacoes: z.array(productObjectionSchema),
    fotosProduto: z.array(z.string().url()),
    videosMaterial: z.array(z.string().url()),
    observacoesImagens: z.string().trim().max(4000),
    informacoesTecnicasComplementares: z.string().trim().max(4000),
    certificacoesRegistros: z.string().trim().max(4000),
    observacoesComerciais: z.string().trim().max(4000),
    diferenciaisProduto: z.string().trim().max(4000),
    observacoesGerais: z.string().trim().max(4000),
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
    if (hasCategoriaOutro && !value.categoriaOutro.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["categoriaOutro"],
        message: "Preencha a categoria 'Outro'.",
      });
    }
    if (!hasCategoriaOutro && value.categoriaOutro.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["categoriaOutro"],
        message: "Campo deve ficar vazio quando 'Outro' não está selecionado.",
      });
    }

    const hasTipologiaOutro = value.tipologiasClientes.includes("OUTRO");
    if (hasTipologiaOutro && !value.tipologiaClienteOutro.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tipologiaClienteOutro"],
        message: "Preencha a tipologia 'Outro'.",
      });
    }
    if (!hasTipologiaOutro && value.tipologiaClienteOutro.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tipologiaClienteOutro"],
        message: "Campo deve ficar vazio quando 'Outro' não está selecionado.",
      });
    }

    if (value.tipoConservacao === "OUTRO" && !value.tipoConservacaoOutro.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tipoConservacaoOutro"],
        message: "Preencha o tipo de conservação 'Outro'.",
      });
    }
    if (value.tipoConservacao !== "OUTRO" && value.tipoConservacaoOutro.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tipoConservacaoOutro"],
        message: "Campo deve ficar vazio quando tipo de conservação não é 'Outro'.",
      });
    }

    if (value.unidadeVenda === "OUTRO" && !value.unidadeVendaOutro.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["unidadeVendaOutro"],
        message: "Preencha a unidade de venda 'Outro'.",
      });
    }
    if (value.unidadeVenda !== "OUTRO" && value.unidadeVendaOutro.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["unidadeVendaOutro"],
        message: "Campo deve ficar vazio quando unidade de venda não é 'Outro'.",
      });
    }

    if (value.produtoProntoUso === "OUTRO" && !value.produtoProntoUsoOutro.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["produtoProntoUsoOutro"],
        message: "Preencha o campo 'Outro' de pronto para uso.",
      });
    }
    if (value.produtoProntoUso !== "OUTRO" && value.produtoProntoUsoOutro.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["produtoProntoUsoOutro"],
        message: "Campo deve ficar vazio quando pronto para uso não é 'Outro'.",
      });
    }

    value.objecoesArgumentacoes.forEach((item, index) => {
      if (isProductObjectionEmpty(item)) {
        return;
      }

      if (!item.objecaoCliente.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["objecoesArgumentacoes", index, "objecaoCliente"],
          message: "Informe a objeção do cliente.",
        });
      }
      if (!item.respostaArgumento.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["objecoesArgumentacoes", index, "respostaArgumento"],
          message: "Informe a resposta/argumento.",
        });
      }
      if (item.tipoObjecao === "OUTRO" && !item.tipoObjecaoOutro.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["objecoesArgumentacoes", index, "tipoObjecaoOutro"],
          message: "Preencha o tipo de objeção 'Outro'.",
        });
      }
      if (item.tipoObjecao !== "OUTRO" && item.tipoObjecaoOutro.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["objecoesArgumentacoes", index, "tipoObjecaoOutro"],
          message: "Campo deve ficar vazio quando o tipo de objeção não é 'Outro'.",
        });
      }
    });
  });

export function createEmptyProductObjection(): ProductObjection {
  return {
    objecaoCliente: "",
    tipoObjecao: "PRECO",
    tipoObjecaoOutro: "",
    respostaArgumento: "",
    quandoUsar: "",
  };
}

export function isProductObjectionEmpty(item: ProductObjection) {
  return (
    item.objecaoCliente.trim().length === 0 &&
    item.respostaArgumento.trim().length === 0 &&
    item.tipoObjecaoOutro.trim().length === 0 &&
    item.quandoUsar.trim().length === 0
  );
}

export function createEmptyProductFormValues(id?: string): ProductFormValues {
  return {
    id,
    nome: "",
    descricaoComercial: "",
    codigoInternoSku: "",
    marca: "",
    categorias: [],
    categoriaOutro: "",
    tipologiasClientes: [],
    tipologiaClienteOutro: "",
    sugestoesReceitas: "",
    codigoBarrasEan: "",
    codigoBarrasDun: "",
    codigoFiscalNcm: "",
    tipoConservacao: null,
    tipoConservacaoOutro: "",
    validadeEmbalagemFechada: "",
    validadeAposAbertura: "",
    validadeAposPreparo: "",
    instrucoesConservacaoProduto: "",
    restricoesProduto: "",
    unidadeVenda: null,
    unidadeVendaOutro: "",
    pesoLiquidoVolume: "",
    pesoBruto: "",
    qtdUnidadesPorCaixa: "",
    instrucoesConservacaoEmbalagem: "",
    restricoesEmbalagem: "",
    possuiIngredientes: null,
    ingredientes: "",
    alergenos: "",
    produtoProntoUso: null,
    produtoProntoUsoOutro: "",
    modoPreparo: "",
    observacoesUso: "",
    objecoesArgumentacoes: [createEmptyProductObjection()],
    fotosProduto: [],
    videosMaterial: [],
    observacoesImagens: "",
    informacoesTecnicasComplementares: "",
    certificacoesRegistros: "",
    observacoesComerciais: "",
    diferenciaisProduto: "",
    observacoesGerais: "",
  };
}

export function mapProductDetailToFormValues(detail: ProductDetail): ProductFormValues {
  return {
    id: detail.id,
    nome: detail.nome,
    descricaoComercial: detail.descricaoComercial ?? "",
    codigoInternoSku: detail.codigoInternoSku ?? "",
    marca: detail.marca ?? "",
    categorias: detail.categorias ?? [],
    categoriaOutro: detail.categoriaOutro ?? "",
    tipologiasClientes: detail.tipologiasClientes ?? [],
    tipologiaClienteOutro: detail.tipologiaClienteOutro ?? "",
    sugestoesReceitas: detail.sugestoesReceitas ?? "",
    codigoBarrasEan: detail.codigoBarrasEan ?? "",
    codigoBarrasDun: detail.codigoBarrasDun ?? "",
    codigoFiscalNcm: detail.codigoFiscalNcm ?? "",
    tipoConservacao: detail.tipoConservacao ?? null,
    tipoConservacaoOutro: detail.tipoConservacaoOutro ?? "",
    validadeEmbalagemFechada: detail.validadeEmbalagemFechada ?? "",
    validadeAposAbertura: detail.validadeAposAbertura ?? "",
    validadeAposPreparo: detail.validadeAposPreparo ?? "",
    instrucoesConservacaoProduto: detail.instrucoesConservacaoProduto ?? "",
    restricoesProduto: detail.restricoesProduto ?? "",
    unidadeVenda: detail.unidadeVenda ?? null,
    unidadeVendaOutro: detail.unidadeVendaOutro ?? "",
    pesoLiquidoVolume: detail.pesoLiquidoVolume ?? "",
    pesoBruto: detail.pesoBruto ?? "",
    qtdUnidadesPorCaixa: detail.qtdUnidadesPorCaixa ?? "",
    instrucoesConservacaoEmbalagem: detail.instrucoesConservacaoEmbalagem ?? "",
    restricoesEmbalagem: detail.restricoesEmbalagem ?? "",
    possuiIngredientes: detail.possuiIngredientes,
    ingredientes: detail.ingredientes ?? "",
    alergenos: detail.alergenos ?? "",
    produtoProntoUso: detail.produtoProntoUso ?? null,
    produtoProntoUsoOutro: detail.produtoProntoUsoOutro ?? "",
    modoPreparo: detail.modoPreparo ?? "",
    observacoesUso: detail.observacoesUso ?? "",
    objecoesArgumentacoes:
      detail.objecoesArgumentacoes.length > 0
        ? detail.objecoesArgumentacoes.map((item) => ({
            objecaoCliente: item.objecaoCliente,
            tipoObjecao: item.tipoObjecao,
            tipoObjecaoOutro: item.tipoObjecaoOutro ?? "",
            respostaArgumento: item.respostaArgumento,
            quandoUsar: item.quandoUsar ?? "",
          }))
        : [createEmptyProductObjection()],
    fotosProduto: detail.fotosProduto ?? [],
    videosMaterial: detail.videosMaterial ?? [],
    observacoesImagens: detail.observacoesImagens ?? "",
    informacoesTecnicasComplementares:
      detail.informacoesTecnicasComplementares ?? "",
    certificacoesRegistros: detail.certificacoesRegistros ?? "",
    observacoesComerciais: detail.observacoesComerciais ?? "",
    diferenciaisProduto: detail.diferenciaisProduto ?? "",
    observacoesGerais: detail.observacoesGerais ?? "",
  };
}

export function buildProductPayloadFromForm(values: ProductFormValues) {
  return {
    ...(values.id ? { id: values.id } : {}),
    nome: values.nome.trim(),
    descricaoComercial: normalizeOptionalText(values.descricaoComercial),
    codigoInternoSku: normalizeOptionalShortText(values.codigoInternoSku),
    marca: normalizeOptionalShortText(values.marca),
    categorias: normalizeStringList(values.categorias),
    categoriaOutro: normalizeOptionalText(values.categoriaOutro),
    tipologiasClientes: normalizeStringList(values.tipologiasClientes),
    tipologiaClienteOutro: normalizeOptionalText(values.tipologiaClienteOutro),
    sugestoesReceitas: normalizeOptionalText(values.sugestoesReceitas),
    codigoBarrasEan: normalizeOptionalShortText(values.codigoBarrasEan),
    codigoBarrasDun: normalizeOptionalShortText(values.codigoBarrasDun),
    codigoFiscalNcm: normalizeOptionalShortText(values.codigoFiscalNcm),
    tipoConservacao: values.tipoConservacao,
    tipoConservacaoOutro: normalizeOptionalText(values.tipoConservacaoOutro),
    validadeEmbalagemFechada: normalizeOptionalShortText(
      values.validadeEmbalagemFechada,
    ),
    validadeAposAbertura: normalizeOptionalShortText(values.validadeAposAbertura),
    validadeAposPreparo: normalizeOptionalShortText(values.validadeAposPreparo),
    instrucoesConservacaoProduto: normalizeOptionalText(
      values.instrucoesConservacaoProduto,
    ),
    restricoesProduto: normalizeOptionalText(values.restricoesProduto),
    unidadeVenda: values.unidadeVenda,
    unidadeVendaOutro: normalizeOptionalText(values.unidadeVendaOutro),
    pesoLiquidoVolume: normalizeOptionalShortText(values.pesoLiquidoVolume),
    pesoBruto: normalizeOptionalShortText(values.pesoBruto),
    qtdUnidadesPorCaixa: normalizeOptionalShortText(values.qtdUnidadesPorCaixa),
    instrucoesConservacaoEmbalagem: normalizeOptionalText(
      values.instrucoesConservacaoEmbalagem,
    ),
    restricoesEmbalagem: normalizeOptionalText(values.restricoesEmbalagem),
    possuiIngredientes: values.possuiIngredientes,
    ingredientes: normalizeOptionalText(values.ingredientes),
    alergenos: normalizeOptionalText(values.alergenos),
    produtoProntoUso: values.produtoProntoUso,
    produtoProntoUsoOutro: normalizeOptionalText(values.produtoProntoUsoOutro),
    modoPreparo: normalizeOptionalText(values.modoPreparo),
    observacoesUso: normalizeOptionalText(values.observacoesUso),
    objecoesArgumentacoes: values.objecoesArgumentacoes
      .filter((item) => !isProductObjectionEmpty(item))
      .map((item) => ({
        objecaoCliente: item.objecaoCliente.trim(),
        tipoObjecao: item.tipoObjecao,
        tipoObjecaoOutro: normalizeOptionalText(item.tipoObjecaoOutro),
        respostaArgumento: item.respostaArgumento.trim(),
        quandoUsar: normalizeOptionalText(item.quandoUsar),
      })),
    fotosProduto: normalizeStringList(values.fotosProduto),
    videosMaterial: normalizeStringList(values.videosMaterial),
    observacoesImagens: normalizeOptionalText(values.observacoesImagens),
    informacoesTecnicasComplementares: normalizeOptionalText(
      values.informacoesTecnicasComplementares,
    ),
    certificacoesRegistros: normalizeOptionalText(values.certificacoesRegistros),
    observacoesComerciais: normalizeOptionalText(values.observacoesComerciais),
    diferenciaisProduto: normalizeOptionalText(values.diferenciaisProduto),
    observacoesGerais: normalizeOptionalText(values.observacoesGerais),
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
