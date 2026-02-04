export type CompanyListInput = {
  q?: string;
  page?: number;
  pageSize?: number;
};

export type CreateCompanyInput = {
  name: string;
  cnpj: string;
  logoUrl?: string;
};

export type UpdateCompanyInput = {
  name?: string;
  cnpj?: string;
  logoUrl?: string | null;
};
