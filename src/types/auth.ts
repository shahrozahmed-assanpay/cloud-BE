export const roleTypes = ['admin', 'supervisor', 'agent'] as const

export type RoleType = (typeof roleTypes)[number]

export type SessionUser = {
  userId: string
  email: string
  roleType: RoleType
  sessionVersion: number
}

export type AppVariables = {
  auth: SessionUser
}

export type AppEnv = {
  Bindings: {
    NOTIFICATION_HUB: DurableObjectNamespace
    NODE_ENV?: string
    APP_PORT?: string
    DATABASE_URL: string
    JWT_ACCESS_SECRET: string
    JWT_REFRESH_SECRET: string
    ACCESS_TOKEN_TTL_MINUTES?: string
    REFRESH_TOKEN_TTL_DAYS?: string
    ALLOW_ADMIN_REGISTRATION?: string
    COOKIE_DOMAIN?: string
    COOKIE_SECURE?: string
    CORS_ORIGIN?: string
    GOOGLE_DRIVE_CLIENT_EMAIL?: string
    GOOGLE_DRIVE_PRIVATE_KEY?: string
    GOOGLE_DRIVE_PARENT_FOLDER_ID?: string
    RESEND_API_KEY?: string
    EMAIL_FROM?: string
    EMAIL_REPLY_TO?: string
    EMAIL_TEST_TO?: string
    PUBLIC_APP_URL?: string
    RESUBMISSION_TOKEN_TTL_DAYS?: string
  }
  Variables: AppVariables
}
