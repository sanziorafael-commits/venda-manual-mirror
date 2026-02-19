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
  productId: string;
};

export function ProductDetailsWrapper({
  productId,
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
      return authUser?.companyId ?? null;
    }

    if (
      !selectedCompanyContext ||
      isPlatformAdminContext(selectedCompanyContext)
    ) {
      return null;
    }

    return selectedCompanyContext;
  }, [authUser?.companyId, isAdmin, selectedCompanyContext]);

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
        params.set("companyId", selectedCompanyId);
      }

      const endpoint = params.toString()
        ? `/products/${productId}?${params.toString()}`
        : `/products/${productId}`;

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
  }, [authHydrated, isAdmin, productId, selectedCompanyId]);

  React.useEffect(() => {
    void loadProduct();
  }, [loadProduct]);

  const handleEditProduct = React.useCallback(() => {
    router.push(`/dashboard/products/${productId}/edit`);
  }, [productId, router]);

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
            SKU: {product.codigoInternoSku ?? "-"}
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
            >
              Excluir produto
            </Button>
          </div>
        ) : null}
      </div>

      <DetailsSection title="01. Informações gerais">
        <KeyValue
          label="Descrição comercial"
          value={product.descricaoComercial}
        />
        <KeyValue
          label="Categorias"
          value={toLabelList(product.categorias, CATEGORY_LABEL_BY_VALUE)}
        />
        {product.categoriaOutro ? (
          <KeyValue label="Categoria outro" value={product.categoriaOutro} />
        ) : null}
        <KeyValue
          label="Tipologias indicadas"
          value={toLabelList(
            product.tipologiasClientes,
            CLIENT_TYPE_LABEL_BY_VALUE,
          )}
        />
        {product.tipologiaClienteOutro ? (
          <KeyValue
            label="Tipologia outro"
            value={product.tipologiaClienteOutro}
          />
        ) : null}
        <KeyValue
          label="Sugestões de receitas"
          value={product.sugestoesReceitas}
        />
      </DetailsSection>

      <DetailsSection title="02. Informações técnicas e logísticas">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-2">
            <KeyValue
              label="Código de barras item (EAN)"
              value={product.codigoBarrasEan}
            />
            <KeyValue
              label="Código de barras caixa (DUN)"
              value={product.codigoBarrasDun}
            />
            <KeyValue
              label="Código fiscal NCM"
              value={product.codigoFiscalNcm}
            />
            <KeyValue
              label="Tipo de conservação"
              value={
                product.tipoConservacao
                  ? (CONSERVATION_LABEL_BY_VALUE[product.tipoConservacao] ??
                    product.tipoConservacao)
                  : "-"
              }
            />
            {product.tipoConservacaoOutro ? (
              <KeyValue
                label="Tipo de conservação outro"
                value={product.tipoConservacaoOutro}
              />
            ) : null}
            <KeyValue
              label="Validade embalagem fechada"
              value={product.validadeEmbalagemFechada}
            />
            <KeyValue
              label="Validade após abertura"
              value={product.validadeAposAbertura}
            />
            <KeyValue
              label="Validade após preparo"
              value={product.validadeAposPreparo}
            />
          </div>

          <div className="space-y-2">
            <KeyValue
              label="Unidade de venda"
              value={
                product.unidadeVenda
                  ? (SALE_UNIT_LABEL_BY_VALUE[product.unidadeVenda] ??
                    product.unidadeVenda)
                  : "-"
              }
            />
            {product.unidadeVendaOutro ? (
              <KeyValue
                label="Unidade de venda outro"
                value={product.unidadeVendaOutro}
              />
            ) : null}
            <KeyValue
              label="Peso líquido / volume"
              value={product.pesoLiquidoVolume}
            />
            <KeyValue label="Peso bruto" value={product.pesoBruto} />
            <KeyValue
              label="Qtd. unidades por caixa"
              value={product.qtdUnidadesPorCaixa}
            />
            <KeyValue
              label="Instruções conservação (produto)"
              value={product.instrucoesConservacaoProduto}
            />
            <KeyValue
              label="Restrições (produto)"
              value={product.restricoesProduto}
            />
            <KeyValue
              label="Instruções conservação (embalagem)"
              value={product.instrucoesConservacaoEmbalagem}
            />
            <KeyValue
              label="Restrições (embalagem)"
              value={product.restricoesEmbalagem}
            />
            <KeyValue
              label="Possui ingredientes/composição"
              value={
                product.possuiIngredientes === null
                  ? "-"
                  : product.possuiIngredientes
                    ? "Sim"
                    : "Não"
              }
            />
            <KeyValue label="Ingredientes" value={product.ingredientes} />
            <KeyValue label="Alergenos" value={product.alergenos} />
            <KeyValue
              label="Produto pronto para uso"
              value={
                product.produtoProntoUso
                  ? (READY_TO_USE_LABEL_BY_VALUE[product.produtoProntoUso] ??
                    product.produtoProntoUso)
                  : "-"
              }
            />
            {product.produtoProntoUsoOutro ? (
              <KeyValue
                label="Produto pronto para uso outro"
                value={product.produtoProntoUsoOutro}
              />
            ) : null}
            <KeyValue label="Modo de preparo" value={product.modoPreparo} />
            <KeyValue
              label="Observações de uso"
              value={product.observacoesUso}
            />
          </div>
        </div>
      </DetailsSection>

      <DetailsSection title="03. Objeções e argumentações">
        {product.objecoesArgumentacoes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma objeção cadastrada para este produto.
          </p>
        ) : (
          <div className="space-y-4">
            {product.objecoesArgumentacoes.map((item, index) => (
              <div
                key={`${item.objecaoCliente}-${index}`}
                className="rounded-lg border p-4"
              >
                <p className="text-sm font-medium">
                  {index + 1}. {item.objecaoCliente}
                </p>
                <p className="text-sm text-muted-foreground">
                  Tipo:{" "}
                  {OBJECTION_TYPE_LABEL_BY_VALUE[item.tipoObjecao] ??
                    item.tipoObjecao}
                </p>
                {item.tipoObjecaoOutro ? (
                  <p className="text-sm text-muted-foreground">
                    Tipo outro: {item.tipoObjecaoOutro}
                  </p>
                ) : null}
                <p className="mt-2 text-sm">
                  <span className="font-medium">Resposta sugerida:</span>{" "}
                  {item.respostaArgumento}
                </p>
                {item.quandoUsar ? (
                  <p className="text-sm">
                    <span className="font-medium">Quando usar:</span>{" "}
                    {item.quandoUsar}
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
                    key={item.publicUrl}
                    href={item.signedUrl ?? item.publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden rounded-md border"
                  >
                    {item.signedUrl ? (
                      <img
                        src={item.signedUrl}
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
                    key={item.publicUrl}
                    href={item.signedUrl ?? item.publicUrl}
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
          value={product.observacoesImagens}
        />
      </DetailsSection>

      <DetailsSection title="05. Informações adicionais">
        <KeyValue
          label="Informações técnicas complementares"
          value={product.informacoesTecnicasComplementares}
        />
        <KeyValue
          label="Certificações / registros"
          value={product.certificacoesRegistros}
        />
        <KeyValue
          label="Observações comerciais"
          value={product.observacoesComerciais}
        />
        <KeyValue
          label="Diferenciais do produto"
          value={product.diferenciaisProduto}
        />
        <KeyValue
          label="Observações gerais"
          value={product.observacoesGerais}
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
