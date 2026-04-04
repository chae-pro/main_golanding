export type LandingType = "button" | "form" | "html";

export type ThemeConfig = {
  primaryColor: string;
  textColor: string;
  surfaceColor: string;
  radius: number;
};

export type LandingImage = {
  id: string;
  sortOrder: number;
  src: string;
  alt?: string;
};

export type LandingButton = {
  id: string;
  label: string;
  href: string;
  widthRatio: number;
  sortOrder: number;
};

export type LandingFormFieldKey =
  | "name"
  | "email"
  | "phone"
  | "address"
  | "memo1"
  | "memo2"
  | "memo3";

export type LandingFormField = {
  id: string;
  fieldKey: LandingFormFieldKey;
  label: string;
  placeholder?: string;
  required: boolean;
  sortOrder: number;
};

export type LandingHtmlSource = {
  htmlSource: string;
};

export type LandingMetrics = {
  visitorCount: number;
  totalClickCount: number;
  ctaClickCount: number;
  formSubmissionCount: number;
  avgScrollDepth: number;
  avgDwellSeconds: number;
  scrollCompletionRate: number;
  validDwellSessionCount: number;
  excludedDwellSessionCount: number;
  dwellSections: number[];
  topSections: number[];
  weakSections: number[];
};

export type Landing = {
  id: string;
  ownerEmail: string;
  type: LandingType;
  title: string;
  publicSlug: string;
  status: "draft" | "published" | "archived";
  description?: string;
  metaPixelId?: string;
  theme: ThemeConfig;
  images: LandingImage[];
  buttons: LandingButton[];
  formFields: LandingFormField[];
  htmlSource: LandingHtmlSource | null;
  metrics: LandingMetrics;
  createdAt: string;
  updatedAt: string;
};

export type ApprovedAccount = {
  id: string;
  email: string;
  name: string;
  cohort?: string;
  status: "approved" | "blocked" | "expired";
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreatorSession = {
  id: string;
  approvedAccountId: string;
  email: string;
  tokenVersion: number;
  expiresAt: string;
  status: "active" | "revoked" | "expired";
  lastValidatedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminCreatorSession = CreatorSession & {
  accountName: string;
  cohort?: string;
};

export type SignupRequest = {
  id: string;
  email: string;
  name: string;
  cohort?: string;
  coupon?: string;
  note?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
};

export type CouponCode = {
  id: string;
  code: string;
  validDays: number;
  maxUses: number;
  status: "active" | "inactive";
  redeemedCount: number;
  remainingUses: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminOverviewMetrics = {
  approvedAccountCount: number;
  activeSessionCount: number;
  publishedLandingCount: number;
  totalLandingCount: number;
  recentVisitorCount: number;
  recentFormSubmissionCount: number;
};

export type DeploymentCheckStatus = "pass" | "warn" | "fail";

export type DeploymentReadinessCheck = {
  id: string;
  label: string;
  status: DeploymentCheckStatus;
  detail: string;
};

export type DeploymentReadiness = {
  environment: string;
  dbProvider: string;
  storageProvider: string;
  overallStatus: DeploymentCheckStatus;
  checks: DeploymentReadinessCheck[];
};

export type AccessTokenPayload = {
  sessionId: string;
  email: string;
  tokenVersion: number;
  expiresAt: string;
};

export type LandingCreateInput = {
  ownerEmail: string;
  type: LandingType;
  title: string;
  publicSlug: string;
  description?: string;
  metaPixelId?: string;
  theme: ThemeConfig;
  images: LandingImage[];
  buttons: LandingButton[];
  formFields: LandingFormField[];
  htmlSource: LandingHtmlSource | null;
};

export type LandingUpdateInput = LandingCreateInput & {
  landingId: string;
};

export type AnalyticsEventType = "pageview" | "scroll" | "click" | "form_submit" | "activity";

export type AnalyticsTargetType = "page" | "cta" | "form";

export type VisitorSession = {
  id: string;
  landingId: string;
  startedAt: string;
  lastActivityAt: string;
  lastSectionIndex: number;
  lastViewportTopRatio: number;
  lastViewportBottomRatio: number;
  maxVisibleSectionIndex: number;
  maxScrollDepth: number;
  excludedFromDwell: boolean;
  validDwellMs: number;
  sectionDwellMs: number[];
};

export type AnalyticsEvent = {
  id: string;
  landingId: string;
  sessionId: string;
  eventType: AnalyticsEventType;
  sectionIndex: number;
  scrollDepth?: number;
  xRatio?: number;
  yRatio?: number;
  targetType?: AnalyticsTargetType;
  targetId?: string;
  occurredAt: string;
};

export type FormSubmissionValue = {
  fieldKey: string;
  label: string;
  value: string;
};

export type FormSubmissionRecord = {
  id: string;
  landingId: string;
  sessionId: string | null;
  submittedAt: string;
  values: FormSubmissionValue[];
};

export type HeatmapPoint = {
  id: string;
  xRatio: number;
  yRatio: number;
  targetType: AnalyticsTargetType;
};

export type ScrollSectionMetric = {
  section: number;
  reachRate: number;
  avgDwellSeconds: number;
  reachedSessionCount: number;
  totalSessionCount: number;
};

export type LandingAnalysisVisuals = {
  heatmapPoints: HeatmapPoint[];
  scrollSections: ScrollSectionMetric[];
  dwellSections: number[];
};
