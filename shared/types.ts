import type { PublicSettings } from './settings'

export interface Img { url: string | null }
export interface PublicProject { id: number, title: string, slug: string, shortDescription: string, description: string, problem: string, features: string[], category: string, technologies: string[], coverImageUrl: string | null, gallery: { url: string, publicId: string, alt?: string }[], liveUrl: string | null, repositoryUrl: string | null, status: 'draft' | 'published', featured: boolean, sortOrder: number, preset: string, color: string | null, projectDate: string | null, isDemo: boolean }
export interface PublicSkill { id: number, name: string, slug: string, category: string, description: string, icon: string | null, iconUrl: string | null, color: string | null, proficiency: number | null, visible: boolean, featured: boolean, sortOrder: number, allowedModes: string[], preset: string, linkedSkillIds: number[], isDemo: boolean }
export interface PublicEducation { id: number, title: string, institution: string, degree: string, field: string, description: string, startDate: string, endDate: string | null, isCurrent: boolean, achievements: string[], imageUrl: string | null, url: string | null, color: string | null, preset: string, visible: boolean, featured: boolean, sortOrder: number, isDemo: boolean }
export interface PublicExperience { id: number, organization: string, role: string, kind: string, location: string | null, startDate: string, endDate: string | null, isCurrent: boolean, description: string, missions: string[], results: string[], technologies: string[], imageUrl: string | null, url: string | null, color: string | null, preset: string, visible: boolean, featured: boolean, sortOrder: number, isDemo: boolean }
export interface PublicCertification { id: number, name: string, issuer: string, category: string, issuedAt: string | null, expiresAt: string | null, credentialId: string | null, verificationUrl: string | null, imageUrl: string | null, color: string | null, preset: string, visible: boolean, featured: boolean, sortOrder: number, isDemo: boolean }
export interface PublicAchievement { id: number, title: string, category: string, categoryId: number | null, description: string, date: string | null, linkUrl: string | null, imageUrl: string | null, preset: string, color: string | null, visible: boolean, sortOrder: number, isDemo: boolean }

export interface PublicContent {
  settings: PublicSettings
  projects: PublicProject[]
  skills: PublicSkill[]
  education: PublicEducation[]
  experiences: PublicExperience[]
  certifications: PublicCertification[]
  achievements: PublicAchievement[]
  preview: boolean
  generatedAt: string
}

export type DetailItem =
  | { type: 'project', data: PublicProject }
  | { type: 'skill', data: PublicSkill }
  | { type: 'education', data: PublicEducation }
  | { type: 'experience', data: PublicExperience }
  | { type: 'certification', data: PublicCertification }
  | { type: 'achievement', data: PublicAchievement }
