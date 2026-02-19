/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ImageUp, Plus, Trash2, Upload } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api-client";
import { parseApiError } from "@/lib/api-error";
import {
  uploadSignedUrlApiResponseSchema,
  type UploadSignedUrlData,
} from "@/schemas/company";
import {
  PRODUCT_CATEGORY_OPTIONS,
  PRODUCT_CLIENT_TYPE_OPTIONS,
  PRODUCT_CONSERVATION_TYPE_OPTIONS,
  PRODUCT_OBJECTION_TYPE_OPTIONS,
  PRODUCT_READY_TO_USE_OPTIONS,
  PRODUCT_SALE_UNIT_OPTIONS,
  buildProductPayloadFromForm,
  createEmptyProductFormValues,
  createEmptyProductObjection,
  createdOrUpdatedProductApiResponseSchema,
  isProductObjectionEmpty,
  mapProductDetailToFormValues,
  productDetailApiResponseSchema,
  productFormSchema,
  type ProductDetail,
  type ProductFormValues,
} from "@/schemas/product";
import { useAuthUser } from "@/hooks/use-auth-user";

type ProductFormWizardProps = {
  mode: "create" | "edit";
  productId?: string;
};

type ProductStep = 1 | 2 | 3 | 4 | 5;
type ProductMediaTarget = "PRODUCT_IMAGE" | "PRODUCT_VIDEO";

const STEP_ITEMS: Array<{ step: ProductStep; label: string }> = [
  { step: 1, label: "Informações gerais" },
  { step: 2, label: "Informações técnicas e logísticas" },
  { step: 3, label: "Objeções e argumentações" },
  { step: 4, label: "Fotos e materiais de apoio" },
  { step: 5, label: "Informações adicionais" },
];

const IMAGE_MIME_TYPES = [
  "image/svg+xml",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
];

const MAX_IMAGE_SIZE_BYTES = 3 * 1024 * 1024;
const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024;

function createClientUuid() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  const segment = () =>
    Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .slice(1);
  return `${segment()}${segment()}-${segment()}-${segment()}-${segment()}-${segment()}${segment()}${segment()}`;
}

function formatFileSize(sizeInBytes: number) {
  if (sizeInBytes < 1024) return `${sizeInBytes} B`;
  if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`;
  return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function buildMediaPreviewMap(product: ProductDetail) {
  const map: Record<string, string> = {};
  product.media?.fotos.forEach((item) => {
    if (item.signedUrl) {
      map[item.publicUrl] = item.signedUrl;
    }
  });

  product.media?.videos.forEach((item) => {
    if (item.signedUrl) {
      map[item.publicUrl] = item.signedUrl;
    }
  });

  return map;
}

export function ProductFormWizard({ mode, productId }: ProductFormWizardProps) {
  const router = useRouter();
  const authUser = useAuthUser();
  const canManageProducts =
    authUser?.role === "DIRETOR" ||
    authUser?.role === "GERENTE_COMERCIAL" ||
    authUser?.role === "SUPERVISOR";

  const createProductIdRef = React.useRef(createClientUuid());
  const photoInputRef = React.useRef<HTMLInputElement>(null);
  const videoInputRef = React.useRef<HTMLInputElement>(null);
  const localPreviewUrlsRef = React.useRef<string[]>([]);

  const [currentStep, setCurrentStep] = React.useState<ProductStep>(1);
  const [isLoadingProduct, setIsLoadingProduct] = React.useState(
    mode === "edit",
  );
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [isUploadingPhotos, setIsUploadingPhotos] = React.useState(false);
  const [isUploadingVideos, setIsUploadingVideos] = React.useState(false);
  const [mediaPreviewByPublicUrl, setMediaPreviewByPublicUrl] = React.useState<
    Record<string, string>
  >({});

  const {
    register,
    control,
    watch,
    setValue,
    getValues,
    setError,
    clearErrors,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: createEmptyProductFormValues(
      mode === "create" ? createProductIdRef.current : undefined,
    ),
  });

  const objectionFieldArray = useFieldArray({
    control,
    name: "objecoesArgumentacoes",
  });

  React.useEffect(() => {
    return () => {
      localPreviewUrlsRef.current.forEach((previewUrl) => {
        URL.revokeObjectURL(previewUrl);
      });
      localPreviewUrlsRef.current = [];
    };
  }, []);

  React.useEffect(() => {
    if (mode !== "edit" || !productId) {
      return;
    }

    const loadProduct = async () => {
      setIsLoadingProduct(true);
      setLoadError(null);

      try {
        const response = await apiFetch<unknown>(`/products/${productId}`);
        const parsed = productDetailApiResponseSchema.safeParse(response);
        if (!parsed.success) {
          setLoadError("Não foi possível carregar os dados do produto.");
          return;
        }

        const product = parsed.data.data;
        reset(mapProductDetailToFormValues(product));
        setMediaPreviewByPublicUrl(buildMediaPreviewMap(product));
      } catch (error) {
        setLoadError(parseApiError(error));
      } finally {
        setIsLoadingProduct(false);
      }
    };

    void loadProduct();
  }, [mode, productId, reset]);

  const categorias = watch("categorias");
  const tipologiasClientes = watch("tipologiasClientes");
  const tipoConservacao = watch("tipoConservacao");
  const unidadeVenda = watch("unidadeVenda");
  const produtoProntoUso = watch("produtoProntoUso");
  const possuiIngredientes = watch("possuiIngredientes");
  const fotosProduto = watch("fotosProduto");
  const videosMaterial = watch("videosMaterial");

  const toggleMultiSelect = React.useCallback(
    (fieldName: "categorias" | "tipologiasClientes", value: string) => {
      const current = getValues(fieldName);
      const nextValues = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
      setValue(fieldName, nextValues, { shouldDirty: true, shouldTouch: true });
    },
    [getValues, setValue],
  );

  const validateCurrentStep = React.useCallback(
    (step: ProductStep) => {
      clearErrors();
      const values = getValues();
      let hasError = false;

      if (step === 1) {
        if (!values.nome.trim()) {
          setError("nome", {
            type: "manual",
            message: "Nome do produto é obrigatório.",
          });
          hasError = true;
        }

        if (
          values.categorias.includes("OUTRO") &&
          !values.categoriaOutro.trim()
        ) {
          setError("categoriaOutro", {
            type: "manual",
            message: "Preencha a categoria 'Outro'.",
          });
          hasError = true;
        }

        if (
          values.tipologiasClientes.includes("OUTRO") &&
          !values.tipologiaClienteOutro.trim()
        ) {
          setError("tipologiaClienteOutro", {
            type: "manual",
            message: "Preencha a tipologia 'Outro'.",
          });
          hasError = true;
        }
      }

      if (step === 2) {
        if (
          values.tipoConservacao === "OUTRO" &&
          !values.tipoConservacaoOutro.trim()
        ) {
          setError("tipoConservacaoOutro", {
            type: "manual",
            message: "Preencha o tipo de conservação 'Outro'.",
          });
          hasError = true;
        }

        if (
          values.unidadeVenda === "OUTRO" &&
          !values.unidadeVendaOutro.trim()
        ) {
          setError("unidadeVendaOutro", {
            type: "manual",
            message: "Preencha a unidade de venda 'Outro'.",
          });
          hasError = true;
        }

        if (
          values.produtoProntoUso === "OUTRO" &&
          !values.produtoProntoUsoOutro.trim()
        ) {
          setError("produtoProntoUsoOutro", {
            type: "manual",
            message: "Preencha o campo 'Outro'.",
          });
          hasError = true;
        }
      }

      if (step === 3) {
        values.objecoesArgumentacoes.forEach((item, index) => {
          if (isProductObjectionEmpty(item)) {
            return;
          }

          if (!item.objecaoCliente.trim()) {
            setError(`objecoesArgumentacoes.${index}.objecaoCliente`, {
              type: "manual",
              message: "Informe a objecao do cliente.",
            });
            hasError = true;
          }

          if (!item.respostaArgumento.trim()) {
            setError(`objecoesArgumentacoes.${index}.respostaArgumento`, {
              type: "manual",
              message: "Informe a resposta/argumento.",
            });
            hasError = true;
          }

          if (item.tipoObjecao === "OUTRO" && !item.tipoObjecaoOutro.trim()) {
            setError(`objecoesArgumentacoes.${index}.tipoObjecaoOutro`, {
              type: "manual",
              message: "Preencha o tipo de objecao 'Outro'.",
            });
            hasError = true;
          }

          if (item.tipoObjecao !== "OUTRO" && item.tipoObjecaoOutro.trim()) {
            setError(`objecoesArgumentacoes.${index}.tipoObjecaoOutro`, {
              type: "manual",
              message:
                "Campo deve ficar vazio quando o tipo de objecao nao e 'Outro'.",
            });
            hasError = true;
          }
        });
      }

      return !hasError;
    },
    [clearErrors, getValues, setError],
  );

  const moveToNextStep = React.useCallback(() => {
    if (!validateCurrentStep(currentStep)) {
      toast.error("Revise os campos obrigatórios antes de continuar.");
      return;
    }

    setCurrentStep((previous) =>
      previous < 5 ? ((previous + 1) as ProductStep) : previous,
    );
  }, [currentStep, validateCurrentStep]);

  const moveToPreviousStep = React.useCallback(() => {
    setCurrentStep((previous) =>
      previous > 1 ? ((previous - 1) as ProductStep) : previous,
    );
  }, []);

  const uploadSelectedFiles = React.useCallback(
    async (target: ProductMediaTarget, fileList: FileList | null) => {
      const files = Array.from(fileList ?? []);
      if (files.length === 0) {
        return;
      }

      if (target === "PRODUCT_IMAGE") {
        setIsUploadingPhotos(true);
      } else {
        setIsUploadingVideos(true);
      }

      try {
        const validFiles = files.filter((file) => {
          if (target === "PRODUCT_IMAGE") {
            if (!IMAGE_MIME_TYPES.includes(file.type)) {
              toast.error(`Formato inválido para imagem: ${file.name}`);
              return false;
            }
            if (file.size > MAX_IMAGE_SIZE_BYTES) {
              toast.error(
                `Imagem excede 3MB: ${file.name} (${formatFileSize(file.size)})`,
              );
              return false;
            }
            return true;
          }

          if (!file.type.startsWith("video/")) {
            toast.error(`Formato inválido para vídeo: ${file.name}`);
            return false;
          }
          if (file.size > MAX_VIDEO_SIZE_BYTES) {
            toast.error(
              `Vídeo excede 100MB: ${file.name} (${formatFileSize(file.size)})`,
            );
            return false;
          }

          return true;
        });

        if (validFiles.length === 0) {
          return;
        }

        const currentEntityId = getValues("id") ?? createProductIdRef.current;
        if (!getValues("id")) {
          setValue("id", currentEntityId, { shouldDirty: true });
        }

        const uploadedPublicUrls: string[] = [];
        for (const file of validFiles) {
          const signedUrlData = await requestSignedUrl({
            target,
            entityId: currentEntityId,
            file,
          });

          await uploadFileToSignedUrl(signedUrlData, file);
          uploadedPublicUrls.push(signedUrlData.publicUrl);

          const localPreviewUrl = URL.createObjectURL(file);
          localPreviewUrlsRef.current.push(localPreviewUrl);
          setMediaPreviewByPublicUrl((currentMap) => ({
            ...currentMap,
            [signedUrlData.publicUrl]: localPreviewUrl,
          }));
        }

        if (target === "PRODUCT_IMAGE") {
          setValue(
            "fotosProduto",
            Array.from(
              new Set([...getValues("fotosProduto"), ...uploadedPublicUrls]),
            ),
            { shouldDirty: true, shouldTouch: true },
          );
        } else {
          setValue(
            "videosMaterial",
            Array.from(
              new Set([...getValues("videosMaterial"), ...uploadedPublicUrls]),
            ),
            { shouldDirty: true, shouldTouch: true },
          );
        }

        toast.success(
          validFiles.length === 1
            ? "Arquivo enviado com sucesso."
            : `${validFiles.length} arquivos enviados com sucesso.`,
        );
      } catch (error) {
        toast.error(parseApiError(error));
      } finally {
        if (target === "PRODUCT_IMAGE") {
          setIsUploadingPhotos(false);
        } else {
          setIsUploadingVideos(false);
        }
      }
    },
    [getValues, setValue],
  );

  const handleRemovePhoto = React.useCallback(
    (publicUrl: string) => {
      setValue(
        "fotosProduto",
        getValues("fotosProduto").filter((item) => item !== publicUrl),
        { shouldDirty: true, shouldTouch: true },
      );
      setMediaPreviewByPublicUrl((currentMap) => {
        const next = { ...currentMap };
        delete next[publicUrl];
        return next;
      });
    },
    [getValues, setValue],
  );

  const handleRemoveVideo = React.useCallback(
    (publicUrl: string) => {
      setValue(
        "videosMaterial",
        getValues("videosMaterial").filter((item) => item !== publicUrl),
        { shouldDirty: true, shouldTouch: true },
      );
      setMediaPreviewByPublicUrl((currentMap) => {
        const next = { ...currentMap };
        delete next[publicUrl];
        return next;
      });
    },
    [getValues, setValue],
  );

  const onSubmit = React.useCallback(
    async (values: ProductFormValues) => {
      if (currentStep < 5) {
        if (!validateCurrentStep(currentStep)) {
          toast.error("Revise os campos obrigatórios antes de continuar.");
          return;
        }

        setCurrentStep((previous) =>
          previous < 5 ? ((previous + 1) as ProductStep) : previous,
        );
        return;
      }

      try {
        const payload = buildProductPayloadFromForm(values);

        if (mode === "create") {
          const response = await apiFetch<unknown>("/products", {
            method: "POST",
            body: payload,
          });

          const parsed =
            createdOrUpdatedProductApiResponseSchema.safeParse(response);
          if (!parsed.success) {
            toast.error("Resposta inesperada ao cadastrar produto.");
            return;
          }

          toast.success("Produto cadastrado com sucesso!");
          router.push(`/dashboard/products/${parsed.data.data.id}`);
          return;
        }

        if (!productId) {
          toast.error("Produto inválido para edição.");
          return;
        }

        const updatePayload = { ...payload };
        delete updatePayload.id;
        const response = await apiFetch<unknown>(`/products/${productId}`, {
          method: "PATCH",
          body: updatePayload,
        });

        const parsed =
          createdOrUpdatedProductApiResponseSchema.safeParse(response);
        if (!parsed.success) {
          toast.error("Resposta inesperada ao atualizar produto.");
          return;
        }

        toast.success("Produto atualizado com sucesso!");
        router.push(`/dashboard/products/${productId}`);
      } catch (error) {
        toast.error(parseApiError(error));
      }
    },
    [currentStep, mode, productId, router, validateCurrentStep],
  );

  const submitCurrentForm = React.useMemo(
    () => handleSubmit((values) => void onSubmit(values)),
    [handleSubmit, onSubmit],
  );

  if (!canManageProducts) {
    return (
      <div className="rounded-xl border p-6 text-sm text-muted-foreground">
        Seu perfil possui acesso somente leitura para produtos.
      </div>
    );
  }

  if (isLoadingProduct) {
    return (
      <div className="rounded-xl border p-6 text-sm text-muted-foreground">
        Carregando dados do produto...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-xl border p-6 text-sm text-destructive">
        {loadError}
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <ProductStepHeader currentStep={currentStep} />

      {currentStep === 1 ? (
        <div className="grid gap-5 xl:grid-cols-2">
          <section className="rounded-xl border bg-card p-5 shadow-xs">
            <h4 className="text-xl font-semibold">Informações básicas</h4>
            <div className="mt-4 space-y-4">
              <FormField
                label="Nome do produto"
                error={errors.nome?.message}
                input={
                  <Input
                    placeholder="Digite o nome do produto"
                    {...register("nome")}
                    disabled={isSubmitting}
                  />
                }
              />
              <FormField
                label="Descrição comercial do produto"
                error={errors.descricaoComercial?.message}
                input={
                  <Textarea
                    rows={3}
                    placeholder="Descrição comercial"
                    {...register("descricaoComercial")}
                    disabled={isSubmitting}
                  />
                }
              />
              <FormField
                label="Código interno do produto (SKU/ERP)"
                error={errors.codigoInternoSku?.message}
                input={
                  <Input
                    placeholder="Código interno"
                    {...register("codigoInternoSku")}
                    disabled={isSubmitting}
                  />
                }
              />
              <FormField
                label="Marca"
                error={errors.marca?.message}
                input={
                  <Input
                    placeholder="Marca"
                    {...register("marca")}
                    disabled={isSubmitting}
                  />
                }
              />
            </div>

            <div className="mt-5">
              <p className="text-sm font-medium">Categoria do produto</p>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                {PRODUCT_CATEGORY_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 text-sm text-foreground"
                  >
                    <input
                      type="checkbox"
                      checked={categorias.includes(option.value)}
                      onChange={() =>
                        toggleMultiSelect("categorias", option.value)
                      }
                      disabled={isSubmitting}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
              <div className="mt-3">
                <Input
                  placeholder="Outro"
                  {...register("categoriaOutro")}
                  disabled={!categorias.includes("OUTRO") || isSubmitting}
                />
                {errors.categoriaOutro ? (
                  <p className="mt-1 text-sm text-destructive">
                    {errors.categoriaOutro.message}
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          <section className="rounded-xl border bg-card p-5 shadow-xs">
            <h4 className="text-xl font-semibold">Tipologias e aplicações</h4>
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {PRODUCT_CLIENT_TYPE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 text-sm text-foreground"
                >
                  <input
                    type="checkbox"
                    checked={tipologiasClientes.includes(option.value)}
                    onChange={() =>
                      toggleMultiSelect("tipologiasClientes", option.value)
                    }
                    disabled={isSubmitting}
                  />
                  {option.label}
                </label>
              ))}
            </div>

            <div className="mt-3">
              <Input
                placeholder="Outro"
                {...register("tipologiaClienteOutro")}
                disabled={!tipologiasClientes.includes("OUTRO") || isSubmitting}
              />
              {errors.tipologiaClienteOutro ? (
                <p className="mt-1 text-sm text-destructive">
                  {errors.tipologiaClienteOutro.message}
                </p>
              ) : null}
            </div>

            <div className="mt-4">
              <FormField
                label="Sugestões de receitas / pratos indicados"
                error={errors.sugestoesReceitas?.message}
                input={
                  <Textarea
                    rows={4}
                    placeholder="Exemplos de pratos e aplicações"
                    {...register("sugestoesReceitas")}
                    disabled={isSubmitting}
                  />
                }
              />
            </div>
          </section>
        </div>
      ) : null}

      {currentStep === 2 ? (
        <div className="grid gap-5 xl:grid-cols-3">
          <section className="rounded-xl border bg-card p-5 shadow-xs xl:col-span-1">
            <h4 className="text-xl font-semibold">Identificação e códigos</h4>
            <div className="mt-4 space-y-4">
              <FormField
                label="Código de barras do item (EAN / GTIN-13)"
                error={errors.codigoBarrasEan?.message}
                input={
                  <Input
                    placeholder="EAN / GTIN-13"
                    {...register("codigoBarrasEan")}
                    disabled={isSubmitting}
                  />
                }
              />
              <FormField
                label="Código de barras da caixa (DUN / GTIN-14)"
                error={errors.codigoBarrasDun?.message}
                input={
                  <Input
                    placeholder="DUN / GTIN-14"
                    {...register("codigoBarrasDun")}
                    disabled={isSubmitting}
                  />
                }
              />
              <FormField
                label="Código fiscal (NCM)"
                error={errors.codigoFiscalNcm?.message}
                input={
                  <Input
                    placeholder="NCM"
                    {...register("codigoFiscalNcm")}
                    disabled={isSubmitting}
                  />
                }
              />
            </div>

            <h4 className="mt-6 text-xl font-semibold">
              Conservação e validade
            </h4>
            <div className="mt-4 space-y-4">
              <FormField
                label="Tipo de conservação"
                error={errors.tipoConservacao?.message}
                input={
                  <select
                    className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                    value={tipoConservacao ?? ""}
                    onChange={(event) =>
                      setValue(
                        "tipoConservacao",
                        (event.target.value ||
                          null) as ProductFormValues["tipoConservacao"],
                        { shouldDirty: true, shouldTouch: true },
                      )
                    }
                    disabled={isSubmitting}
                  >
                    <option value="">Selecione</option>
                    {PRODUCT_CONSERVATION_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                }
              />
              <FormField
                label="Tipo de conservação - Outro"
                error={errors.tipoConservacaoOutro?.message}
                input={
                  <Input
                    placeholder="Outro"
                    {...register("tipoConservacaoOutro")}
                    disabled={tipoConservacao !== "OUTRO" || isSubmitting}
                  />
                }
              />
              <FormField
                label="Validade (embalagem fechada)"
                error={errors.validadeEmbalagemFechada?.message}
                input={
                  <Input
                    placeholder="Ex.: 365 dias"
                    {...register("validadeEmbalagemFechada")}
                    disabled={isSubmitting}
                  />
                }
              />
              <FormField
                label="Validade após abertura"
                error={errors.validadeAposAbertura?.message}
                input={
                  <Input
                    placeholder="Ex.: 2 dias"
                    {...register("validadeAposAbertura")}
                    disabled={isSubmitting}
                  />
                }
              />
              <FormField
                label="Validade após preparo/descongelamento"
                error={errors.validadeAposPreparo?.message}
                input={
                  <Input
                    placeholder="Ex.: 2 dias"
                    {...register("validadeAposPreparo")}
                    disabled={isSubmitting}
                  />
                }
              />
            </div>
          </section>

          <section className="rounded-xl border bg-card p-5 shadow-xs xl:col-span-1">
            <h4 className="text-xl font-semibold">Peso, volume e embalagem</h4>
            <div className="mt-4 space-y-4">
              <FormField
                label="Unidade de venda"
                error={errors.unidadeVenda?.message}
                input={
                  <select
                    className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                    value={unidadeVenda ?? ""}
                    onChange={(event) =>
                      setValue(
                        "unidadeVenda",
                        (event.target.value ||
                          null) as ProductFormValues["unidadeVenda"],
                        { shouldDirty: true, shouldTouch: true },
                      )
                    }
                    disabled={isSubmitting}
                  >
                    <option value="">Selecione</option>
                    {PRODUCT_SALE_UNIT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                }
              />
              <FormField
                label="Unidade de venda - Outro"
                error={errors.unidadeVendaOutro?.message}
                input={
                  <Input
                    placeholder="Outro"
                    {...register("unidadeVendaOutro")}
                    disabled={unidadeVenda !== "OUTRO" || isSubmitting}
                  />
                }
              />
              <FormField
                label="Peso líquido ou volume por unidade"
                error={errors.pesoLiquidoVolume?.message}
                input={
                  <Input
                    placeholder="Ex.: 2 kg, 5 L"
                    {...register("pesoLiquidoVolume")}
                    disabled={isSubmitting}
                  />
                }
              />
              <FormField
                label="Peso bruto da unidade/embalagem"
                error={errors.pesoBruto?.message}
                input={
                  <Input
                    placeholder="Peso bruto"
                    {...register("pesoBruto")}
                    disabled={isSubmitting}
                  />
                }
              />
              <FormField
                label="Quantidade por caixa/embalagem"
                error={errors.qtdUnidadesPorCaixa?.message}
                input={
                  <Input
                    placeholder="Quantidade"
                    {...register("qtdUnidadesPorCaixa")}
                    disabled={isSubmitting}
                  />
                }
              />
              <FormField
                label="Instruções de conservação (embalagem)"
                error={errors.instrucoesConservacaoEmbalagem?.message}
                input={
                  <Textarea
                    rows={3}
                    placeholder="Orientações importantes"
                    {...register("instrucoesConservacaoEmbalagem")}
                    disabled={isSubmitting}
                  />
                }
              />
              <FormField
                label="Restrições importantes (embalagem)"
                error={errors.restricoesEmbalagem?.message}
                input={
                  <Textarea
                    rows={3}
                    placeholder="Restrições relevantes"
                    {...register("restricoesEmbalagem")}
                    disabled={isSubmitting}
                  />
                }
              />
            </div>
          </section>

          <section className="rounded-xl border bg-card p-5 shadow-xs xl:col-span-1">
            <h4 className="text-xl font-semibold">Composição e uso</h4>
            <div className="mt-4 space-y-4">
              <FormField
                label="Produto possui ingredientes/composição?"
                error={errors.possuiIngredientes?.message}
                input={
                  <select
                    className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                    value={
                      possuiIngredientes === null
                        ? ""
                        : possuiIngredientes
                          ? "SIM"
                          : "NAO"
                    }
                    onChange={(event) =>
                      setValue(
                        "possuiIngredientes",
                        event.target.value === ""
                          ? null
                          : event.target.value === "SIM",
                        { shouldDirty: true, shouldTouch: true },
                      )
                    }
                    disabled={isSubmitting}
                  >
                    <option value="">Selecione</option>
                    <option value="SIM">Sim</option>
                    <option value="NAO">Não</option>
                  </select>
                }
              />
              <FormField
                label="Ingredientes"
                error={errors.ingredientes?.message}
                input={
                  <Textarea
                    rows={3}
                    placeholder="Ingredientes"
                    {...register("ingredientes")}
                    disabled={isSubmitting}
                  />
                }
              />
              <FormField
                label="Alergenos"
                error={errors.alergenos?.message}
                input={
                  <Textarea
                    rows={3}
                    placeholder="Alergenos"
                    {...register("alergenos")}
                    disabled={isSubmitting}
                  />
                }
              />
              <FormField
                label="Produto pronto para uso?"
                error={errors.produtoProntoUso?.message}
                input={
                  <select
                    className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                    value={produtoProntoUso ?? ""}
                    onChange={(event) =>
                      setValue(
                        "produtoProntoUso",
                        (event.target.value ||
                          null) as ProductFormValues["produtoProntoUso"],
                        { shouldDirty: true, shouldTouch: true },
                      )
                    }
                    disabled={isSubmitting}
                  >
                    <option value="">Selecione</option>
                    {PRODUCT_READY_TO_USE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                }
              />
              <FormField
                label="Produto pronto para uso - Outro"
                error={errors.produtoProntoUsoOutro?.message}
                input={
                  <Input
                    placeholder="Outro"
                    {...register("produtoProntoUsoOutro")}
                    disabled={produtoProntoUso !== "OUTRO" || isSubmitting}
                  />
                }
              />
              <FormField
                label="Modo de preparo / uso recomendado"
                error={errors.modoPreparo?.message}
                input={
                  <Textarea
                    rows={3}
                    placeholder="Modo de preparo"
                    {...register("modoPreparo")}
                    disabled={isSubmitting}
                  />
                }
              />
              <FormField
                label="Observações de uso"
                error={errors.observacoesUso?.message}
                input={
                  <Textarea
                    rows={3}
                    placeholder="Observações de uso"
                    {...register("observacoesUso")}
                    disabled={isSubmitting}
                  />
                }
              />
              <FormField
                label="Instruções de conservação (produto)"
                error={errors.instrucoesConservacaoProduto?.message}
                input={
                  <Textarea
                    rows={3}
                    placeholder="Instruções de conservação"
                    {...register("instrucoesConservacaoProduto")}
                    disabled={isSubmitting}
                  />
                }
              />
              <FormField
                label="Restrições importantes (produto)"
                error={errors.restricoesProduto?.message}
                input={
                  <Textarea
                    rows={3}
                    placeholder="Restrições importantes"
                    {...register("restricoesProduto")}
                    disabled={isSubmitting}
                  />
                }
              />
            </div>
          </section>
        </div>
      ) : null}

      {currentStep === 3 ? (
        <section className="rounded-xl border bg-card p-5 shadow-xs">
          <h4 className="text-xl font-semibold">Objeções e argumentações</h4>

          <div className="mt-4 space-y-4">
            {objectionFieldArray.fields.map((field, index) => (
              <div key={field.id} className="rounded-lg border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-base font-semibold">Objeção {index + 1}</p>
                  {objectionFieldArray.fields.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => objectionFieldArray.remove(index)}
                      disabled={isSubmitting}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  ) : null}
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <FormField
                    label="Objeção comum do cliente"
                    error={
                      errors.objecoesArgumentacoes?.[index]?.objecaoCliente
                        ?.message
                    }
                    input={
                      <Textarea
                        rows={3}
                        placeholder="Principais objeções"
                        {...register(
                          `objecoesArgumentacoes.${index}.objecaoCliente`,
                        )}
                        disabled={isSubmitting}
                      />
                    }
                  />
                  <div className="space-y-4">
                    <FormField
                      label="Tipo de objeção"
                      error={
                        errors.objecoesArgumentacoes?.[index]?.tipoObjecao
                          ?.message
                      }
                      input={
                        <select
                          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                          value={watch(
                            `objecoesArgumentacoes.${index}.tipoObjecao`,
                          )}
                          onChange={(event) =>
                            setValue(
                              `objecoesArgumentacoes.${index}.tipoObjecao`,
                              event.target
                                .value as ProductFormValues["objecoesArgumentacoes"][number]["tipoObjecao"],
                              { shouldDirty: true, shouldTouch: true },
                            )
                          }
                          disabled={isSubmitting}
                        >
                          {PRODUCT_OBJECTION_TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      }
                    />
                    <FormField
                      label="Tipo de objeção - Outro"
                      error={
                        errors.objecoesArgumentacoes?.[index]?.tipoObjecaoOutro
                          ?.message
                      }
                      input={
                        <Input
                          placeholder="Outro"
                          {...register(
                            `objecoesArgumentacoes.${index}.tipoObjecaoOutro`,
                          )}
                          disabled={
                            watch(
                              `objecoesArgumentacoes.${index}.tipoObjecao`,
                            ) !== "OUTRO" || isSubmitting
                          }
                        />
                      }
                    />
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <FormField
                    label="Resposta / argumento sugerido"
                    error={
                      errors.objecoesArgumentacoes?.[index]?.respostaArgumento
                        ?.message
                    }
                    input={
                      <Textarea
                        rows={3}
                        placeholder="Resposta sugerida"
                        {...register(
                          `objecoesArgumentacoes.${index}.respostaArgumento`,
                        )}
                        disabled={isSubmitting}
                      />
                    }
                  />
                  <FormField
                    label="Quando usar esse argumento?"
                    error={
                      errors.objecoesArgumentacoes?.[index]?.quandoUsar?.message
                    }
                    input={
                      <Textarea
                        rows={3}
                        placeholder="Quando usar"
                        {...register(
                          `objecoesArgumentacoes.${index}.quandoUsar`,
                        )}
                        disabled={isSubmitting}
                      />
                    }
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                objectionFieldArray.append(createEmptyProductObjection())
              }
              disabled={isSubmitting}
            >
              <Plus className="size-4" />
              Adicionar mais uma objeção e argumentação
            </Button>
          </div>
        </section>
      ) : null}

      {currentStep === 4 ? (
        <div className="grid gap-5 xl:grid-cols-3">
          <section className="rounded-xl border bg-card p-5 shadow-xs">
            <h4 className="text-xl font-semibold">Fotos do produto</h4>
            <UploadBox
              description="SVG, PNG, JPG ou GIF (max. 3MB)"
              isUploading={isUploadingPhotos}
              disabled={isSubmitting || isUploadingPhotos}
              onClick={() => photoInputRef.current?.click()}
            />
            <input
              ref={photoInputRef}
              type="file"
              accept=".svg,.png,.jpg,.jpeg,.gif,image/svg+xml,image/png,image/jpeg,image/jpg,image/gif"
              multiple
              className="hidden"
              onChange={(event) => {
                void uploadSelectedFiles("PRODUCT_IMAGE", event.target.files);
                event.currentTarget.value = "";
              }}
              disabled={isSubmitting || isUploadingPhotos}
            />

            <div className="mt-4 space-y-2">
              {fotosProduto.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma foto enviada.
                </p>
              ) : (
                fotosProduto.map((publicUrl) => (
                  <div
                    key={publicUrl}
                    className="flex items-center justify-between rounded-md border p-2"
                  >
                    <div className="flex items-center gap-2">
                      {mediaPreviewByPublicUrl[publicUrl] ? (
                        <img
                          src={mediaPreviewByPublicUrl[publicUrl]}
                          alt="Foto do produto"
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        <ImageUp className="size-4 text-muted-foreground" />
                      )}
                      <span className="line-clamp-1 text-xs text-muted-foreground">
                        {publicUrl}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleRemovePhoto(publicUrl)}
                      disabled={isSubmitting}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-xl border bg-card p-5 shadow-xs">
            <h4 className="text-xl font-semibold">
              Vídeo ou material complementar
            </h4>
            <UploadBox
              description="Vídeos até 100MB (video/*)"
              isUploading={isUploadingVideos}
              disabled={isSubmitting || isUploadingVideos}
              onClick={() => videoInputRef.current?.click()}
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              multiple
              className="hidden"
              onChange={(event) => {
                void uploadSelectedFiles("PRODUCT_VIDEO", event.target.files);
                event.currentTarget.value = "";
              }}
              disabled={isSubmitting || isUploadingVideos}
            />

            <div className="mt-4 space-y-2">
              {videosMaterial.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum vídeo/material enviado.
                </p>
              ) : (
                videosMaterial.map((publicUrl, index) => (
                  <div
                    key={publicUrl}
                    className="flex items-center justify-between rounded-md border p-2"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        Material {index + 1}
                      </span>
                      <span className="line-clamp-1 text-xs text-muted-foreground">
                        {publicUrl}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleRemoveVideo(publicUrl)}
                      disabled={isSubmitting}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-xl border bg-card p-5 shadow-xs">
            <h4 className="text-xl font-semibold">
              Observações sobre as imagens
            </h4>
            <div className="mt-4">
              <Textarea
                rows={11}
                placeholder="Informações importantes sobre o material visual."
                {...register("observacoesImagens")}
                disabled={isSubmitting}
              />
              {errors.observacoesImagens ? (
                <p className="mt-1 text-sm text-destructive">
                  {errors.observacoesImagens.message}
                </p>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}

      {currentStep === 5 ? (
        <div className="grid gap-5 xl:grid-cols-2">
          <section className="rounded-xl border bg-card p-5 shadow-xs">
            <h4 className="text-xl font-semibold">
              Identificações técnicas complementares
            </h4>
            <div className="mt-4 space-y-4">
              <FormField
                label="Informações técnicas complementares"
                error={errors.informacoesTecnicasComplementares?.message}
                input={
                  <Textarea
                    rows={4}
                    placeholder="Detalhes técnicos adicionais"
                    {...register("informacoesTecnicasComplementares")}
                    disabled={isSubmitting}
                  />
                }
              />
              <FormField
                label="Certificações / registros"
                error={errors.certificacoesRegistros?.message}
                input={
                  <Textarea
                    rows={4}
                    placeholder="Ex.: SIF, MAPA, ISO"
                    {...register("certificacoesRegistros")}
                    disabled={isSubmitting}
                  />
                }
              />
            </div>
          </section>

          <section className="rounded-xl border bg-card p-5 shadow-xs">
            <h4 className="text-xl font-semibold">
              Observações comerciais e contexto
            </h4>
            <div className="mt-4 space-y-4">
              <FormField
                label="Observações comerciais do produto"
                error={errors.observacoesComerciais?.message}
                input={
                  <Textarea
                    rows={3}
                    placeholder="Observações comerciais"
                    {...register("observacoesComerciais")}
                    disabled={isSubmitting}
                  />
                }
              />
              <FormField
                label="Diferenciais percebidos do produto"
                error={errors.diferenciaisProduto?.message}
                input={
                  <Textarea
                    rows={3}
                    placeholder="Diferenciais percebidos"
                    {...register("diferenciaisProduto")}
                    disabled={isSubmitting}
                  />
                }
              />
              <FormField
                label="Observações gerais"
                error={errors.observacoesGerais?.message}
                input={
                  <Textarea
                    rows={3}
                    placeholder="Observações gerais"
                    {...register("observacoesGerais")}
                    disabled={isSubmitting}
                  />
                }
              />
            </div>
          </section>
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <div>
          {currentStep > 1 ? (
            <Button
              type="button"
              variant="outline"
              onClick={moveToPreviousStep}
              disabled={isSubmitting}
            >
              Voltar
            </Button>
          ) : null}
        </div>

        <div>
          {currentStep < 5 ? (
            <Button
              key="wizard-next-step"
              type="button"
              onClick={moveToNextStep}
              disabled={isSubmitting}
              className="bg-[#1c826e] text-white hover:bg-[#166c5b]"
            >
              Continuar
            </Button>
          ) : (
            <Button
              key="wizard-save-product"
              type="button"
              onClick={() => {
                void submitCurrentForm();
              }}
              disabled={isSubmitting}
              className="bg-[#1c826e] text-white hover:bg-[#166c5b]"
            >
              {isSubmitting
                ? mode === "create"
                  ? "Cadastrando..."
                  : "Salvando..."
                : mode === "create"
                  ? "Cadastrar produto"
                  : "Salvar alterações"}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}

function ProductStepHeader({ currentStep }: { currentStep: ProductStep }) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[1380px] space-y-2">
        <ol className="grid grid-cols-5 gap-x-2">
          {STEP_ITEMS.map((item) => {
            const isDone = currentStep > item.step;
            const isCurrent = currentStep === item.step;

            return (
              <li key={item.step}>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-3xl leading-none ${
                      isDone || isCurrent
                        ? "font-semibold text-foreground"
                        : "font-medium text-muted-foreground/70"
                    }`}
                  >
                    {`0${item.step}`}
                  </span>
                  <span
                    className={`whitespace-nowrap text-sm leading-none ${
                      isDone || isCurrent
                        ? "font-medium text-foreground"
                        : "font-normal text-muted-foreground/70"
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>

        <ol className="grid grid-cols-5">
          {STEP_ITEMS.map((item, index) => {
            const isDone = currentStep > item.step;
            const isCurrent = currentStep === item.step;

            return (
              <li key={item.step} className="flex items-center">
                <span
                  className={`inline-flex size-8 items-center justify-center rounded-[11px] border-2 ${
                    isDone
                      ? "border-[#1c826e] bg-[#1c826e] text-white"
                      : isCurrent
                        ? "border-[#1c826e] bg-white text-[#1c826e]"
                        : "border-[#9ec4bc] bg-white text-[#9ec4bc]"
                  }`}
                >
                  {isDone ? (
                    <Check className="size-4 stroke-[3]" />
                  ) : isCurrent ? (
                    <span className="text-[14px] font-bold leading-none">
                      ...
                    </span>
                  ) : null}
                </span>

                {index < STEP_ITEMS.length - 1 ? (
                  <span className="mx-2 h-[2px] flex-1 bg-[#9ec4bc]" />
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function UploadBox({
  description,
  isUploading,
  disabled,
  onClick,
}: {
  description: string;
  isUploading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="mt-4 flex w-full flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center transition-colors hover:border-primary/60 disabled:cursor-not-allowed disabled:opacity-70"
      onClick={onClick}
      disabled={disabled}
    >
      <div className="mb-2 flex size-10 items-center justify-center rounded-md border bg-muted">
        <Upload className="size-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">
        {isUploading
          ? "Enviando arquivo..."
          : "Clique para selecionar arquivo(s)"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </button>
  );
}

function FormField({
  label,
  error,
  input,
}: {
  label: string;
  error?: string;
  input: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">{label}</p>
      {input}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

async function requestSignedUrl(input: {
  target: ProductMediaTarget;
  entityId: string;
  file: File;
}): Promise<UploadSignedUrlData> {
  const response = await apiFetch<unknown>("/uploads/signed-url", {
    method: "POST",
    body: {
      target: input.target,
      entityId: input.entityId,
      fileName: input.file.name,
      contentType: input.file.type,
      contentLength: input.file.size,
    },
  });

  const parsed = uploadSignedUrlApiResponseSchema.safeParse(response);
  if (!parsed.success) {
    throw new Error("Não foi possível preparar o upload.");
  }

  return parsed.data.data;
}

async function uploadFileToSignedUrl(
  signedUrlData: UploadSignedUrlData,
  file: File,
) {
  const response = await fetch(signedUrlData.uploadUrl, {
    method: signedUrlData.uploadMethod,
    headers: {
      "Content-Type": signedUrlData.uploadHeaders["Content-Type"],
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error("Falha ao enviar arquivo para o storage.");
  }
}


