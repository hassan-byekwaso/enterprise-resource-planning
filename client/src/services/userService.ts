export type UserRole =
  | "SUPER_ADMIN"
  | "MANAGER"
  | "EMPLOYEE"
  | "ACCOUNTANT"
  | "INVENTORY_MANAGER";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

type ApiErrorResponse = {
  error?: string;
};

export class UserServiceError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "UserServiceError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorResponse;
    throw new UserServiceError(body.error ?? "The request could not be completed", response.status);
  }

  return response.json() as Promise<T>;
}

export async function fetchUsers(): Promise<User[]> {
  const response = await request<{ users: User[] }>("/api/users");
  return response.users;
}

export async function createUser(userData: CreateUserData): Promise<User> {
  const response = await request<{ user: User }>("/api/users", {
    method: "POST",
    body: JSON.stringify(userData),
  });
  return response.user;
}
