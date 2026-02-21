import { Prisma, UserRole, type produtos } from '@prisma/client';

import { logger } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';
import type { AuthActor } from '../types/auth.types.js';
import type { CreateProductInput, ProductListInput, ProductObjectionInput, UpdateProductInput } from '../types/product.types.js';
import { badRequest, forbidden, notFound } from '../utils/app-error.js';
import { getPagination } from '../utils/pagination.js';
import { createUuidV7 } from '../utils/uuid.js';

import {
  createStorageSignedReadUrlByPublicUrl,
  deleteStorageObjectByPublicUrl,
} from './storage.service.js';

type PublicProductObjection = {
  objecao_cliente: string;
  tipo_objecao: string;
  tipo_objecao_outro: string | null;
  resposta_argumento: string;
  quando_usar: string | null;
};

export async function listProducts(actor: AuthActor, input: ProductListInput) {
  const pagination = getPagination(input.page, input.page_size);
  const scopedCompanyId = resolveListCompanyScope(actor, input.company_id);

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
      company_id: item.company_id ?? null,
      nome: item.nome,
      marca: item.marca ?? null,
      codigo_interno_sku: item.codigo_interno_sku ?? null,
      categorias: item.categorias ?? [],
      tipologias_clientes: item.tipologias_clientes ?? [],
      total_objecoes: parseProductObjections(item.objecoes_argumentacoes).length,
      total_fotos: item.fotos_produto.length,
      total_videos: item.videos_material.length,
      created_at: item.created_at,
      updated_at: item.updated_at,
    })),
    meta: {
      page: pagination.page,
      page_size: pagination.page_size,
      total,
      total_pages: Math.max(1, Math.ceil(total / pagination.page_size)),
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
    id: input.id ?? createUuidV7(),
    company_id: actor.company_id!,
    nome: input.nome.trim(),
    descricao_comercial: normalizeOptionalText(input.descricao_comercial),
    codigo_interno_sku: normalizeOptionalShortText(input.codigo_interno_sku),
    marca: normalizeOptionalShortText(input.marca),
    categorias: normalizeStringList(input.categorias),
    categoria_outro: normalizeOptionalText(input.categoria_outro),
    tipologias_clientes: normalizeStringList(input.tipologias_clientes),
    tipologia_cliente_outro: normalizeOptionalText(input.tipologia_cliente_outro),
    sugestoes_receitas: normalizeOptionalText(input.sugestoes_receitas),
    codigo_barras_ean: normalizeOptionalShortText(input.codigo_barras_ean),
    codigo_barras_dun: normalizeOptionalShortText(input.codigo_barras_dun),
    codigo_fiscal_ncm: normalizeOptionalShortText(input.codigo_fiscal_ncm),
    tipo_conservacao: input.tipo_conservacao ?? null,
    tipo_conservacao_outro: normalizeOptionalText(input.tipo_conservacao_outro),
    validade_embalagem_fechada: normalizeOptionalShortText(input.validade_embalagem_fechada),
    validade_apos_abertura: normalizeOptionalShortText(input.validade_apos_abertura),
    validade_apos_preparo: normalizeOptionalShortText(input.validade_apos_preparo),
    instrucoes_conservacao_produto: normalizeOptionalText(input.instrucoes_conservacao_produto),
    restricoes_produto: normalizeOptionalText(input.restricoes_produto),
    unidade_venda: input.unidade_venda ?? null,
    unidade_venda_outro: normalizeOptionalText(input.unidade_venda_outro),
    peso_liquido_volume: normalizeOptionalShortText(input.peso_liquido_volume),
    peso_bruto: normalizeOptionalShortText(input.peso_bruto),
    qtd_unidades_por_caixa: normalizeOptionalShortText(input.qtd_unidades_por_caixa),
    instrucoes_conservacao_embalagem: normalizeOptionalText(input.instrucoes_conservacao_embalagem),
    restricoes_embalagem: normalizeOptionalText(input.restricoes_embalagem),
    possui_ingredientes: input.possui_ingredientes ?? null,
    ingredientes: normalizeOptionalText(input.ingredientes),
    alergenos: normalizeOptionalText(input.alergenos),
    produto_pronto_uso: input.produto_pronto_uso ?? null,
    produto_pronto_uso_outro: normalizeOptionalText(input.produto_pronto_uso_outro),
    modo_preparo: normalizeOptionalText(input.modo_preparo),
    observacoes_uso: normalizeOptionalText(input.observacoes_uso),
    objecoes_argumentacoes: normalizeProductObjections(input.objecoes_argumentacoes),
    fotos_produto: normalizeUrlList(input.fotos_produto),
    videos_material: normalizeUrlList(input.videos_material),
    observacoes_imagens: normalizeOptionalText(input.observacoes_imagens),
    informacoes_tecnicas_complementares: normalizeOptionalText(
      input.informacoes_tecnicas_complementares,
    ),
    certificacoes_registros: normalizeOptionalText(input.certificacoes_registros),
    observacoes_comerciais: normalizeOptionalText(input.observacoes_comerciais),
    diferenciais_produto: normalizeOptionalText(input.diferenciais_produto),
    observacoes_gerais: normalizeOptionalText(input.observacoes_gerais),
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
  if (input.descricao_comercial !== undefined) {
    data.descricao_comercial = normalizeOptionalText(input.descricao_comercial);
  }
  if (input.codigo_interno_sku !== undefined) {
    data.codigo_interno_sku = normalizeOptionalShortText(input.codigo_interno_sku);
  }
  if (input.marca !== undefined) {
    data.marca = normalizeOptionalShortText(input.marca);
  }
  if (input.categorias !== undefined) {
    data.categorias = normalizeStringList(input.categorias);
  }
  if (input.categoria_outro !== undefined) {
    data.categoria_outro = normalizeOptionalText(input.categoria_outro);
  }
  if (input.tipologias_clientes !== undefined) {
    data.tipologias_clientes = normalizeStringList(input.tipologias_clientes);
  }
  if (input.tipologia_cliente_outro !== undefined) {
    data.tipologia_cliente_outro = normalizeOptionalText(input.tipologia_cliente_outro);
  }
  if (input.sugestoes_receitas !== undefined) {
    data.sugestoes_receitas = normalizeOptionalText(input.sugestoes_receitas);
  }
  if (input.codigo_barras_ean !== undefined) {
    data.codigo_barras_ean = normalizeOptionalShortText(input.codigo_barras_ean);
  }
  if (input.codigo_barras_dun !== undefined) {
    data.codigo_barras_dun = normalizeOptionalShortText(input.codigo_barras_dun);
  }
  if (input.codigo_fiscal_ncm !== undefined) {
    data.codigo_fiscal_ncm = normalizeOptionalShortText(input.codigo_fiscal_ncm);
  }
  if (input.tipo_conservacao !== undefined) {
    data.tipo_conservacao = input.tipo_conservacao;
  }
  if (input.tipo_conservacao_outro !== undefined) {
    data.tipo_conservacao_outro = normalizeOptionalText(input.tipo_conservacao_outro);
  }
  if (input.validade_embalagem_fechada !== undefined) {
    data.validade_embalagem_fechada = normalizeOptionalShortText(input.validade_embalagem_fechada);
  }
  if (input.validade_apos_abertura !== undefined) {
    data.validade_apos_abertura = normalizeOptionalShortText(input.validade_apos_abertura);
  }
  if (input.validade_apos_preparo !== undefined) {
    data.validade_apos_preparo = normalizeOptionalShortText(input.validade_apos_preparo);
  }
  if (input.instrucoes_conservacao_produto !== undefined) {
    data.instrucoes_conservacao_produto = normalizeOptionalText(input.instrucoes_conservacao_produto);
  }
  if (input.restricoes_produto !== undefined) {
    data.restricoes_produto = normalizeOptionalText(input.restricoes_produto);
  }
  if (input.unidade_venda !== undefined) {
    data.unidade_venda = input.unidade_venda;
  }
  if (input.unidade_venda_outro !== undefined) {
    data.unidade_venda_outro = normalizeOptionalText(input.unidade_venda_outro);
  }
  if (input.peso_liquido_volume !== undefined) {
    data.peso_liquido_volume = normalizeOptionalShortText(input.peso_liquido_volume);
  }
  if (input.peso_bruto !== undefined) {
    data.peso_bruto = normalizeOptionalShortText(input.peso_bruto);
  }
  if (input.qtd_unidades_por_caixa !== undefined) {
    data.qtd_unidades_por_caixa = normalizeOptionalShortText(input.qtd_unidades_por_caixa);
  }
  if (input.instrucoes_conservacao_embalagem !== undefined) {
    data.instrucoes_conservacao_embalagem = normalizeOptionalText(
      input.instrucoes_conservacao_embalagem,
    );
  }
  if (input.restricoes_embalagem !== undefined) {
    data.restricoes_embalagem = normalizeOptionalText(input.restricoes_embalagem);
  }
  if (input.possui_ingredientes !== undefined) {
    data.possui_ingredientes = input.possui_ingredientes;
  }
  if (input.ingredientes !== undefined) {
    data.ingredientes = normalizeOptionalText(input.ingredientes);
  }
  if (input.alergenos !== undefined) {
    data.alergenos = normalizeOptionalText(input.alergenos);
  }
  if (input.produto_pronto_uso !== undefined) {
    data.produto_pronto_uso = input.produto_pronto_uso;
  }
  if (input.produto_pronto_uso_outro !== undefined) {
    data.produto_pronto_uso_outro = normalizeOptionalText(input.produto_pronto_uso_outro);
  }
  if (input.modo_preparo !== undefined) {
    data.modo_preparo = normalizeOptionalText(input.modo_preparo);
  }
  if (input.observacoes_uso !== undefined) {
    data.observacoes_uso = normalizeOptionalText(input.observacoes_uso);
  }
  if (input.objecoes_argumentacoes !== undefined) {
    data.objecoes_argumentacoes = normalizeProductObjections(input.objecoes_argumentacoes);
  }
  if (input.fotos_produto !== undefined) {
    data.fotos_produto = normalizeUrlList(input.fotos_produto);
  }
  if (input.videos_material !== undefined) {
    data.videos_material = normalizeUrlList(input.videos_material);
  }
  if (input.observacoes_imagens !== undefined) {
    data.observacoes_imagens = normalizeOptionalText(input.observacoes_imagens);
  }
  if (input.informacoes_tecnicas_complementares !== undefined) {
    data.informacoes_tecnicas_complementares = normalizeOptionalText(
      input.informacoes_tecnicas_complementares,
    );
  }
  if (input.certificacoes_registros !== undefined) {
    data.certificacoes_registros = normalizeOptionalText(input.certificacoes_registros);
  }
  if (input.observacoes_comerciais !== undefined) {
    data.observacoes_comerciais = normalizeOptionalText(input.observacoes_comerciais);
  }
  if (input.diferenciais_produto !== undefined) {
    data.diferenciais_produto = normalizeOptionalText(input.diferenciais_produto);
  }
  if (input.observacoes_gerais !== undefined) {
    data.observacoes_gerais = normalizeOptionalText(input.observacoes_gerais);
  }

  const updated = await prisma.produtos.update({
    where: { id: productId },
    data,
  });

  if (input.fotos_produto !== undefined || input.videos_material !== undefined) {
    const removedMedia = [
      ...(input.fotos_produto !== undefined
        ? existing.fotos_produto.filter((url) => !updated.fotos_produto.includes(url))
        : []),
      ...(input.videos_material !== undefined
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
      throw badRequest('company_id e obrigatorio para admin na listagem de produtos');
    }

    return requestedCompanyId;
  }

  if (!actor.company_id) {
    throw forbidden('Usuario nao vinculado a empresa');
  }

  return actor.company_id;
}

function assertReadProductScope(
  actor: AuthActor,
  targetCompanyId: string | null,
  requestedCompanyId?: string,
) {
  if (actor.role === UserRole.ADMIN) {
    if (!requestedCompanyId) {
      throw badRequest('company_id e obrigatorio para admin na visualizacao de produto');
    }

    if (requestedCompanyId !== targetCompanyId) {
      throw forbidden('Voce nao tem acesso a este produto');
    }

    return;
  }

  if (!actor.company_id || actor.company_id !== targetCompanyId) {
    throw forbidden('Voce nao tem acesso a este produto');
  }
}

function assertMutateProductScope(actor: AuthActor, targetCompanyId: string | null) {
  if (!actor.company_id || actor.company_id !== targetCompanyId) {
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

  if (!actor.company_id) {
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
    buildSignedMediaEntries(base.fotos_produto),
    buildSignedMediaEntries(base.videos_material),
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
    company_id: product.company_id ?? null,
    nome: product.nome,
    descricao_comercial: product.descricao_comercial ?? null,
    codigo_interno_sku: product.codigo_interno_sku ?? null,
    marca: product.marca ?? null,
    categorias: product.categorias ?? [],
    categoria_outro: product.categoria_outro ?? null,
    tipologias_clientes: product.tipologias_clientes ?? [],
    tipologia_cliente_outro: product.tipologia_cliente_outro ?? null,
    sugestoes_receitas: product.sugestoes_receitas ?? null,
    codigo_barras_ean: product.codigo_barras_ean ?? null,
    codigo_barras_dun: product.codigo_barras_dun ?? null,
    codigo_fiscal_ncm: product.codigo_fiscal_ncm ?? null,
    tipo_conservacao: product.tipo_conservacao ?? null,
    tipo_conservacao_outro: product.tipo_conservacao_outro ?? null,
    validade_embalagem_fechada: product.validade_embalagem_fechada ?? null,
    validade_apos_abertura: product.validade_apos_abertura ?? null,
    validade_apos_preparo: product.validade_apos_preparo ?? null,
    instrucoes_conservacao_produto: product.instrucoes_conservacao_produto ?? null,
    restricoes_produto: product.restricoes_produto ?? null,
    unidade_venda: product.unidade_venda ?? null,
    unidade_venda_outro: product.unidade_venda_outro ?? null,
    peso_liquido_volume: product.peso_liquido_volume ?? null,
    peso_bruto: product.peso_bruto ?? null,
    qtd_unidades_por_caixa: product.qtd_unidades_por_caixa ?? null,
    instrucoes_conservacao_embalagem: product.instrucoes_conservacao_embalagem ?? null,
    restricoes_embalagem: product.restricoes_embalagem ?? null,
    possui_ingredientes: product.possui_ingredientes ?? null,
    ingredientes: product.ingredientes ?? null,
    alergenos: product.alergenos ?? null,
    produto_pronto_uso: product.produto_pronto_uso ?? null,
    produto_pronto_uso_outro: product.produto_pronto_uso_outro ?? null,
    modo_preparo: product.modo_preparo ?? null,
    observacoes_uso: product.observacoes_uso ?? null,
    objecoes_argumentacoes: parseProductObjections(product.objecoes_argumentacoes),
    fotos_produto: product.fotos_produto ?? [],
    videos_material: product.videos_material ?? [],
    observacoes_imagens: product.observacoes_imagens ?? null,
    informacoes_tecnicas_complementares: product.informacoes_tecnicas_complementares ?? null,
    certificacoes_registros: product.certificacoes_registros ?? null,
    observacoes_comerciais: product.observacoes_comerciais ?? null,
    diferenciais_produto: product.diferenciais_produto ?? null,
    observacoes_gerais: product.observacoes_gerais ?? null,
    created_at: product.created_at,
    updated_at: product.updated_at,
  };
}

async function buildSignedMediaEntries(publicUrls: string[]) {
  return Promise.all(
    publicUrls.map(async (publicUrl) => {
      try {
        const signedRead = await createStorageSignedReadUrlByPublicUrl(publicUrl);
        return {
          public_url: publicUrl,
          signed_url: signedRead?.readUrl ?? null,
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
          public_url: publicUrl,
          signed_url: null,
        };
      }
    }),
  );
}

function normalizeProductObjections(input: ProductObjectionInput[]) {
  return input.map((item) => ({
    objecao_cliente: item.objecao_cliente.trim(),
    tipo_objecao: item.tipo_objecao,
    tipo_objecao_outro: normalizeOptionalText(item.tipo_objecao_outro),
    resposta_argumento: item.resposta_argumento.trim(),
    quando_usar: normalizeOptionalText(item.quando_usar),
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
    const objecao_cliente = normalizeUnknownString(record.objecao_cliente);
    const tipo_objecao = normalizeUnknownString(record.tipo_objecao);
    const resposta_argumento = normalizeUnknownString(record.resposta_argumento);

    if (!objecao_cliente || !tipo_objecao || !resposta_argumento) {
      continue;
    }

    parsed.push({
      objecao_cliente,
      tipo_objecao,
      tipo_objecao_outro: normalizeUnknownString(record.tipo_objecao_outro),
      resposta_argumento,
      quando_usar: normalizeUnknownString(record.quando_usar),
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


