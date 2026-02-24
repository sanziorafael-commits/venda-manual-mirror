"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImageUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { apiFetch } from "@/lib/api-client";
import { parseApiError } from "@/lib/api-error";
import {
  createCompanyFormSchema,
  createdCompanyApiResponseSchema,
  uploadSignedUrlApiResponseSchema,
  type CreateCompanyFormInput,
  type CreatedCompany,
  type UploadSignedUrlData,
} from "@/schemas/company";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

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

async function createCompany(payload: {
  name: string;
  cnpj: string;
}): Promise<CreatedCompany | null> {
  const response = await apiFetch<unknown>("/companies", {
    method: "POST",
    body: payload,
  });

  const parsed = createdCompanyApiResponseSchema.safeParse(response);
  if (!parsed.success) {
    return null;
  }

  return parsed.data.data;
}

async function requestCompanyLogoSignedUrl(
  company_id: string,
  file: File,
): Promise<UploadSignedUrlData | null> {
  const response = await apiFetch<unknown>("/uploads/signed-url", {
    method: "POST",
    body: {
      target: "COMPANY_LOGO",
      company_id,
      file_name: file.name,
      content_type: file.type,
      content_length: file.size,
    },
  });

  const parsed = uploadSignedUrlApiResponseSchema.safeParse(response);
  if (!parsed.success) {
    return null;
  }

  return parsed.data.data;
}

async function uploadFileToSignedUrl(signedUrlData: UploadSignedUrlData, file: File) {
  const response = await fetch(signedUrlData.upload_url, {
    method: signedUrlData.upload_method,
    headers: {
      "Content-Type": signedUrlData.upload_headers["Content-Type"],
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error("Não foi possível enviar a logo para o storage.");
  }
}

async function updateCompanyLogo(company_id: string, logo_url: string) {
  await apiFetch(`/companies/${company_id}`, {
    method: "PATCH",
    body: {
      logo_url,
    },
  });
}

export function CompanyCreateForm() {
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [logoFile, setLogoFile] = React.useState<File | null>(null);
  const [isDragActive, setIsDragActive] = React.useState(false);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateCompanyFormInput>({
    resolver: zodResolver(createCompanyFormSchema),
    defaultValues: {
      name: "",
      cnpj: "",
    },
  });

  const handleLogoFileSelection = (fileList: FileList | null) => {
    const file = extractValidLogoFile(fileList);
    if (!file) {
      return;
    }

    setLogoFile(file);
  };

  const onSubmit = async (input: CreateCompanyFormInput) => {
    try {
      const payload = {
        name: input.name.trim(),
        cnpj: input.cnpj.replace(/\D/g, ""),
      };

      const createdCompany = await createCompany(payload);
      if (!createdCompany) {
        toast.error("Resposta inesperada ao criar empresa.");
        return;
      }

      if (!logoFile) {
        toast.success("Empresa cadastrada com sucesso!");
        router.push("/dashboard/companies");
        return;
      }

      const signedUrlData = await requestCompanyLogoSignedUrl(
        createdCompany.id,
        logoFile,
      );

      if (!signedUrlData) {
        toast.warning(
          "Empresa criada, mas Não foi possível preparar o upload da logo.",
        );
        router.push("/dashboard/companies");
        return;
      }

      await uploadFileToSignedUrl(signedUrlData, logoFile);
      await updateCompanyLogo(createdCompany.id, signedUrlData.public_url);

      toast.success("Empresa cadastrada com logo enviada com sucesso!");
      router.push("/dashboard/companies");
    } catch (error) {
      toast.error(parseApiError(error));
    }
  };

  return (
    <form
      className="w-full max-w-xl rounded-xl border bg-card p-5 shadow-xs"
      onSubmit={handleSubmit(onSubmit)}
    >
      <FieldGroup className="gap-4">
        <h4 className="text-2xl font-semibold">Nova empresa</h4>

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
          <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-md border bg-muted">
            <ImageUp className="size-5 text-muted-foreground" />
          </div>

          <p className="text-sm font-medium">
            Arraste para cá a logo da empresa ou{" "}
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
                Arquivo selecionado: {logoFile.name} ({formatFileSize(logoFile.size)})
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setLogoFile(null)}
                disabled={isSubmitting}
                title="Remover logo selecionada"
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
                Cadastrando
              </span>
            ) : (
              <>Cadastrar Empresa</>
            )}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}



