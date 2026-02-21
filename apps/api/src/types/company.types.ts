export type CompanyListInput = {
  q?: string;
  page?: number;
  page_size?: number;
};

export type CreateCompanyInput = {
  name: string;
  cnpj: string;
  logo_url?: string;
};

export type UpdateCompanyInput = {
  name?: string;
  cnpj?: string;
  logo_url?: string | null;
};


