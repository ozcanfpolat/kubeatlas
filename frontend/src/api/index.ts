import apiClient from './client'
import type {
  ApiResponse,
  PaginatedResponse,
  LoginRequest,
  LoginResponse,
  User,
  Cluster,
  CreateClusterRequest,
  Namespace,
  UpdateNamespaceRequest,
  Team,
  TeamMember,
  BusinessUnit,
  InternalDependency,
  ExternalDependency,
  DependencyGraph,
  Document,
  DocumentCategory,
  DashboardStats,
  EnvironmentDistribution,
  BusinessUnitDistribution,
  MissingInfo,
  AuditLog,
} from '@/types'

// ============================================
// Auth API
// ============================================

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', data)
    return response.data
  },
  
  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout')
  },
  
  refreshToken: async (refreshToken: string) => {
    const response = await apiClient.post('/auth/refresh', { refresh_token: refreshToken })
    return response.data.data
  },
  
  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<ApiResponse<User>>('/users/me')
    return response.data.data
  },
}

// ============================================
// Dashboard API
// ============================================

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get<ApiResponse<DashboardStats>>('/dashboard/stats')
    return response.data.data
  },
  
  getRecentActivities: async (limit = 10): Promise<AuditLog[]> => {
    const response = await apiClient.get<ApiResponse<AuditLog[]>>('/dashboard/recent-activities', {
      params: { limit },
    })
    return response.data.data
  },
  
  getMissingInfo: async (limit = 10): Promise<MissingInfo> => {
    const response = await apiClient.get<ApiResponse<MissingInfo>>('/dashboard/missing-info', {
      params: { limit },
    })
    return response.data.data
  },
}

// ============================================
// Clusters API
// ============================================

export const clustersApi = {
  list: async (params?: {
    page?: number
    page_size?: number
    status?: string
    cluster_type?: string
    environment?: string
    search?: string
  }): Promise<PaginatedResponse<Cluster>> => {
    const response = await apiClient.get<PaginatedResponse<Cluster>>('/clusters', { params })
    return response.data
  },
  
  getById: async (id: string): Promise<Cluster> => {
    const response = await apiClient.get<ApiResponse<Cluster>>(`/clusters/${id}`)
    return response.data.data
  },
  
  create: async (data: CreateClusterRequest): Promise<Cluster> => {
    const response = await apiClient.post<ApiResponse<Cluster>>('/clusters', data)
    return response.data.data
  },
  
  update: async (id: string, data: Partial<CreateClusterRequest>): Promise<Cluster> => {
    const response = await apiClient.put<ApiResponse<Cluster>>(`/clusters/${id}`, data)
    return response.data.data
  },
  
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/clusters/${id}`)
  },
  
  sync: async (id: string): Promise<void> => {
    await apiClient.post(`/clusters/${id}/sync`)
  },
  
  getNamespaces: async (id: string, params?: {
    page?: number
    page_size?: number
  }): Promise<PaginatedResponse<Namespace>> => {
    const response = await apiClient.get<PaginatedResponse<Namespace>>(`/clusters/${id}/namespaces`, { params })
    return response.data
  },
  
  getStats: async (): Promise<Record<string, number>> => {
    const response = await apiClient.get<ApiResponse<Record<string, number>>>('/clusters/stats')
    return response.data.data
  },
}

// ============================================
// Namespaces API
// ============================================

export const namespacesApi = {
  list: async (params?: {
    page?: number
    page_size?: number
    cluster_id?: string
    environment?: string
    criticality?: string
    business_unit_id?: string
    team_id?: string
    search?: string
    orphaned?: boolean
    undocumented?: boolean
  }): Promise<PaginatedResponse<Namespace>> => {
    const response = await apiClient.get<PaginatedResponse<Namespace>>('/namespaces', { params })
    return response.data
  },
  
  getById: async (id: string): Promise<Namespace> => {
    const response = await apiClient.get<ApiResponse<Namespace>>(`/namespaces/${id}`)
    return response.data.data
  },
  
  update: async (id: string, data: UpdateNamespaceRequest): Promise<Namespace> => {
    const response = await apiClient.put<ApiResponse<Namespace>>(`/namespaces/${id}`, data)
    return response.data.data
  },
  
  getDependencies: async (id: string): Promise<{
    internal: InternalDependency[]
    external: ExternalDependency[]
  }> => {
    const response = await apiClient.get<ApiResponse<{
      internal: InternalDependency[]
      external: ExternalDependency[]
    }>>(`/namespaces/${id}/dependencies`)
    return response.data.data
  },
  
  getDocuments: async (id: string): Promise<Document[]> => {
    const response = await apiClient.get<ApiResponse<Document[]>>(`/namespaces/${id}/documents`)
    return response.data.data
  },
  
  getHistory: async (id: string, limit = 50): Promise<AuditLog[]> => {
    const response = await apiClient.get<ApiResponse<AuditLog[]>>(`/namespaces/${id}/history`, {
      params: { limit },
    })
    return response.data.data
  },
  
  getEnvironmentDistribution: async (): Promise<EnvironmentDistribution[]> => {
    const response = await apiClient.get<ApiResponse<EnvironmentDistribution[]>>('/reports/environment-distribution')
    return response.data.data
  },
  
  getBusinessUnitDistribution: async (): Promise<BusinessUnitDistribution[]> => {
    const response = await apiClient.get<ApiResponse<BusinessUnitDistribution[]>>('/reports/business-unit-distribution')
    return response.data.data
  },
}

// ============================================
// Teams API
// ============================================

export const teamsApi = {
  list: async (): Promise<Team[]> => {
    const response = await apiClient.get<ApiResponse<Team[]>>('/teams')
    return response.data.data
  },
  
  getById: async (id: string): Promise<Team> => {
    const response = await apiClient.get<ApiResponse<Team>>(`/teams/${id}`)
    return response.data.data
  },
  
  create: async (data: Partial<Team>): Promise<Team> => {
    const response = await apiClient.post<ApiResponse<Team>>('/teams', data)
    return response.data.data
  },
  
  update: async (id: string, data: Partial<Team>): Promise<Team> => {
    const response = await apiClient.put<ApiResponse<Team>>(`/teams/${id}`, data)
    return response.data.data
  },
  
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/teams/${id}`)
  },
  
  getMembers: async (id: string): Promise<TeamMember[]> => {
    const response = await apiClient.get<ApiResponse<TeamMember[]>>(`/teams/${id}/members`)
    return response.data.data
  },
  
  addMember: async (teamId: string, userId: string, role = 'member'): Promise<void> => {
    await apiClient.post(`/teams/${teamId}/members`, { user_id: userId, role })
  },
  
  removeMember: async (teamId: string, userId: string): Promise<void> => {
    await apiClient.delete(`/teams/${teamId}/members/${userId}`)
  },
}

// ============================================
// Business Units API
// ============================================

export const businessUnitsApi = {
  list: async (): Promise<BusinessUnit[]> => {
    const response = await apiClient.get<ApiResponse<BusinessUnit[]>>('/business-units')
    return response.data.data
  },
  
  getById: async (id: string): Promise<BusinessUnit> => {
    const response = await apiClient.get<ApiResponse<BusinessUnit>>(`/business-units/${id}`)
    return response.data.data
  },
}

// ============================================
// Dependencies API
// ============================================

export const dependenciesApi = {
  listInternal: async (params?: {
    page?: number
    page_size?: number
  }): Promise<PaginatedResponse<InternalDependency>> => {
    const response = await apiClient.get<PaginatedResponse<InternalDependency>>('/dependencies/internal', { params })
    return response.data
  },
  
  createInternal: async (data: Partial<InternalDependency>): Promise<InternalDependency> => {
    const response = await apiClient.post<ApiResponse<InternalDependency>>('/dependencies/internal', data)
    return response.data.data
  },
  
  updateInternal: async (id: string, data: Partial<InternalDependency>): Promise<InternalDependency> => {
    const response = await apiClient.put<ApiResponse<InternalDependency>>(`/dependencies/internal/${id}`, data)
    return response.data.data
  },
  
  deleteInternal: async (id: string): Promise<void> => {
    await apiClient.delete(`/dependencies/internal/${id}`)
  },
  
  listExternal: async (namespaceId: string): Promise<ExternalDependency[]> => {
    const response = await apiClient.get<ApiResponse<ExternalDependency[]>>('/dependencies/external', {
      params: { namespace_id: namespaceId },
    })
    return response.data.data
  },
  
  createExternal: async (data: Partial<ExternalDependency>): Promise<ExternalDependency> => {
    const response = await apiClient.post<ApiResponse<ExternalDependency>>('/dependencies/external', data)
    return response.data.data
  },
  
  updateExternal: async (id: string, data: Partial<ExternalDependency>): Promise<ExternalDependency> => {
    const response = await apiClient.put<ApiResponse<ExternalDependency>>(`/dependencies/external/${id}`, data)
    return response.data.data
  },
  
  deleteExternal: async (id: string): Promise<void> => {
    await apiClient.delete(`/dependencies/external/${id}`)
  },
  
  getGraph: async (namespaceId: string): Promise<DependencyGraph> => {
    const response = await apiClient.get<ApiResponse<DependencyGraph>>(`/dependencies/graph/${namespaceId}`)
    return response.data.data
  },
}

// ============================================
// Documents API
// ============================================

export const documentsApi = {
  list: async (limit = 50): Promise<Document[]> => {
    const response = await apiClient.get<ApiResponse<Document[]>>('/documents', {
      params: { limit },
    })
    return response.data.data
  },
  
  getById: async (id: string): Promise<Document> => {
    const response = await apiClient.get<ApiResponse<Document>>(`/documents/${id}`)
    return response.data.data
  },
  
  upload: async (file: File, data: {
    namespace_id?: string
    cluster_id?: string
    name?: string
    description?: string
    category_id?: string
  }): Promise<Document> => {
    const formData = new FormData()
    formData.append('file', file)
    if (data.namespace_id) formData.append('namespace_id', data.namespace_id)
    if (data.cluster_id) formData.append('cluster_id', data.cluster_id)
    if (data.name) formData.append('name', data.name)
    if (data.description) formData.append('description', data.description)
    if (data.category_id) formData.append('category_id', data.category_id)
    
    const response = await apiClient.post<ApiResponse<Document>>('/documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data.data
  },
  
  update: async (id: string, data: Partial<Document>): Promise<Document> => {
    const response = await apiClient.put<ApiResponse<Document>>(`/documents/${id}`, data)
    return response.data.data
  },
  
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/documents/${id}`)
  },
  
  getDownloadUrl: (id: string): string => {
    return `${apiClient.defaults.baseURL}/documents/${id}/download`
  },
  
  getCategories: async (): Promise<DocumentCategory[]> => {
    const response = await apiClient.get<ApiResponse<DocumentCategory[]>>('/documents/categories')
    return response.data.data
  },
}

// ============================================
// Users API
// ============================================

export const usersApi = {
  list: async (params?: {
    page?: number
    page_size?: number
  }): Promise<PaginatedResponse<User>> => {
    const response = await apiClient.get<PaginatedResponse<User>>('/users', { params })
    return response.data
  },
  
  getById: async (id: string): Promise<User> => {
    const response = await apiClient.get<ApiResponse<User>>(`/users/${id}`)
    return response.data.data
  },
  
  create: async (data: {
    email: string
    password: string
    username?: string
    full_name?: string
    phone?: string
    role?: string
  }): Promise<User> => {
    const response = await apiClient.post<ApiResponse<User>>('/users', data)
    return response.data.data
  },
  
  update: async (id: string, data: Partial<User>): Promise<User> => {
    const response = await apiClient.put<ApiResponse<User>>(`/users/${id}`, data)
    return response.data.data
  },
  
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}`)
  },
}

// ============================================
// Audit API
// ============================================

export const auditApi = {
  list: async (params?: {
    page?: number
    page_size?: number
    action?: string
    resource_type?: string
  }): Promise<PaginatedResponse<AuditLog>> => {
    const response = await apiClient.get<PaginatedResponse<AuditLog>>('/audit', { params })
    return response.data
  },
  
  getByResource: async (resourceType: string, resourceId: string, limit = 50): Promise<AuditLog[]> => {
    const response = await apiClient.get<ApiResponse<AuditLog[]>>(`/audit/${resourceType}/${resourceId}`, {
      params: { limit },
    })
    return response.data.data
  },
}
