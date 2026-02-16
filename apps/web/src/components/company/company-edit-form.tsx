"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImageUp, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { apiFetch } from "@/lib/api-client";
import { parseApiError } from "@/lib/api-error";
import {
  companyDetailsApiResponseSchema,
  createCompanyFormSchema,
  createdCompanyApiResponseSchema,
  uploadSignedUrlApiResponseSchema,
  type CompanyDetails,
  type CreateCompanyFormInput,
  type UploadSignedUrlData,
} from "@/schemas/company";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import Image from "next/image";

type CompanyEditFormProps = {
  companyId: string;
};

const MAX_LOGO_FILE_SIZE_BYTES = 3 * 1024 * 1024;
const ACCEPTED_LOGO_MIME_TYPES = [
  "image/svg+xml",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
];

function formatCnpjInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);

  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  }
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }

  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function formatFileSize(sizeInBytes: number) {
  if (sizeInBytes < 1024) return `${sizeInBytes} B`;
  if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`;
  return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function normalizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

function extractValidLogoFile(fileList: FileList | null) {
  const file = fileList?.item(0);
  if (!file) return null;

  if (!ACCEPTED_LOGO_MIME_TYPES.includes(file.type)) {
    toast.error("Formato de logo inválido. Use SVG, PNG, JPG ou GIF.");
    return null;
  }

  if (file.size > MAX_LOGO_FILE_SIZE_BYTES) {
    toast.error("Arquivo de logo deve ter no maximo 3MB.");
    return null;
  }

  return file;
}

async function fetchCompanyById(
  companyId: string,
): Promise<CompanyDetails | null> {
  const response = await apiFetch<unknown>(`/companies/${companyId}`);
  const parsed = companyDetailsApiResponseSchema.safeParse(response);
  if (!parsed.success) {
    return null;
  }

  return parsed.data.data;
}

async function requestCompanyLogoSignedUrl(
  companyId: string,
  file: File,
): Promise<UploadSignedUrlData | null> {
  const response = await apiFetch<unknown>("/uploads/signed-url", {
    method: "POST",
    body: {
      target: "COMPANY_LOGO",
      companyId,
      fileName: file.name,
      contentType: file.type,
      contentLength: file.size,
    },
  });

  const parsed = uploadSignedUrlApiResponseSchema.safeParse(response);
  if (!parsed.success) {
    return null;
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
    throw new Error("Não foi possível enviar a logo para o storage.");
  }
}

export function CompanyEditForm({ companyId }: CompanyEditFormProps) {
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [company, setCompany] = React.useState<CompanyDetails | null>(null);
  const [isLoadingCompany, setIsLoadingCompany] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [logoFile, setLogoFile] = React.useState<File | null>(null);
  const [removeCurrentLogo, setRemoveCurrentLogo] = React.useState(false);
  const [isDragActive, setIsDragActive] = React.useState(false);

  const {
    register,
    control,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateCompanyFormInput>({
    resolver: zodResolver(createCompanyFormSchema),
    defaultValues: {
      name: "",
      cnpj: "",
    },
  });

  React.useEffect(() => {
    const loadCompany = async () => {
      setIsLoadingCompany(true);
      setLoadError(null);

      try {
        const companyData = await fetchCompanyById(companyId);
        if (!companyData) {
          setCompany(null);
          setLoadError("Não foi possível carregar os dados da empresa.");
          return;
        }

        setCompany(companyData);
        reset({
          name: companyData.name,
          cnpj: formatCnpjInput(companyData.cnpj),
        });
      } catch (error) {
        setCompany(null);
        setLoadError(parseApiError(error));
      } finally {
        setIsLoadingCompany(false);
      }
    };

    void loadCompany();
  }, [companyId, reset]);

  const handleLogoFileSelection = (fileList: FileList | null) => {
    const file = extractValidLogoFile(fileList);
    if (!file) {
      return;
    }

    setLogoFile(file);
    setRemoveCurrentLogo(false);
  };

  const onSubmit = async (input: CreateCompanyFormInput) => {
    if (!company) {
      toast.error("Não foi possível carregar a empresa para edição.");
      return;
    }

    try {
      const payload: Record<string, string | null> = {};
      const normalizedName = input.name.trim();
      const normalizedCnpj = normalizeDigits(input.cnpj);

      if (normalizedName !== company.name) {
        payload.name = normalizedName;
      }

      if (normalizedCnpj !== normalizeDigits(company.cnpj)) {
        payload.cnpj = normalizedCnpj;
      }

      if (logoFile) {
        const signedUrlData = await requestCompanyLogoSignedUrl(
          company.id,
          logoFile,
        );

        if (!signedUrlData) {
          toast.error("Não foi possível preparar o upload da logo.");
          return;
        }

        await uploadFileToSignedUrl(signedUrlData, logoFile);
        payload.logoUrl = signedUrlData.publicUrl;
      } else if (removeCurrentLogo && company.logoUrl) {
        payload.logoUrl = null;
      }

      if (Object.keys(payload).length === 0) {
        toast.info("Nenhuma alteração para salvar.");
        return;
      }

      const response = await apiFetch<unknown>(`/companies/${company.id}`, {
        method: "PATCH",
        body: payload,
      });

      const parsed = createdCompanyApiResponseSchema.safeParse(response);
      if (!parsed.success) {
        toast.error("Resposta inesperada ao atualizar empresa.");
        return;
      }

      toast.success("Empresa atualizada com sucesso!");
      router.push(`/dashboard/companies/${company.id}`);
    } catch (error) {
      toast.error(parseApiError(error));
    }
  };

  if (isLoadingCompany) {
    return (
      <div className="rounded-xl border p-6 text-sm text-muted-foreground">
        Carregando dados da empresa...
      </div>
    );
  }

  if (!company) {
    return (
      <div className="rounded-xl border p-6 text-sm text-destructive">
        {loadError ?? "Não foi possível carregar a empresa."}
      </div>
    );
  }

  const hasCurrentLogo =
    Boolean(company.logoUrl) && !removeCurrentLogo && !logoFile;
  const currentLogoPreviewUrl =
    company.logoSignedUrl ?? company.logoUrl ?? null;

  return (
    <form
      className="w-full max-w-xl rounded-xl border bg-card p-5 shadow-xs"
      onSubmit={handleSubmit(onSubmit)}
    >
      <FieldGroup className="gap-4">
        <h4 className="text-2xl font-semibold">Editar empresa</h4>

        <Field className="gap-2">
          <FieldLabel htmlFor="company-name" className="font-semibold">
            Nome da Empresa
          </FieldLabel>
          <Input
            id="company-name"
            placeholder="Digite o nome da empresa"
            {...register("name")}
            disabled={isSubmitting}
          />
          {errors.name ? (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          ) : null}
        </Field>

        <Field className="gap-2">
          <FieldLabel htmlFor="company-cnpj" className="font-semibold">
            CNPJ
          </FieldLabel>
          <Controller
            control={control}
            name="cnpj"
            render={({ field }) => (
              <Input
                id="company-cnpj"
                inputMode="numeric"
                placeholder="CNPJ da empresa"
                value={field.value}
                onBlur={field.onBlur}
                onChange={(event) => {
                  field.onChange(formatCnpjInput(event.target.value));
                }}
                disabled={isSubmitting}
              />
            )}
          />
          {errors.cnpj ? (
            <p className="text-sm text-destructive">{errors.cnpj.message}</p>
          ) : null}
        </Field>

        <input
          ref={fileInputRef}
          type="file"
          accept=".svg,.png,.jpg,.jpeg,.gif,image/svg+xml,image/png,image/jpeg,image/jpg,image/gif"
          className="hidden"
          onChange={(event) => {
            handleLogoFileSelection(event.target.files);
            event.currentTarget.value = "";
          }}
          disabled={isSubmitting}
        />

        <div
          className={`rounded-lg border border-dashed p-6 text-center transition-colors ${
            isDragActive ? "border-primary bg-primary/5" : "border-border"
          }`}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragActive(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setIsDragActive(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragActive(false);
            handleLogoFileSelection(event.dataTransfer.files);
          }}
        >
          {hasCurrentLogo && currentLogoPreviewUrl ? (
            <div className=" flex flex-col items-center gap-2">
              <p className="text-sm text-foreground">Logo atual cadastrada</p>
              <Image
                src={currentLogoPreviewUrl}
                alt={`Logo atual da empresa ${company.name}`}
                className="h-20 w-20 bg-white p-1 object-contain"
                loading="lazy"
                width={100}
                height={100}
              />
            </div>
          ) : null}
          {company.logoUrl && !logoFile ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setRemoveCurrentLogo((current) => !current)}
              disabled={isSubmitting}
            >
              {removeCurrentLogo ? (
                <>Cancelar remoção da logo atual</>
              ) : (
                <>
                  <Trash2 className="size-4" />
                </>
              )}
            </Button>
          ) : null}

          <div className="mx-auto mt-4 mb-2 flex size-10 items-center justify-center rounded-md border bg-muted">
            <ImageUp className="size-5 text-muted-foreground" />
          </div>

          <p className="text-sm font-medium border-separate">
            Arraste para cá a nova logo da empresa ou{" "}
            <button
              type="button"
              className="cursor-pointer underline underline-offset-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting}
            >
              clique para procurar
            </button>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            SVG, PNG, JPG ou GIF (max. 3MB)
          </p>

          {logoFile ? (
            <div className="mt-3 flex flex-col items-center gap-2">
              <p className="text-sm text-foreground">
                Nova logo selecionada: {logoFile.name} (
                {formatFileSize(logoFile.size)})
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setLogoFile(null)}
                disabled={isSubmitting}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                Remover logo selecionada
              </Button>
            </div>
          ) : null}
        </div>

        <div className="pt-1">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="inline-flex items-center">
                <Spinner className="mr-2 h-4 w-4 animate-spin" />
                Salvando
              </span>
            ) : (
              <>Salvar alterações</>
            )}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

