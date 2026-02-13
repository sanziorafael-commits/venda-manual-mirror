export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'HandSell API',
    version: '1.0.0',
    description: 'Documentação básica dos endpoints da API HandSell',
  },
  tags: [
    { name: 'health' },
    { name: 'auth' },
    { name: 'me' },
    { name: 'companies' },
    { name: 'users' },
    { name: 'uploads' },
    { name: 'dashboard' },
    { name: 'conversations' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  paths: {
    '/api/health': {
      get: {
        tags: ['health'],
        summary: 'Healthcheck da API',
        responses: {
          '200': {
            description: 'API online',
          },
        },
      },
    },
    '/api/auth/bootstrap-admin': {
      post: { tags: ['auth'], summary: 'Cria admin inicial', responses: { '201': { description: 'Criado' } } },
    },
    '/api/auth/login': {
      post: { tags: ['auth'], summary: 'Autentica usuário', responses: { '200': { description: 'OK' } } },
    },
    '/api/auth/refresh': {
      post: { tags: ['auth'], summary: 'Renova sessão', responses: { '200': { description: 'OK' } } },
    },
    '/api/auth/logout': {
      post: { tags: ['auth'], summary: 'Encerra sessão', responses: { '200': { description: 'OK' } } },
    },
    '/api/auth/forgot-password': {
      post: { tags: ['auth'], summary: 'Solicita reset de senha', responses: { '200': { description: 'OK' } } },
    },
    '/api/auth/reset-password': {
      post: { tags: ['auth'], summary: 'Redefine senha', responses: { '200': { description: 'OK' } } },
    },
    '/api/auth/activate-account': {
      post: { tags: ['auth'], summary: 'Ativa conta', responses: { '200': { description: 'OK' } } },
    },
    '/api/auth/resend-activation': {
      post: {
        tags: ['auth'],
        summary: 'Reenvia ativação',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/me': {
      get: {
        tags: ['me'],
        summary: 'Dados do usuário autenticado',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'OK' } },
      },
      patch: {
        tags: ['me'],
        summary: 'Atualiza dados do usuário autenticado',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/companies': {
      get: {
        tags: ['companies'],
        summary: 'Lista empresas',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'OK' } },
      },
      post: {
        tags: ['companies'],
        summary: 'Cria empresa',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Criado' } },
      },
    },
    '/api/companies/{companyId}': {
      get: {
        tags: ['companies'],
        summary: 'Busca empresa por id (inclui logoSignedUrl para leitura privada)',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'companyId', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' } },
      },
      patch: {
        tags: ['companies'],
        summary: 'Atualiza empresa',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'companyId', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' } },
      },
      delete: {
        tags: ['companies'],
        summary: 'Exclusão lógica de empresa',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'companyId', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/companies/{companyId}/users': {
      post: {
        tags: ['companies'],
        summary: 'Cria usuário para empresa',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'companyId', required: true, schema: { type: 'string' } }],
        responses: { '201': { description: 'Criado' } },
      },
    },
    '/api/users': {
      get: {
        tags: ['users'],
        summary: 'Lista usuários',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'OK' } },
      },
      post: {
        tags: ['users'],
        summary: 'Cria usuário',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Criado' } },
      },
    },
    '/api/users/{userId}': {
      get: {
        tags: ['users'],
        summary: 'Busca usuário por id',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'userId', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' } },
      },
      patch: {
        tags: ['users'],
        summary: 'Atualiza usuário',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'userId', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' } },
      },
      delete: {
        tags: ['users'],
        summary: 'Exclusão lógica de usuário',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'userId', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/users/actions/reassign-supervisor': {
      post: {
        tags: ['users'],
        summary: 'Reatribui carteira de supervisor',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/users/actions/reassign-manager-team': {
      post: {
        tags: ['users'],
        summary: 'Reatribui equipe de gerente',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/users/reassign-supervisor': {
      post: {
        tags: ['users'],
        summary: 'Reatribui carteira de supervisor (legado)',
        deprecated: true,
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/users/reassign-manager-team': {
      post: {
        tags: ['users'],
        summary: 'Reatribui equipe de gerente (legado)',
        deprecated: true,
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/uploads/signed-url': {
      post: {
        tags: ['uploads'],
        summary: 'Gera URL assinada para upload direto no GCS (bucket privado)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/dashboard/overview': {
      get: {
        tags: ['dashboard'],
        summary: 'Visao geral de metricas do dashboard',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/dashboard/interactions-series': {
      get: {
        tags: ['dashboard'],
        summary: 'Serie temporal de interacoes para o dashboard',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/dashboard/filter-options': {
      get: {
        tags: ['dashboard'],
        summary: 'Opcoes de filtros do dashboard (periodo, visao e empresas)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/conversations': {
      get: {
        tags: ['conversations'],
        summary: 'Lista historico de conversas com filtros e paginacao',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/conversations/{conversationId}': {
      get: {
        tags: ['conversations'],
        summary: 'Detalhe de uma conversa no formato timeline',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'conversationId', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/conversations/webhook': {
      post: {
        tags: ['conversations'],
        summary: 'Recebe mensagens de histórico e detecta produtos citados por texto',
        responses: { '201': { description: 'Criado' } },
      },
    },
  },
} as const;
