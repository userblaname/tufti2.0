// Development-only admin bypass configuration
export const ADMIN_CREDENTIALS = {
  email: 'admin@test.com',
  password: 'admin123',
  uid: 'admin-uid-123',
  displayName: 'Admin User',
  permissions: ['all'] as const
}

export interface AdminUser {
  uid: string
  email: string
  displayName: string
  isAdmin: true
  permissions: readonly string[]
}

export function isAdminCredentials(email: string, password: string): boolean {
  return email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password
}

export function getAdminUser(): AdminUser {
  return {
    uid: ADMIN_CREDENTIALS.uid,
    email: ADMIN_CREDENTIALS.email,
    displayName: ADMIN_CREDENTIALS.displayName,
    isAdmin: true,
    permissions: ADMIN_CREDENTIALS.permissions
  }
}