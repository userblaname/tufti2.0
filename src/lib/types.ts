import { z } from "zod"

// User Type
export interface User {
  uid: string
  email?: string | null
  displayName?: string | null
}

export interface AdminUser {
  uid: string
  email: string
  displayName: string
  isAdmin: true
}

// Auth Types
export const AuthStateSchema = z.object({
  isAuthenticated: z.boolean(),
  user: z.object({
    uid: z.string(),
    email: z.string().email().optional(),
    displayName: z.string().optional(),
    isAdmin: z.boolean().optional()
  }).optional()
})

export type AuthState = z.infer<typeof AuthStateSchema>

// User Profile Types
export const RTExperienceLevel = z.enum([
  "newcomer",
  "aware",
  "beginner",
  "practitioner",
  "advanced"
])

export const RTBooks = z.array(z.enum([
  "transurfing_1_5",
  "tufti",
  "none",
  "other"
]))

export const RealityFocus = z.enum([
  "purpose",
  "life_changes",
  "relationships",
  "career",
  "balance",
  "other"
])

export const TransformationIntent = z.enum([
  "understanding",
  "specific_situations",
  "practice",
  "awareness",
  "breaking_patterns",
  "other"
])

export const UserProfileSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().email().nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
  rtExperience: RTExperienceLevel.nullable().optional(),
  isAdmin: z.boolean().optional(),
  permissions: z.array(z.string()).optional(),
  booksRead: RTBooks.default([]),
  realityFocus: RealityFocus.nullable().optional(),
  focusDetails: z.string().optional().default(""),
  transformationIntent: TransformationIntent.nullable().optional(),
  intentDetails: z.string().optional().default(""),
  preferences: z.object({
    theme: z.enum(["light", "dark"]).default("dark"),
    notifications: z.boolean().default(true)
  }).optional().default({
    theme: "dark",
    notifications: true
  })
})

export type UserProfile = z.infer<typeof UserProfileSchema>

// Message Types
export const MessageSchema = z.object({
  id: z.string(),
  text: z.string(),
  sender: z.enum(["user", "tufti", "system"]),
  timestamp: z.date(),
  feedback: z.object({
    liked: z.boolean().optional(),
    reported: z.boolean().optional(),
    comment: z.string().optional()
  }).optional(),
  metadata: z.object({
    relevanceScore: z.number().optional(),
    sourceConfidence: z.number().optional(),
    cached: z.boolean().optional()
  }).optional()
})

export type Message = z.infer<typeof MessageSchema>