import type {
  BaseKey,
  BaseRecord,
  CreateParams,
  CustomParams,
  DataProvider,
  DeleteOneParams,
  GetListParams,
  GetOneParams,
  UpdateParams,
} from "@refinedev/core";
import { apiClient } from "./api-client";
import { API_URL } from "./constants";

type ResourceEndpoint = {
  list?: string;
  show?: (id: BaseKey) => string;
  create?: string;
  update?: (id: BaseKey) => string;
  delete?: (id: BaseKey) => string;
};

const endpoints: Record<string, ResourceEndpoint> = {
  cases: {
    list: "/api/cases",
    show: (id) => `/api/cases/${id}`,
    create: "/api/cases",
    update: (id) => `/api/cases/${id}`,
  },
  "case-status": {
    update: (id) => `/api/cases/${id}/status`,
  },
  "maintenance-operations": {
    list: "/api/cases/maintenance-operations",
    show: (id) => `/api/cases/maintenance-operations/${id}`,
  },
  customers: {
    list: "/api/customers",
    show: (id) => `/api/customers/${id}`,
    create: "/api/customers",
    update: (id) => `/api/customers/${id}`,
  },
  "accounting-customers": {
    list: "/api/customers",
    show: (id) => `/api/customers/${id}`,
    create: "/api/customers",
    update: (id) => `/api/customers/${id}`,
  },
  "customer-details": {
    show: (id) => `/api/customers/${id}/details`,
    update: (id) => `/api/customers/${id}`,
  },
  devices: {
    list: "/api/devices",
    show: (id) => `/api/devices/${id}`,
    create: "/api/devices",
  },
  technicians: {
    list: "/api/auth/technicians",
  },
  "accounting-team": {
    list: "/api/auth/team",
    show: (id) => `/api/auth/team/${id}`,
  },
  invitations: {
    list: "/api/invitations",
    create: "/api/invitations",
  },
  inventory: {
    list: "/api/inventory/items",
    show: (id) => `/api/inventory/items/${id}`,
    create: "/api/inventory/items",
    update: (id) => `/api/inventory/items/${id}`,
    delete: (id) => `/api/inventory/items/${id}`,
  },
  "inventory-categories": {
    list: "/api/inventory/categories",
    create: "/api/inventory/categories",
  },
  sales: {
    list: "/api/invoices",
    show: (id) => `/api/invoices/${id}`,
  },
  invoices: {
    list: "/api/invoices",
    show: (id) => `/api/invoices/${id}`,
    create: "/api/invoices",
  },
};

const getEndpoint = (resource: string) => {
  const endpoint = endpoints[resource];
  if (!endpoint) {
    throw new Error(`No backend endpoint is configured for ${resource}.`);
  }

  return endpoint;
};

const getCustomPath = <TQuery, TPayload>({
  url,
  query,
}: CustomParams<TQuery, TPayload>) => {
  const path = url.startsWith("http") ? url.replace(API_URL, "") : url;
  return {
    path,
    query: query as Record<string, unknown> | undefined,
  };
};

const unsupportedDelete = ({ resource }: { resource: string }): never => {
  throw new Error(`Delete is not available for ${resource} in the backend API yet.`);
};

export const dataProvider: DataProvider = {
  getApiUrl: () => API_URL,

  async getList<TData extends BaseRecord = BaseRecord>({
    resource,
  }: GetListParams) {
    const endpoint = getEndpoint(resource);
    if (!endpoint.list) {
      throw new Error(`List is not available for ${resource}.`);
    }

    const data = await apiClient<TData[]>(endpoint.list);

    return {
      data,
      total: Array.isArray(data) ? data.length : 0,
    };
  },

  async getOne<TData extends BaseRecord = BaseRecord>({
    resource,
    id,
  }: GetOneParams) {
    const endpoint = getEndpoint(resource);
    if (!endpoint.show) {
      throw new Error(`Show is not available for ${resource}.`);
    }

    return {
      data: await apiClient<TData>(endpoint.show(id)),
    };
  },

  async create<TData extends BaseRecord = BaseRecord, TVariables = {}>({
    resource,
    variables,
  }: CreateParams<TVariables>) {
    const endpoint = getEndpoint(resource);
    if (!endpoint.create) {
      throw new Error(`Create is not available for ${resource} in the backend API yet.`);
    }

    return {
      data: await apiClient<TData>(endpoint.create, {
        method: "POST",
        body: variables,
      }),
    };
  },

  async update<TData extends BaseRecord = BaseRecord, TVariables = {}>({
    resource,
    id,
    variables,
  }: UpdateParams<TVariables>) {
    const endpoint = getEndpoint(resource);
    if (!endpoint.update) {
      throw new Error(`Update is not available for ${resource}.`);
    }

    return {
      data: await apiClient<TData>(endpoint.update(id), {
        method: "PATCH",
        body: variables,
      }),
    };
  },

  async deleteOne<TData extends BaseRecord = BaseRecord, TVariables = {}>(
    params: DeleteOneParams<TVariables>
  ) {
    const endpoint = endpoints[params.resource];
    const deletePath = endpoint?.delete;

    if (typeof deletePath === "function") {
      return {
        data: await apiClient<TData>(deletePath(params.id), {
          method: "DELETE",
        }),
      };
    }

    return unsupportedDelete({ resource: params.resource });
  },

  async custom<
    TData extends BaseRecord = BaseRecord,
    TQuery = unknown,
    TPayload = unknown
  >({
    url,
    method,
    payload,
    query,
    headers,
  }: CustomParams<TQuery, TPayload>) {
    const { path, query: customQuery } = getCustomPath({
      url,
      method,
      payload,
      query,
      headers,
    });

    return {
      data: await apiClient<TData>(path, {
        method: method.toUpperCase() as "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
        body: payload,
        query: customQuery,
        headers,
      }),
    };
  },
};
