import { Prisma, UserRole, type produtos } from '@prisma/client';

import { logger } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';
import type { AuthActor } from '../types/auth.types.js';
import type { CreateProductInput, ProductListInput, ProductObjectionInput, UpdateProductInput } from '../types/product.types.js';
import { badRequest, forbidden, notFound } from '../utils/app-error.js';
import { getPagination } from '../utils/pagination.js';

import {
  createStorageSignedReadUrlByPublicUrl,
  deleteStorageObjectByPublicUrl,
} from './storage.service.js';

type PublicProductObjection = {
  objecaoCliente: string;
  tipoObjecao: string;
  tipoObjecaoOutro: string | null;
  respostaArgumento: string;
  quandoUsar: string | null;
};

export async function listProducts(actor: AuthActor, input: ProductListInput) {
  const pagination = getPagination(input.page, input.pageSize);
  const scopedCompanyId = resolveListCompanyScope(actor, input.companyId);

  const where: Prisma.produtosWhereInput = {
    deleted_at: null,
    company_id: scopedCompanyId,
    ...(input.q
      ? {
          OR: [
            {
              nome: {
                contains: input.q,
                mode: 'insensitive',
              },
            },
            {
              marca: {
                contains: input.q,
                mode: 'insensitive',
              },
            },
            {
              codigo_interno_sku: {
                contains: input.q,
                mode: 'insensitive',
              },
            },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.produtos.findMany({
      where,
      skip: pagination.skip,
      take: pagination.take,
      orderBy: [{ created_at: 'desc' }],
      select: {
        id: true,
        company_id: true,
        nome: true,
        marca: true,
        codigo_interno_sku: true,
        categorias: true,
        tipologias_clientes: true,
        objecoes_argumentacoes: true,
        fotos_produto: true,
        videos_material: true,
        created_at: true,
        updated_at: true,
      },
    }),
    prisma.produtos.count({ where }),
  ]);

  return {
    items: items.map((item) => ({
      id: item.id,
      companyId: item.company_id ?? null,
      nome: item.nome,
      marca: item.marca ?? null,
      codigoInternoSku: item.codigo_interno_sku ?? null,
      categorias: item.categorias ?? [],
      tipologiasClientes: item.tipologias_clientes ?? [],
      totalObjecoes: parseProductObjections(item.objecoes_argumentacoes).length,
      totalFotos: item.fotos_produto.length,
      totalVideos: item.videos_material.length,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    })),
    meta: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pagination.pageSize)),
    },
  };
}

export async function getProductById(
  actor: AuthActor,
  productId: string,
  requestedCompanyId?: string,
) {
  const product = await prisma.produtos.findFirst({
    where: {
      id: productId,
      deleted_at: null,
    },
  });

  if (!product) {
    throw notFound('Produto nao encontrado');
  }

  assertReadProductScope(actor, product.company_id, requestedCompanyId);

  return mapProductToDetail(product, { includeSignedMedia: true });
}

export async function createProduct(actor: AuthActor, input: CreateProductInput) {
  assertCanMutateProducts(actor);

  const now = new Date();
  const data: Prisma.produtosUncheckedCreateInput = {
    ...(input.id ? { id: input.id } : {}),
    company_id: actor.companyId!,
    nome: input.nome.trim(),
    descricao_comercial: normalizeOptionalText(input.descricaoComercial),
    codigo_interno_sku: normalizeOptionalShortText(input.codigoInternoSku),
    marca: normalizeOptionalShortText(input.marca),
    categorias: normalizeStringList(input.categorias),
    categoria_outro: normalizeOptionalText(input.categoriaOutro),
    tipologias_clientes: normalizeStringList(input.tipologiasClientes),
    tipologia_cliente_outro: normalizeOptionalText(input.tipologiaClienteOutro),
    sugestoes_receitas: normalizeOptionalText(input.sugestoesReceitas),
    codigo_barras_ean: normalizeOptionalShortText(input.codigoBarrasEan),
    codigo_barras_dun: normalizeOptionalShortText(input.codigoBarrasDun),
    codigo_fiscal_ncm: normalizeOptionalShortText(input.codigoFiscalNcm),
    tipo_conservacao: input.tipoConservacao ?? null,
    tipo_conservacao_outro: normalizeOptionalText(input.tipoConservacaoOutro),
    validade_embalagem_fechada: normalizeOptionalShortText(input.validadeEmbalagemFechada),
    validade_apos_abertura: normalizeOptionalShortText(input.validadeAposAbertura),
    validade_apos_preparo: normalizeOptionalShortText(input.validadeAposPreparo),
    instrucoes_conservacao_produto: normalizeOptionalText(input.instrucoesConservacaoProduto),
    restricoes_produto: normalizeOptionalText(input.restricoesProduto),
    unidade_venda: input.unidadeVenda ?? null,
    unidade_venda_outro: normalizeOptionalText(input.unidadeVendaOutro),
    peso_liquido_volume: normalizeOptionalShortText(input.pesoLiquidoVolume),
    peso_bruto: normalizeOptionalShortText(input.pesoBruto),
    qtd_unidades_por_caixa: normalizeOptionalShortText(input.qtdUnidadesPorCaixa),
    instrucoes_conservacao_embalagem: normalizeOptionalText(input.instrucoesConservacaoEmbalagem),
    restricoes_embalagem: normalizeOptionalText(input.restricoesEmbalagem),
    possui_ingredientes: input.possuiIngredientes ?? null,
    ingredientes: normalizeOptionalText(input.ingredientes),
    alergenos: normalizeOptionalText(input.alergenos),
    produto_pronto_uso: input.produtoProntoUso ?? null,
    produto_pronto_uso_outro: normalizeOptionalText(input.produtoProntoUsoOutro),
    modo_preparo: normalizeOptionalText(input.modoPreparo),
    observacoes_uso: normalizeOptionalText(input.observacoesUso),
    objecoes_argumentacoes: normalizeProductObjections(input.objecoesArgumentacoes),
    fotos_produto: normalizeUrlList(input.fotosProduto),
    videos_material: normalizeUrlList(input.videosMaterial),
    observacoes_imagens: normalizeOptionalText(input.observacoesImagens),
    informacoes_tecnicas_complementares: normalizeOptionalText(
      input.informacoesTecnicasComplementares,
    ),
    certificacoes_registros: normalizeOptionalText(input.certificacoesRegistros),
    observacoes_comerciais: normalizeOptionalText(input.observacoesComerciais),
    diferenciais_produto: normalizeOptionalText(input.diferenciaisProduto),
    observacoes_gerais: normalizeOptionalText(input.observacoesGerais),
    created_at: now,
    updated_at: now,
  };

  const created = await prisma.produtos.create({ data });
  return mapProductToDetail(created, { includeSignedMedia: false });
}

export async function updateProduct(actor: AuthActor, productId: string, input: UpdateProductInput) {
  assertCanMutateProducts(actor);

  const existing = await prisma.produtos.findFirst({
    where: {
      id: productId,
      deleted_at: null,
    },
  });

  if (!existing) {
    throw notFound('Produto nao encontrado');
  }

  assertMutateProductScope(actor, existing.company_id);

  const data: Prisma.produtosUpdateInput = {
    updated_at: new Date(),
  };

  if (input.nome !== undefined) {
    data.nome = input.nome.trim();
  }
  if (input.descricaoComercial !== undefined) {
    data.descricao_comercial = normalizeOptionalText(input.descricaoComercial);
  }
  if (input.codigoInternoSku !== undefined) {
    data.codigo_interno_sku = normalizeOptionalShortText(input.codigoInternoSku);
  }
  if (input.marca !== undefined) {
    data.marca = normalizeOptionalShortText(input.marca);
  }
  if (input.categorias !== undefined) {
    data.categorias = normalizeStringList(input.categorias);
  }
  if (input.categoriaOutro !== undefined) {
    data.categoria_outro = normalizeOptionalText(input.categoriaOutro);
  }
  if (input.tipologiasClientes !== undefined) {
    data.tipologias_clientes = normalizeStringList(input.tipologiasClientes);
  }
  if (input.tipologiaClienteOutro !== undefined) {
    data.tipologia_cliente_outro = normalizeOptionalText(input.tipologiaClienteOutro);
  }
  if (input.sugestoesReceitas !== undefined) {
    data.sugestoes_receitas = normalizeOptionalText(input.sugestoesReceitas);
  }
  if (input.codigoBarrasEan !== undefined) {
    data.codigo_barras_ean = normalizeOptionalShortText(input.codigoBarrasEan);
  }
  if (input.codigoBarrasDun !== undefined) {
    data.codigo_barras_dun = normalizeOptionalShortText(input.codigoBarrasDun);
  }
  if (input.codigoFiscalNcm !== undefined) {
    data.codigo_fiscal_ncm = normalizeOptionalShortText(input.codigoFiscalNcm);
  }
  if (input.tipoConservacao !== undefined) {
    data.tipo_conservacao = input.tipoConservacao;
  }
  if (input.tipoConservacaoOutro !== undefined) {
    data.tipo_conservacao_outro = normalizeOptionalText(input.tipoConservacaoOutro);
  }
  if (input.validadeEmbalagemFechada !== undefined) {
    data.validade_embalagem_fechada = normalizeOptionalShortText(input.validadeEmbalagemFechada);
  }
  if (input.validadeAposAbertura !== undefined) {
    data.validade_apos_abertura = normalizeOptionalShortText(input.validadeAposAbertura);
  }
  if (input.validadeAposPreparo !== undefined) {
    data.validade_apos_preparo = normalizeOptionalShortText(input.validadeAposPreparo);
  }
  if (input.instrucoesConservacaoProduto !== undefined) {
    data.instrucoes_conservacao_produto = normalizeOptionalText(input.instrucoesConservacaoProduto);
  }
  if (input.restricoesProduto !== undefined) {
    data.restricoes_produto = normalizeOptionalText(input.restricoesProduto);
  }
  if (input.unidadeVenda !== undefined) {
    data.unidade_venda = input.unidadeVenda;
  }
  if (input.unidadeVendaOutro !== undefined) {
    data.unidade_venda_outro = normalizeOptionalText(input.unidadeVendaOutro);
  }
  if (input.pesoLiquidoVolume !== undefined) {
    data.peso_liquido_volume = normalizeOptionalShortText(input.pesoLiquidoVolume);
  }
  if (input.pesoBruto !== undefined) {
    data.peso_bruto = normalizeOptionalShortText(input.pesoBruto);
  }
  if (input.qtdUnidadesPorCaixa !== undefined) {
    data.qtd_unidades_por_caixa = normalizeOptionalShortText(input.qtdUnidadesPorCaixa);
  }
  if (input.instrucoesConservacaoEmbalagem !== undefined) {
    data.instrucoes_conservacao_embalagem = normalizeOptionalText(
      input.instrucoesConservacaoEmbalagem,
    );
  }
  if (input.restricoesEmbalagem !== undefined) {
    data.restricoes_embalagem = normalizeOptionalText(input.restricoesEmbalagem);
  }
  if (input.possuiIngredientes !== undefined) {
    data.possui_ingredientes = input.possuiIngredientes;
  }
  if (input.ingredientes !== undefined) {
    data.ingredientes = normalizeOptionalText(input.ingredientes);
  }
  if (input.alergenos !== undefined) {
    data.alergenos = normalizeOptionalText(input.alergenos);
  }
  if (input.produtoProntoUso !== undefined) {
    data.produto_pronto_uso = input.produtoProntoUso;
  }
  if (input.produtoProntoUsoOutro !== undefined) {
    data.produto_pronto_uso_outro = normalizeOptionalText(input.produtoProntoUsoOutro);
  }
  if (input.modoPreparo !== undefined) {
    data.modo_preparo = normalizeOptionalText(input.modoPreparo);
  }
  if (input.observacoesUso !== undefined) {
    data.observacoes_uso = normalizeOptionalText(input.observacoesUso);
  }
  if (input.objecoesArgumentacoes !== undefined) {
    data.objecoes_argumentacoes = normalizeProductObjections(input.objecoesArgumentacoes);
  }
  if (input.fotosProduto !== undefined) {
    data.fotos_produto = normalizeUrlList(input.fotosProduto);
  }
  if (input.videosMaterial !== undefined) {
    data.videos_material = normalizeUrlList(input.videosMaterial);
  }
  if (input.observacoesImagens !== undefined) {
    data.observacoes_imagens = normalizeOptionalText(input.observacoesImagens);
  }
  if (input.informacoesTecnicasComplementares !== undefined) {
    data.informacoes_tecnicas_complementares = normalizeOptionalText(
      input.informacoesTecnicasComplementares,
    );
  }
  if (input.certificacoesRegistros !== undefined) {
    data.certificacoes_registros = normalizeOptionalText(input.certificacoesRegistros);
  }
  if (input.observacoesComerciais !== undefined) {
    data.observacoes_comerciais = normalizeOptionalText(input.observacoesComerciais);
  }
  if (input.diferenciaisProduto !== undefined) {
    data.diferenciais_produto = normalizeOptionalText(input.diferenciaisProduto);
  }
  if (input.observacoesGerais !== undefined) {
    data.observacoes_gerais = normalizeOptionalText(input.observacoesGerais);
  }

  const updated = await prisma.produtos.update({
    where: { id: productId },
    data,
  });

  if (input.fotosProduto !== undefined || input.videosMaterial !== undefined) {
    const removedMedia = [
      ...(input.fotosProduto !== undefined
        ? existing.fotos_produto.filter((url) => !updated.fotos_produto.includes(url))
        : []),
      ...(input.videosMaterial !== undefined
        ? existing.videos_material.filter((url) => !updated.videos_material.includes(url))
        : []),
    ];

    await Promise.all(
      removedMedia.map(async (publicUrl) => {
        try {
          await deleteStorageObjectByPublicUrl(publicUrl);
        } catch (error) {
          logger.warn(
            {
              err: error,
              productId,
              publicUrl,
            },
            'failed to delete removed product media from storage',
          );
        }
      }),
    );
  }

  return mapProductToDetail(updated, { includeSignedMedia: false });
}

export async function deleteProduct(actor: AuthActor, productId: string) {
  assertCanMutateProducts(actor);

  const existing = await prisma.produtos.findFirst({
    where: {
      id: productId,
      deleted_at: null,
    },
  });

  if (!existing) {
    throw notFound('Produto nao encontrado');
  }

  assertMutateProductScope(actor, existing.company_id);

  const now = new Date();
  await prisma.produtos.update({
    where: { id: productId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });

  await Promise.all(
    [...existing.fotos_produto, ...existing.videos_material].map(async (publicUrl) => {
      try {
        await deleteStorageObjectByPublicUrl(publicUrl);
      } catch (error) {
        logger.warn(
          {
            err: error,
            productId,
            publicUrl,
          },
          'failed to delete product media after soft delete',
        );
      }
    }),
  );
}

function resolveListCompanyScope(actor: AuthActor, requestedCompanyId?: string) {
  if (actor.role === UserRole.ADMIN) {
    if (!requestedCompanyId) {
      throw badRequest('companyId e obrigatorio para admin na listagem de produtos');
    }

    return requestedCompanyId;
  }

  if (!actor.companyId) {
    throw forbidden('Usuario nao vinculado a empresa');
  }

  return actor.companyId;
}

function assertReadProductScope(
  actor: AuthActor,
  targetCompanyId: string | null,
  requestedCompanyId?: string,
) {
  if (actor.role === UserRole.ADMIN) {
    if (!requestedCompanyId) {
      throw badRequest('companyId e obrigatorio para admin na visualizacao de produto');
    }

    if (requestedCompanyId !== targetCompanyId) {
      throw forbidden('Voce nao tem acesso a este produto');
    }

    return;
  }

  if (!actor.companyId || actor.companyId !== targetCompanyId) {
    throw forbidden('Voce nao tem acesso a este produto');
  }
}

function assertMutateProductScope(actor: AuthActor, targetCompanyId: string | null) {
  if (!actor.companyId || actor.companyId !== targetCompanyId) {
    throw forbidden('Voce nao pode alterar produtos de outra empresa');
  }
}

function assertCanMutateProducts(actor: AuthActor) {
  if (
    actor.role !== UserRole.DIRETOR &&
    actor.role !== UserRole.GERENTE_COMERCIAL &&
    actor.role !== UserRole.SUPERVISOR
  ) {
    throw forbidden('Perfil sem permissao para alterar produtos');
  }

  if (!actor.companyId) {
    throw forbidden('Usuario nao vinculado a empresa');
  }
}

async function mapProductToDetail(
  product: produtos,
  options: {
    includeSignedMedia: boolean;
  },
) {
  const base = mapProductToPublicData(product);

  if (!options.includeSignedMedia) {
    return base;
  }

  const [fotos, videos] = await Promise.all([
    buildSignedMediaEntries(base.fotosProduto),
    buildSignedMediaEntries(base.videosMaterial),
  ]);

  return {
    ...base,
    media: {
      fotos,
      videos,
    },
  };
}

function mapProductToPublicData(product: produtos) {
  return {
    id: product.id,
    companyId: product.company_id ?? null,
    nome: product.nome,
    descricaoComercial: product.descricao_comercial ?? null,
    codigoInternoSku: product.codigo_interno_sku ?? null,
    marca: product.marca ?? null,
    categorias: product.categorias ?? [],
    categoriaOutro: product.categoria_outro ?? null,
    tipologiasClientes: product.tipologias_clientes ?? [],
    tipologiaClienteOutro: product.tipologia_cliente_outro ?? null,
    sugestoesReceitas: product.sugestoes_receitas ?? null,
    codigoBarrasEan: product.codigo_barras_ean ?? null,
    codigoBarrasDun: product.codigo_barras_dun ?? null,
    codigoFiscalNcm: product.codigo_fiscal_ncm ?? null,
    tipoConservacao: product.tipo_conservacao ?? null,
    tipoConservacaoOutro: product.tipo_conservacao_outro ?? null,
    validadeEmbalagemFechada: product.validade_embalagem_fechada ?? null,
    validadeAposAbertura: product.validade_apos_abertura ?? null,
    validadeAposPreparo: product.validade_apos_preparo ?? null,
    instrucoesConservacaoProduto: product.instrucoes_conservacao_produto ?? null,
    restricoesProduto: product.restricoes_produto ?? null,
    unidadeVenda: product.unidade_venda ?? null,
    unidadeVendaOutro: product.unidade_venda_outro ?? null,
    pesoLiquidoVolume: product.peso_liquido_volume ?? null,
    pesoBruto: product.peso_bruto ?? null,
    qtdUnidadesPorCaixa: product.qtd_unidades_por_caixa ?? null,
    instrucoesConservacaoEmbalagem: product.instrucoes_conservacao_embalagem ?? null,
    restricoesEmbalagem: product.restricoes_embalagem ?? null,
    possuiIngredientes: product.possui_ingredientes ?? null,
    ingredientes: product.ingredientes ?? null,
    alergenos: product.alergenos ?? null,
    produtoProntoUso: product.produto_pronto_uso ?? null,
    produtoProntoUsoOutro: product.produto_pronto_uso_outro ?? null,
    modoPreparo: product.modo_preparo ?? null,
    observacoesUso: product.observacoes_uso ?? null,
    objecoesArgumentacoes: parseProductObjections(product.objecoes_argumentacoes),
    fotosProduto: product.fotos_produto ?? [],
    videosMaterial: product.videos_material ?? [],
    observacoesImagens: product.observacoes_imagens ?? null,
    informacoesTecnicasComplementares: product.informacoes_tecnicas_complementares ?? null,
    certificacoesRegistros: product.certificacoes_registros ?? null,
    observacoesComerciais: product.observacoes_comerciais ?? null,
    diferenciaisProduto: product.diferenciais_produto ?? null,
    observacoesGerais: product.observacoes_gerais ?? null,
    createdAt: product.created_at,
    updatedAt: product.updated_at,
  };
}

async function buildSignedMediaEntries(publicUrls: string[]) {
  return Promise.all(
    publicUrls.map(async (publicUrl) => {
      try {
        const signedRead = await createStorageSignedReadUrlByPublicUrl(publicUrl);
        return {
          publicUrl,
          signedUrl: signedRead?.readUrl ?? null,
        };
      } catch (error) {
        logger.warn(
          {
            err: error,
            publicUrl,
          },
          'failed to create signed read url for product media',
        );

        return {
          publicUrl,
          signedUrl: null,
        };
      }
    }),
  );
}

function normalizeProductObjections(input: ProductObjectionInput[]) {
  return input.map((item) => ({
    objecaoCliente: item.objecaoCliente.trim(),
    tipoObjecao: item.tipoObjecao,
    tipoObjecaoOutro: normalizeOptionalText(item.tipoObjecaoOutro),
    respostaArgumento: item.respostaArgumento.trim(),
    quandoUsar: normalizeOptionalText(item.quandoUsar),
  })) as Prisma.InputJsonValue;
}

function parseProductObjections(value: Prisma.JsonValue | null | undefined): PublicProductObjection[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const parsed: PublicProductObjection[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      continue;
    }

    const record = item as Record<string, unknown>;
    const objecaoCliente = normalizeUnknownString(record.objecaoCliente);
    const tipoObjecao = normalizeUnknownString(record.tipoObjecao);
    const respostaArgumento = normalizeUnknownString(record.respostaArgumento);

    if (!objecaoCliente || !tipoObjecao || !respostaArgumento) {
      continue;
    }

    parsed.push({
      objecaoCliente,
      tipoObjecao,
      tipoObjecaoOutro: normalizeUnknownString(record.tipoObjecaoOutro),
      respostaArgumento,
      quandoUsar: normalizeUnknownString(record.quandoUsar),
    });
  }

  return parsed;
}

function normalizeUnknownString(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeOptionalShortText(value?: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized.slice(0, 255) : null;
}

function normalizeOptionalText(value?: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
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

function normalizeUrlList(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  );
}
