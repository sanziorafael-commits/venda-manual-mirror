/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useAuthHydrated, useAuthUser } from "@/hooks/use-auth-user";
import { apiFetch } from "@/lib/api-client";
import { parseApiError } from "@/lib/api-error";
import { tryApiDelete } from "@/lib/try-api";
import {
  CATEGORY_LABEL_BY_VALUE,
  CLIENT_TYPE_LABEL_BY_VALUE,
  CONSERVATION_LABEL_BY_VALUE,
  OBJECTION_TYPE_LABEL_BY_VALUE,
  READY_TO_USE_LABEL_BY_VALUE,
  SALE_UNIT_LABEL_BY_VALUE,
  productDetailApiResponseSchema,
  type ProductDetail,
} from "@/schemas/product";
import {
  isPlatformAdminContext,
  useSelectedCompanyContext,
} from "@/stores/company-context-store";

type ProductDetailsWrapperProps = {
  product_id: string;
};

export function ProductDetailsWrapper({
  product_id,
}: ProductDetailsWrapperProps) {
  const router = useRouter();
  const authHydrated = useAuthHydrated();
  const authUser = useAuthUser();
  const selectedCompanyContext = useSelectedCompanyContext();
  const isAdmin = authUser?.role === "ADMIN";
  const canManageProducts =
    authUser?.role === "DIRETOR" ||
    authUser?.role === "GERENTE_COMERCIAL" ||
    authUser?.role === "SUPERVISOR";

  const selectedCompanyId = React.useMemo(() => {
    if (!isAdmin) {
      return authUser?.company_id ?? null;
    }

    if (
      !selectedCompanyContext ||
      isPlatformAdminContext(selectedCompanyContext)
    ) {
      return null;
    }

    return selectedCompanyContext;
  }, [authUser?.company_id, isAdmin, selectedCompanyContext]);

  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [product, setProduct] = React.useState<ProductDetail | null>(null);

  const loadProduct = React.useCallback(async () => {
    if (!authHydrated) {
      return;
    }

    if (isAdmin && !selectedCompanyId) {
      setProduct(null);
      setLoadError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    try {
      const params = new URLSearchParams();
      if (isAdmin && selectedCompanyId) {
        params.set("company_id", selectedCompanyId);
      }

      const endpoint = params.toString()
        ? `/products/${product_id}?${params.toString()}`
        : `/products/${product_id}`;

      const response = await apiFetch<unknown>(endpoint);
      const parsed = productDetailApiResponseSchema.safeParse(response);
      if (!parsed.success) {
        setProduct(null);
        setLoadError("Não foi possível carregar os dados do produto.");
        return;
      }

      setProduct(parsed.data.data);
    } catch (error) {
      setProduct(null);
      setLoadError(parseApiError(error));
    } finally {
      setIsLoading(false);
    }
  }, [authHydrated, isAdmin, product_id, selectedCompanyId]);

  React.useEffect(() => {
    void loadProduct();
  }, [loadProduct]);

  const handleEditProduct = React.useCallback(() => {
    router.push(`/dashboard/products/${product_id}/edit`);
  }, [product_id, router]);

  const handleDeleteProduct = React.useCallback(async () => {
    if (!product) {
      return;
    }

    const confirmed = window.confirm(
      `Confirma a exclusão do produto "${product.nome}"?`,
    );
    if (!confirmed) {
      return;
    }

    const deleted = await tryApiDelete(
      `/products/${product.id}`,
      "Produto excluído com sucesso.",
    );
    if (!deleted) {
      return;
    }

    router.push("/dashboard/products");
  }, [product, router]);

  if (!authHydrated) {
    return (
      <div className="rounded-xl border p-6 text-sm text-muted-foreground">
        Carregando detalhes do produto...
      </div>
    );
  }

  if (isAdmin && !selectedCompanyId) {
    return (
      <div className="rounded-xl border border-dashed bg-card p-6 text-sm text-muted-foreground">
        Selecione uma empresa no topo para visualizar os detalhes do produto.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border p-6 text-sm text-muted-foreground">
        Carregando detalhes do produto...
      </div>
    );
  }

  if (!product) {
    return (
      <div className="rounded-xl border p-6 text-sm text-destructive">
        {loadError ?? "Não foi possível carregar o produto."}
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-2xl font-semibold">{product.nome}</h3>
          <p className="text-sm text-muted-foreground">
            {product.marca ? `Marca: ${product.marca}` : "Marca não informada"}
          </p>
          <p className="text-sm text-muted-foreground">
            SKU: {product.codigo_interno_sku ?? "-"}
          </p>
        </div>

        {canManageProducts ? (
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={handleEditProduct}>
              Editar produto
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => void handleDeleteProduct()}
              title={`Excluir produto ${product.nome}`}
            >
              Excluir produto
            </Button>
          </div>
        ) : null}
      </div>

      <DetailsSection title="01. Informações gerais">
        <KeyValue
          label="Descrição comercial"
          value={product.descricao_comercial}
        />
        <KeyValue
          label="Categorias"
          value={toLabelList(product.categorias, CATEGORY_LABEL_BY_VALUE)}
        />
        {product.categoria_outro ? (
          <KeyValue label="Categoria outro" value={product.categoria_outro} />
        ) : null}
        <KeyValue
          label="Tipologias indicadas"
          value={toLabelList(
            product.tipologias_clientes,
            CLIENT_TYPE_LABEL_BY_VALUE,
          )}
        />
        {product.tipologia_cliente_outro ? (
          <KeyValue
            label="Tipologia outro"
            value={product.tipologia_cliente_outro}
          />
        ) : null}
        <KeyValue
          label="Sugestões de receitas"
          value={product.sugestoes_receitas}
        />
      </DetailsSection>

      <DetailsSection title="02. Informações técnicas e logísticas">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-2">
            <KeyValue
              label="Código de barras item (EAN)"
              value={product.codigo_barras_ean}
            />
            <KeyValue
              label="Código de barras caixa (DUN)"
              value={product.codigo_barras_dun}
            />
            <KeyValue
              label="Código fiscal NCM"
              value={product.codigo_fiscal_ncm}
            />
            <KeyValue
              label="Tipo de conservação"
              value={
                product.tipo_conservacao
                  ? (CONSERVATION_LABEL_BY_VALUE[product.tipo_conservacao] ??
                    product.tipo_conservacao)
                  : "-"
              }
            />
            {product.tipo_conservacao_outro ? (
              <KeyValue
                label="Tipo de conservação outro"
                value={product.tipo_conservacao_outro}
              />
            ) : null}
            <KeyValue
              label="Validade embalagem fechada"
              value={product.validade_embalagem_fechada}
            />
            <KeyValue
              label="Validade após abertura"
              value={product.validade_apos_abertura}
            />
            <KeyValue
              label="Validade após preparo"
              value={product.validade_apos_preparo}
            />
          </div>

          <div className="space-y-2">
            <KeyValue
              label="Unidade de venda"
              value={
                product.unidade_venda
                  ? (SALE_UNIT_LABEL_BY_VALUE[product.unidade_venda] ??
                    product.unidade_venda)
                  : "-"
              }
            />
            {product.unidade_venda_outro ? (
              <KeyValue
                label="Unidade de venda outro"
                value={product.unidade_venda_outro}
              />
            ) : null}
            <KeyValue
              label="Peso líquido / volume"
              value={product.peso_liquido_volume}
            />
            <KeyValue label="Peso bruto" value={product.peso_bruto} />
            <KeyValue
              label="Qtd. unidades por caixa"
              value={product.qtd_unidades_por_caixa}
            />
            <KeyValue
              label="Instruções conservação (produto)"
              value={product.instrucoes_conservacao_produto}
            />
            <KeyValue
              label="Restrições (produto)"
              value={product.restricoes_produto}
            />
            <KeyValue
              label="Instruções conservação (embalagem)"
              value={product.instrucoes_conservacao_embalagem}
            />
            <KeyValue
              label="Restrições (embalagem)"
              value={product.restricoes_embalagem}
            />
            <KeyValue
              label="Possui ingredientes/composição"
              value={
                product.possui_ingredientes === null
                  ? "-"
                  : product.possui_ingredientes
                    ? "Sim"
                    : "Não"
              }
            />
            <KeyValue label="Ingredientes" value={product.ingredientes} />
            <KeyValue label="Alergenos" value={product.alergenos} />
            <KeyValue
              label="Produto pronto para uso"
              value={
                product.produto_pronto_uso
                  ? (READY_TO_USE_LABEL_BY_VALUE[product.produto_pronto_uso] ??
                    product.produto_pronto_uso)
                  : "-"
              }
            />
            {product.produto_pronto_uso_outro ? (
              <KeyValue
                label="Produto pronto para uso outro"
                value={product.produto_pronto_uso_outro}
              />
            ) : null}
            <KeyValue label="Modo de preparo" value={product.modo_preparo} />
            <KeyValue
              label="Observações de uso"
              value={product.observacoes_uso}
            />
          </div>
        </div>
      </DetailsSection>

      <DetailsSection title="03. Objeções e argumentações">
        {product.objecoes_argumentacoes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma objeção cadastrada para este produto.
          </p>
        ) : (
          <div className="space-y-4">
            {product.objecoes_argumentacoes.map((item, index) => (
              <div
                key={`${item.objecao_cliente}-${index}`}
                className="rounded-lg border p-4"
              >
                <p className="text-sm font-medium">
                  {index + 1}. {item.objecao_cliente}
                </p>
                <p className="text-sm text-muted-foreground">
                  Tipo:{" "}
                  {OBJECTION_TYPE_LABEL_BY_VALUE[item.tipo_objecao] ??
                    item.tipo_objecao}
                </p>
                {item.tipo_objecao_outro ? (
                  <p className="text-sm text-muted-foreground">
                    Tipo outro: {item.tipo_objecao_outro}
                  </p>
                ) : null}
                <p className="mt-2 text-sm">
                  <span className="font-medium">Resposta sugerida:</span>{" "}
                  {item.resposta_argumento}
                </p>
                {item.quando_usar ? (
                  <p className="text-sm">
                    <span className="font-medium">Quando usar:</span>{" "}
                    {item.quando_usar}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </DetailsSection>

      <DetailsSection title="04. Fotos e materiais de apoio">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Fotos</h4>
            {product.media?.fotos.length ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {product.media.fotos.map((item) => (
                  <a
                    key={item.public_url}
                    href={item.signed_url ?? item.public_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden rounded-md border"
                  >
                    {item.signed_url ? (
                      <img
                        src={item.signed_url}
                        alt="Foto do produto"
                        className="h-28 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-28 items-center justify-center px-2 text-center text-xs text-muted-foreground">
                        Pré-visualização indisponível
                      </div>
                    )}
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma foto cadastrada.
              </p>
            )}
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Vídeos / materiais</h4>
            {product.media?.videos.length ? (
              <div className="space-y-2">
                {product.media.videos.map((item, index) => (
                  <a
                    key={item.public_url}
                    href={item.signed_url ?? item.public_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex text-sm text-primary underline underline-offset-2"
                  >
                    Abrir vídeo/material {index + 1}
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum vídeo/material cadastrado.
              </p>
            )}
          </div>
        </div>

        <KeyValue
          label="Observações sobre imagens e vídeos"
          value={product.observacoes_imagens}
        />
      </DetailsSection>

      <DetailsSection title="05. Informações adicionais">
        <KeyValue
          label="Informações técnicas complementares"
          value={product.informacoes_tecnicas_complementares}
        />
        <KeyValue
          label="Certificações / registros"
          value={product.certificacoes_registros}
        />
        <KeyValue
          label="Observações comerciais"
          value={product.observacoes_comerciais}
        />
        <KeyValue
          label="Diferenciais do produto"
          value={product.diferenciais_produto}
        />
        <KeyValue
          label="Observações gerais"
          value={product.observacoes_gerais}
        />
      </DetailsSection>
    </section>
  );
}

function toLabelList(values: string[], dictionary: Record<string, string>) {
  if (!values.length) {
    return "-";
  }

  return values.map((item) => dictionary[item] ?? item).join(", ");
}

function DetailsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-5 shadow-xs">
      <h4 className="mb-4 text-base font-semibold">{title}</h4>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function KeyValue({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm">
        {value && value.trim().length > 0 ? value : "-"}
      </p>
    </div>
  );
}

