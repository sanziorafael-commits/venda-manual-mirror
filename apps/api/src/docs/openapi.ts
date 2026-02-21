export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'HandSell API',
    version: '1.0.0',
    description: 'Documentacao basica dos endpoints da API HandSell',
  },
  tags: [
    { name: 'health' },
    { name: 'auth' },
    { name: 'me' },
    { name: 'companies' },
    { name: 'users' },
    { name: 'uploads' },
    { name: 'products' },
    { name: 'dashboard' },
    { name: 'conversations' },
    { name: 'located-clients' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      ApiErrorResponse: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'validation_error' },
              message: { type: 'string', example: 'Dados da requisicao invalidos' },
              details: { type: 'object', additionalProperties: true },
            },
            required: ['code', 'message'],
          },
        },
        required: ['error'],
      },
      PhoneInput: {
        type: 'string',
        minLength: 10,
        maxLength: 20,
        description:
          'Aceita telefone com ou sem mascara. A API persiste somente digitos. Regra atual: se chegar com 10 ou 11 digitos sem DDI, prefixa 55 automaticamente.',
        example: '+55 (11) 91700-0203',
      },
      UserRole: {
        type: 'string',
        enum: ['ADMIN', 'DIRETOR', 'GERENTE_COMERCIAL', 'SUPERVISOR', 'VENDEDOR'],
      },
      DashboardPeriod: {
        type: 'string',
        enum: ['today', '7d', '30d', '365d'],
      },
      DashboardScope: {
        type: 'string',
        enum: ['all', 'vendors', 'supervisors'],
      },
      DashboardViewBy: {
        type: 'string',
        enum: ['vendedor', 'supervisor'],
      },
      LocatedClientStatus: {
        type: 'string',
        enum: ['PENDENTE_VISITA', 'VISITADO'],
      },
      UploadTarget: {
        type: 'string',
        enum: ['COMPANY_LOGO', 'PRODUCT_IMAGE', 'PRODUCT_VIDEO'],
      },
      BootstrapAdminRequest: {
        type: 'object',
        required: ['full_name', 'cpf', 'email', 'phone', 'password'],
        properties: {
          full_name: { type: 'string', minLength: 2 },
          cpf: { type: 'string', minLength: 11 },
          email: { type: 'string', format: 'email' },
          phone: { $ref: '#/components/schemas/PhoneInput' },
          password: { type: 'string', minLength: 6 },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
        },
      },
      ActivateAccountRequest: {
        type: 'object',
        required: ['token', 'password'],
        properties: {
          token: { type: 'string', minLength: 20 },
          password: { type: 'string', minLength: 6 },
        },
      },
      ResendActivationRequest: {
        type: 'object',
        required: ['user_id'],
        properties: {
          user_id: { type: 'string', format: 'uuid' },
        },
      },
      ForgotPasswordRequest: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' },
        },
      },
      ResetPasswordRequest: {
        type: 'object',
        required: ['token', 'password'],
        properties: {
          token: { type: 'string', minLength: 20 },
          password: { type: 'string', minLength: 6 },
        },
      },
      UpdateMeRequest: {
        type: 'object',
        properties: {
          full_name: { type: 'string', minLength: 2 },
          email: { type: 'string', format: 'email' },
          new_password: { type: 'string', minLength: 6 },
        },
      },
      CompanyCreateRequest: {
        type: 'object',
        required: ['name', 'cnpj'],
        properties: {
          name: { type: 'string', minLength: 2 },
          cnpj: { type: 'string', minLength: 14 },
          logo_url: { type: 'string', format: 'uri' },
        },
      },
      CompanyUpdateRequest: {
        type: 'object',
        description: 'Informe ao menos um campo para atualizacao.',
        properties: {
          name: { type: 'string', minLength: 2 },
          cnpj: { type: 'string', minLength: 14 },
          logo_url: { type: 'string', format: 'uri', nullable: true },
        },
      },
      CreateUserRequest: {
        type: 'object',
        required: ['role', 'full_name', 'cpf', 'phone'],
        properties: {
          company_id: { type: 'string', format: 'uuid' },
          role: { $ref: '#/components/schemas/UserRole' },
          full_name: { type: 'string', minLength: 2 },
          cpf: { type: 'string', minLength: 11 },
          email: { type: 'string', format: 'email' },
          phone: { $ref: '#/components/schemas/PhoneInput' },
          password: { type: 'string', minLength: 6 },
          manager_id: { type: 'string', format: 'uuid', nullable: true },
          supervisor_id: { type: 'string', format: 'uuid', nullable: true },
        },
      },
      CreateCompanyUserRequest: {
        type: 'object',
        required: ['role', 'full_name', 'cpf', 'phone'],
        properties: {
          role: { $ref: '#/components/schemas/UserRole' },
          full_name: { type: 'string', minLength: 2 },
          cpf: { type: 'string', minLength: 11 },
          email: { type: 'string', format: 'email' },
          phone: { $ref: '#/components/schemas/PhoneInput' },
          password: { type: 'string', minLength: 6 },
          manager_id: { type: 'string', format: 'uuid', nullable: true },
          supervisor_id: { type: 'string', format: 'uuid', nullable: true },
        },
      },
      UpdateUserRequest: {
        type: 'object',
        description: 'Informe ao menos um campo para atualizacao.',
        properties: {
          company_id: { type: 'string', format: 'uuid' },
          role: { $ref: '#/components/schemas/UserRole' },
          full_name: { type: 'string', minLength: 2 },
          cpf: { type: 'string', minLength: 11 },
          email: { type: 'string', format: 'email', nullable: true },
          phone: { $ref: '#/components/schemas/PhoneInput' },
          password: { type: 'string', minLength: 6 },
          is_active: { type: 'boolean' },
          manager_id: { type: 'string', format: 'uuid', nullable: true },
          supervisor_id: { type: 'string', format: 'uuid', nullable: true },
        },
      },
      ReassignSupervisorRequest: {
        type: 'object',
        required: ['from_supervisor_id', 'to_supervisor_id'],
        properties: {
          from_supervisor_id: { type: 'string', format: 'uuid' },
          to_supervisor_id: { type: 'string', format: 'uuid' },
        },
      },
      ReassignManagerTeamRequest: {
        type: 'object',
        required: ['from_manager_id', 'to_manager_id'],
        properties: {
          from_manager_id: { type: 'string', format: 'uuid' },
          to_manager_id: { type: 'string', format: 'uuid' },
        },
      },
      UploadSignedUrlRequest: {
        type: 'object',
        required: ['target', 'file_name', 'content_type', 'content_length'],
        properties: {
          target: { $ref: '#/components/schemas/UploadTarget' },
          file_name: { type: 'string', minLength: 1, maxLength: 255 },
          content_type: { type: 'string', minLength: 3, maxLength: 120 },
          content_length: { type: 'integer', minimum: 1, maximum: 524288000 },
          company_id: { type: 'string', format: 'uuid' },
          entity_id: { type: 'string', minLength: 1, maxLength: 100 },
        },
      },
      ProductCreateRequest: {
        type: 'object',
        required: ['nome'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          nome: { type: 'string', minLength: 1, maxLength: 255 },
        },
        additionalProperties: true,
      },
      ProductUpdateRequest: {
        type: 'object',
        description: 'Mesmo payload de criacao, com todos os campos opcionais.',
        additionalProperties: true,
      },
      LocatedClientStatusUpdateRequest: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { $ref: '#/components/schemas/LocatedClientStatus' },
        },
      },
    },
  },
  paths: {
    '/api/health': {
      get: { tags: ['health'], summary: 'Healthcheck da API', responses: { '200': { description: 'API online' } } },
    },
    '/api/auth/bootstrap-admin': {
      post: {
        tags: ['auth'],
        summary: 'Cria admin inicial',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/BootstrapAdminRequest' } } } },
        responses: { '201': { description: 'Criado' }, '400': { description: 'Erro de validacao' }, '409': { description: 'Conflito de unicidade' } },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['auth'],
        summary: 'Autentica usuario',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } } },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/auth/refresh': { post: { tags: ['auth'], summary: 'Renova sessao', responses: { '200': { description: 'OK' } } } },
    '/api/auth/logout': { post: { tags: ['auth'], summary: 'Encerra sessao', responses: { '200': { description: 'OK' } } } },
    '/api/auth/forgot-password': {
      post: {
        tags: ['auth'],
        summary: 'Solicita reset de senha',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ForgotPasswordRequest' } } } },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/auth/reset-password': {
      post: {
        tags: ['auth'],
        summary: 'Redefine senha',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ResetPasswordRequest' } } } },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/auth/activate-account': {
      post: {
        tags: ['auth'],
        summary: 'Ativa conta',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ActivateAccountRequest' } } } },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/auth/resend-activation': {
      post: {
        tags: ['auth'],
        summary: 'Reenvia ativacao',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ResendActivationRequest' } } } },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/me': {
      get: { tags: ['me'], summary: 'Dados do usuario autenticado', security: [{ bearerAuth: [] }], responses: { '200': { description: 'OK' } } },
      patch: {
        tags: ['me'],
        summary: 'Atualiza dados do usuario autenticado',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateMeRequest' } } } },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/companies': {
      get: {
        tags: ['companies'],
        summary: 'Lista empresas',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'q', required: false, schema: { type: 'string' } },
          { in: 'query', name: 'page', required: false, schema: { type: 'integer', minimum: 1 } },
          { in: 'query', name: 'page_size', required: false, schema: { type: 'integer', minimum: 1, maximum: 100 } },
        ],
        responses: { '200': { description: 'OK' } },
      },
      post: {
        tags: ['companies'],
        summary: 'Cria empresa',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CompanyCreateRequest' } } } },
        responses: { '201': { description: 'Criado' } },
      },
    },
    '/api/companies/{company_id}': {
      get: {
        tags: ['companies'],
        summary: 'Busca empresa por id (inclui logo_signed_url para leitura privada)',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'company_id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'OK' } },
      },
      patch: {
        tags: ['companies'],
        summary: 'Atualiza empresa',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'company_id', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CompanyUpdateRequest' } } } },
        responses: { '200': { description: 'OK' } },
      },
      delete: {
        tags: ['companies'],
        summary: 'Exclusao logica de empresa',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'company_id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/companies/{company_id}/users': {
      post: {
        tags: ['companies'],
        summary: 'Cria usuario para empresa',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'company_id', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateCompanyUserRequest' } } } },
        responses: { '201': { description: 'Criado' } },
      },
    },
    '/api/users': {
      get: {
        tags: ['users'],
        summary: 'Lista usuarios',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'q', required: false, schema: { type: 'string' } },
          { in: 'query', name: 'company_id', required: false, schema: { type: 'string', format: 'uuid' } },
          { in: 'query', name: 'role', required: false, schema: { $ref: '#/components/schemas/UserRole' } },
          { in: 'query', name: 'manager_id', required: false, schema: { type: 'string', format: 'uuid' } },
          { in: 'query', name: 'supervisor_id', required: false, schema: { type: 'string', format: 'uuid' } },
          { in: 'query', name: 'is_active', required: false, schema: { type: 'boolean' } },
          { in: 'query', name: 'page', required: false, schema: { type: 'integer', minimum: 1 } },
          { in: 'query', name: 'page_size', required: false, schema: { type: 'integer', minimum: 1, maximum: 100 } },
        ],
        responses: { '200': { description: 'OK' } },
      },
      post: {
        tags: ['users'],
        summary: 'Cria usuario',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateUserRequest' } } } },
        responses: { '201': { description: 'Criado' } },
      },
    },
    '/api/users/{user_id}': {
      get: {
        tags: ['users'],
        summary: 'Busca usuario por id',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'user_id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'OK' } },
      },
      patch: {
        tags: ['users'],
        summary: 'Atualiza usuario',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'user_id', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateUserRequest' } } } },
        responses: { '200': { description: 'OK' } },
      },
      delete: {
        tags: ['users'],
        summary: 'Exclusao logica de usuario',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'user_id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/users/actions/reassign-supervisor': {
      post: {
        tags: ['users'],
        summary: 'Reatribui carteira de supervisor',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ReassignSupervisorRequest' } } } },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/users/actions/reassign-manager-team': {
      post: {
        tags: ['users'],
        summary: 'Reatribui equipe de gerente',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ReassignManagerTeamRequest' } } } },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/users/reassign-supervisor': {
      post: {
        tags: ['users'],
        summary: 'Reatribui carteira de supervisor (legado)',
        deprecated: true,
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ReassignSupervisorRequest' } } } },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/users/reassign-manager-team': {
      post: {
        tags: ['users'],
        summary: 'Reatribui equipe de gerente (legado)',
        deprecated: true,
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ReassignManagerTeamRequest' } } } },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/uploads/signed-url': {
      post: {
        tags: ['uploads'],
        summary: 'Gera URL assinada para upload direto no GCS (bucket privado)',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/UploadSignedUrlRequest' } } } },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/products': {
      get: {
        tags: ['products'],
        summary: 'Lista produtos por empresa (admin somente leitura)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'q', required: false, schema: { type: 'string' } },
          { in: 'query', name: 'company_id', required: false, schema: { type: 'string', format: 'uuid' }, description: 'Obrigatorio para ADMIN.' },
          { in: 'query', name: 'page', required: false, schema: { type: 'integer', minimum: 1 } },
          { in: 'query', name: 'page_size', required: false, schema: { type: 'integer', minimum: 1, maximum: 100 } },
        ],
        responses: { '200': { description: 'OK' } },
      },
      post: {
        tags: ['products'],
        summary: 'Cria produto',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ProductCreateRequest' } } } },
        responses: { '201': { description: 'Criado' } },
      },
    },
    '/api/products/{product_id}': {
      get: {
        tags: ['products'],
        summary: 'Busca produto por id',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'product_id', required: true, schema: { type: 'string', format: 'uuid' } },
          { in: 'query', name: 'company_id', required: false, schema: { type: 'string', format: 'uuid' }, description: 'Obrigatorio para ADMIN.' },
        ],
        responses: { '200': { description: 'OK' } },
      },
      patch: {
        tags: ['products'],
        summary: 'Atualiza produto',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'product_id', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ProductUpdateRequest' } } } },
        responses: { '200': { description: 'OK' } },
      },
      delete: {
        tags: ['products'],
        summary: 'Exclusao logica de produto',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'product_id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/dashboard/overview': {
      get: {
        tags: ['dashboard'],
        summary: 'Visao geral de metricas do dashboard',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'period', required: false, schema: { $ref: '#/components/schemas/DashboardPeriod' } },
          { in: 'query', name: 'start_date', required: false, schema: { type: 'string', format: 'date' } },
          { in: 'query', name: 'end_date', required: false, schema: { type: 'string', format: 'date' } },
          { in: 'query', name: 'view_by', required: false, schema: { $ref: '#/components/schemas/DashboardViewBy' } },
          { in: 'query', name: 'scope', required: false, schema: { $ref: '#/components/schemas/DashboardScope' } },
          { in: 'query', name: 'company_id', required: false, schema: { type: 'string', format: 'uuid' } },
          { in: 'query', name: 'rank_limit', required: false, schema: { type: 'integer', minimum: 1, maximum: 20 } },
        ],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/dashboard/interactions-series': {
      get: {
        tags: ['dashboard'],
        summary: 'Serie temporal de interacoes para o dashboard',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'period', required: false, schema: { $ref: '#/components/schemas/DashboardPeriod' } },
          { in: 'query', name: 'start_date', required: false, schema: { type: 'string', format: 'date' } },
          { in: 'query', name: 'end_date', required: false, schema: { type: 'string', format: 'date' } },
          { in: 'query', name: 'view_by', required: false, schema: { $ref: '#/components/schemas/DashboardViewBy' } },
          { in: 'query', name: 'scope', required: false, schema: { $ref: '#/components/schemas/DashboardScope' } },
          { in: 'query', name: 'company_id', required: false, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/dashboard/filter-options': {
      get: {
        tags: ['dashboard'],
        summary: 'Opcoes de filtros do dashboard (periodo, visao e empresas)',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'query', name: 'company_id', required: false, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/conversations': {
      get: {
        tags: ['conversations'],
        summary: 'Lista conversas por vendedor com filtros e paginacao',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'q', required: false, schema: { type: 'string' } },
          { in: 'query', name: 'company_id', required: false, schema: { type: 'string', format: 'uuid' } },
          { in: 'query', name: 'vendedor_nome', required: false, schema: { type: 'string' } },
          { in: 'query', name: 'vendedor_telefone', required: false, schema: { type: 'string' } },
          { in: 'query', name: 'start_date', required: false, schema: { type: 'string', format: 'date' } },
          { in: 'query', name: 'end_date', required: false, schema: { type: 'string', format: 'date' } },
          { in: 'query', name: 'page', required: false, schema: { type: 'integer', minimum: 1 } },
          { in: 'query', name: 'page_size', required: false, schema: { type: 'integer', minimum: 1, maximum: 100 } },
        ],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/conversations/{conversation_id}': {
      get: {
        tags: ['conversations'],
        summary: 'Detalhe de uma conversa no formato timeline',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'conversation_id', required: true, schema: { type: 'string', format: 'uuid' } },
          { in: 'query', name: 'date', required: false, schema: { type: 'string', format: 'date' } },
          { in: 'query', name: 'start_date', required: false, schema: { type: 'string', format: 'date' } },
          { in: 'query', name: 'end_date', required: false, schema: { type: 'string', format: 'date' } },
        ],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/conversations/webhook': {
      post: {
        tags: ['conversations'],
        summary: 'Recebe mensagens de historico e detecta produtos citados por texto',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                additionalProperties: true,
                description:
                  "Payload livre (objeto unico ou lote em 'messages'/'mensagens'). Para resolucao automatica de vendedor/empresa, envie 'vendedor_telefone'. Telefone e normalizado para somente digitos; quando vier com 10/11 digitos sem DDI, a API prefixa 55.",
              },
            },
          },
        },
        responses: { '201': { description: 'Criado' } },
      },
    },
    '/api/located-clients': {
      get: {
        tags: ['located-clients'],
        summary: 'Lista clientes localizados com filtros e paginacao',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'seller', required: false, schema: { type: 'string' } },
          { in: 'query', name: 'status', required: false, schema: { $ref: '#/components/schemas/LocatedClientStatus' } },
          { in: 'query', name: 'company_id', required: false, schema: { type: 'string', format: 'uuid' } },
          { in: 'query', name: 'start_date', required: false, schema: { type: 'string', format: 'date' } },
          { in: 'query', name: 'end_date', required: false, schema: { type: 'string', format: 'date' } },
          { in: 'query', name: 'page', required: false, schema: { type: 'integer', minimum: 1 } },
          { in: 'query', name: 'page_size', required: false, schema: { type: 'integer', minimum: 1, maximum: 100 } },
        ],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/located-clients/{located_client_id}': {
      get: {
        tags: ['located-clients'],
        summary: 'Busca cliente localizado por id',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'located_client_id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'OK' } },
      },
      delete: {
        tags: ['located-clients'],
        summary: 'Exclusao logica de cliente localizado',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'located_client_id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/located-clients/{located_client_id}/status': {
      patch: {
        tags: ['located-clients'],
        summary: 'Atualiza status do cliente localizado',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'located_client_id', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LocatedClientStatusUpdateRequest' } } } },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/located-clients/webhook': {
      post: {
        tags: ['located-clients'],
        summary: 'Recebe clientes localizados pela integracao de IA',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                additionalProperties: true,
                description:
                  "Payload livre (objeto unico ou lote em 'clientes'/'items'/'messages'). Para resolucao automatica de vendedor/empresa, envie 'seller_phone' ou 'vendedor_telefone'. Telefone e normalizado para somente digitos; quando vier com 10/11 digitos sem DDI, a API prefixa 55.",
              },
            },
          },
        },
        responses: { '201': { description: 'Criado' } },
      },
    },
  },
} as const;



