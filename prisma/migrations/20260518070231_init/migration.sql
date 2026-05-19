-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "citext";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('active', 'suspended', 'closed');

-- CreateEnum
CREATE TYPE "UserKind" AS ENUM ('staff', 'donor');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('invited', 'active', 'suspended', 'locked');

-- CreateEnum
CREATE TYPE "TwoFactorMethod" AS ENUM ('totp', 'webauthn');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('single', 'married', 'divorced', 'widowed', 'separated');

-- CreateEnum
CREATE TYPE "BeneficiaryStatus" AS ENUM ('draft', 'pending_review', 'active', 'on_hold', 'archived');

-- CreateEnum
CREATE TYPE "CaseState" AS ENUM ('submitted', 'under_review', 'verified', 'approved', 'rejected', 'receiving_aid', 'closed', 'archived');

-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('pending', 'approved', 'rejected', 'more_info_needed');

-- CreateEnum
CREATE TYPE "SchoolLevel" AS ENUM ('none', 'primary', 'preparatory', 'secondary', 'university');

-- CreateEnum
CREATE TYPE "HousingTenure" AS ENUM ('owned', 'rented', 'hosted', 'homeless', 'other');

-- CreateEnum
CREATE TYPE "HousingCondition" AS ENUM ('good', 'fair', 'poor', 'unsafe');

-- CreateEnum
CREATE TYPE "DiseaseStatus" AS ENUM ('active', 'controlled', 'recovered');

-- CreateEnum
CREATE TYPE "TreatmentStatus" AS ENUM ('pending', 'ongoing', 'completed');

-- CreateEnum
CREATE TYPE "SocialCoverageType" AS ENUM ('cnss', 'cnam', 'yellow_notebook', 'white_notebook', 'monthly_grant', 'none', 'other');

-- CreateEnum
CREATE TYPE "DocumentOwnerType" AS ENUM ('beneficiary', 'spouse', 'child', 'job', 'housing', 'disease', 'serious_illness', 'social_coverage', 'donation', 'expense', 'bill', 'organization');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('cin', 'medical', 'school', 'housing_proof', 'salary_proof', 'birth_certificate', 'marriage_certificate', 'divorce_certificate', 'death_certificate', 'unemployment_proof', 'bank_statement', 'utility_bill', 'signed_consent', 'other');

-- CreateEnum
CREATE TYPE "VirusScanStatus" AS ENUM ('pending', 'clean', 'infected', 'error');

-- CreateEnum
CREATE TYPE "PhotoVisibility" AS ENUM ('internal', 'donor', 'public');

-- CreateEnum
CREATE TYPE "ConsentPurpose" AS ENUM ('store_personal_data', 'share_photo_with_donors', 'share_name_with_donors', 'cross_org_dedup', 'cross_org_share_amount', 'marketing', 'publish_in_transparency');

-- CreateEnum
CREATE TYPE "JobSubjectType" AS ENUM ('beneficiary', 'spouse');

-- CreateEnum
CREATE TYPE "DonorVisibility" AS ENUM ('always', 'when_paid_out', 'never');

-- CreateEnum
CREATE TYPE "DonationKind" AS ENUM ('cash', 'card', 'bank_transfer', 'gateway', 'in_kind');

-- CreateEnum
CREATE TYPE "PledgeState" AS ENUM ('open', 'partially_paid', 'paid', 'overdue', 'cancelled');

-- CreateEnum
CREATE TYPE "RecurringInterval" AS ENUM ('weekly', 'monthly', 'quarterly', 'yearly');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('flouci', 'manual_cash', 'manual_card', 'bank_transfer', 'other');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('initiated', 'processing', 'succeeded', 'failed', 'refunded', 'chargeback');

-- CreateEnum
CREATE TYPE "InventoryCategory" AS ENUM ('food', 'medicine', 'clothing', 'school_supplies', 'hygiene', 'blankets', 'furniture', 'other');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('in', 'out', 'adjustment', 'expired_writeoff', 'damaged_writeoff');

-- CreateEnum
CREATE TYPE "DistributionKind" AS ENUM ('cash', 'goods', 'mixed');

-- CreateEnum
CREATE TYPE "DistributionStatus" AS ENUM ('planned', 'ready', 'delivered', 'cancelled');

-- CreateEnum
CREATE TYPE "DistributionLineKind" AS ENUM ('cash', 'item');

-- CreateEnum
CREATE TYPE "CampaignState" AS ENUM ('draft', 'active', 'closed');

-- CreateEnum
CREATE TYPE "BillRecipientType" AS ENUM ('donor', 'beneficiary', 'external', 'organization');

-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('issued', 'cancelled');

-- CreateEnum
CREATE TYPE "LedgerReferenceType" AS ENUM ('donation', 'distribution', 'expense', 'adjustment', 'refund', 'writeoff');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('in_app', 'email', 'sms', 'whatsapp');

-- CreateEnum
CREATE TYPE "NotificationTopic" AS ENUM ('pledge_reminder_donor', 'pledge_reminder_staff', 'pledge_overdue_staff', 'donation_received', 'receipt_issued', 'aid_ready_for_pickup', 'case_verification_due', 'case_state_changed', 'document_expiring', 'stock_expiring', 'stock_low', 'user_invited', 'login_new_device', 'password_changed', 'two_factor_changed', 'webhook_signature_failed', 'break_the_glass', 'system');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('pending', 'sent', 'failed', 'read');

-- CreateEnum
CREATE TYPE "VolunteerShiftState" AS ENUM ('scheduled', 'confirmed', 'present', 'absent', 'cancelled');

-- CreateEnum
CREATE TYPE "AuditOutcome" AS ENUM ('allow', 'deny', 'error');

-- CreateEnum
CREATE TYPE "PledgeReminderChannel" AS ENUM ('email', 'sms', 'whatsapp', 'phone_call', 'in_person');

-- CreateEnum
CREATE TYPE "BeneficiaryVisibilityScope" AS ENUM ('none', 'department', 'organization');

-- CreateTable
CREATE TABLE "organization" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "legalName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "fiscalId" TEXT,
    "country" CHAR(2) NOT NULL DEFAULT 'TN',
    "defaultCurrency" CHAR(3) NOT NULL DEFAULT 'TND',
    "defaultLanguage" VARCHAR(8) NOT NULL DEFAULT 'ar',
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Tunis',
    "logoFileId" UUID,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'active',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "kmsKeyId" TEXT,
    "kmsKeyVersion" INTEGER NOT NULL DEFAULT 1,
    "searchPepperHash" BYTEA,
    "publicPageEnabled" BOOLEAN NOT NULL DEFAULT true,
    "publicPageConfig" JSONB NOT NULL DEFAULT '{}',
    "dedupParticipating" BOOLEAN NOT NULL DEFAULT false,
    "defaultBillSeries" TEXT NOT NULL DEFAULT 'RECEIPT',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "department" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "parentDepartmentId" UUID,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "kind" "UserKind" NOT NULL DEFAULT 'staff',
    "email" CITEXT NOT NULL,
    "emailVerifiedAt" TIMESTAMPTZ,
    "phone" TEXT,
    "phoneVerifiedAt" TIMESTAMPTZ,
    "fullName" TEXT NOT NULL,
    "passwordHash" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'invited',
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMPTZ,
    "lastLoginAt" TIMESTAMPTZ,
    "lastLoginIp" INET,
    "lastPasswordChangeAt" TIMESTAMPTZ,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "locale" VARCHAR(8) NOT NULL DEFAULT 'ar',
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Tunis',
    "pseudo" TEXT,
    "acceptsTaxReceipt" BOOLEAN NOT NULL DEFAULT false,
    "revealToPp" BOOLEAN NOT NULL DEFAULT false,
    "donorVisibility" "DonorVisibility" NOT NULL DEFAULT 'when_paid_out',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_invite" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "email" CITEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "invitedById" UUID NOT NULL,
    "invitedUserId" UUID,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "acceptedAt" TIMESTAMPTZ,
    "revokedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_invite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_two_factor" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "method" "TwoFactorMethod" NOT NULL,
    "secretEnc" BYTEA NOT NULL,
    "recoveryCodesEnc" BYTEA,
    "confirmedAt" TIMESTAMPTZ,
    "lastUsedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "user_two_factor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_session" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "ip" INET,
    "userAgent" TEXT,
    "device" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "revokedAt" TIMESTAMPTZ,
    "revokedReason" TEXT,

    CONSTRAINT "user_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "privilegeLevel" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "isDangerous" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permission" (
    "roleId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,

    CONSTRAINT "role_permission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "user_department_role" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "departmentId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "ppVisibilityScope" "BeneficiaryVisibilityScope" NOT NULL DEFAULT 'department',
    "validFrom" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" TIMESTAMPTZ,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "user_department_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beneficiary_counter" (
    "organizationId" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "lastValue" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "beneficiary_counter_pkey" PRIMARY KEY ("organizationId","year")
);

-- CreateTable
CREATE TABLE "beneficiary" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "firstNameEnc" BYTEA NOT NULL,
    "lastNameEnc" BYTEA NOT NULL,
    "fullNameHash" BYTEA NOT NULL,
    "gender" "Gender" NOT NULL,
    "dateOfBirth" DATE,
    "maritalStatus" "MaritalStatus" NOT NULL DEFAULT 'single',
    "cinEnc" BYTEA,
    "cinHash" BYTEA,
    "phoneEnc" BYTEA,
    "phoneHash" BYTEA,
    "addressEnc" BYTEA,
    "region" TEXT,
    "city" TEXT,
    "photoConsent" BOOLEAN NOT NULL DEFAULT false,
    "publicAlias" TEXT,
    "status" "BeneficiaryStatus" NOT NULL DEFAULT 'draft',
    "primaryDepartmentId" UUID,
    "lastVerifiedAt" TIMESTAMPTZ,
    "validUntil" DATE,
    "notesEnc" BYTEA,
    "hasCnss" BOOLEAN NOT NULL DEFAULT false,
    "hasCnam" BOOLEAN NOT NULL DEFAULT false,
    "hasYellowNotebook" BOOLEAN NOT NULL DEFAULT false,
    "hasWhiteNotebook" BOOLEAN NOT NULL DEFAULT false,
    "hasMonthlyGrant" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "beneficiary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spouse" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "beneficiaryId" UUID NOT NULL,
    "firstNameEnc" BYTEA NOT NULL,
    "lastNameEnc" BYTEA NOT NULL,
    "fullNameHash" BYTEA NOT NULL,
    "gender" "Gender" NOT NULL,
    "dateOfBirth" DATE,
    "cinEnc" BYTEA NOT NULL,
    "cinHash" BYTEA NOT NULL,
    "phoneEnc" BYTEA,
    "hasJob" BOOLEAN NOT NULL DEFAULT false,
    "notesEnc" BYTEA,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "spouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "child" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "beneficiaryId" UUID NOT NULL,
    "firstNameEnc" BYTEA NOT NULL,
    "lastNameEnc" BYTEA NOT NULL,
    "fullNameHash" BYTEA NOT NULL,
    "gender" "Gender" NOT NULL,
    "dateOfBirth" DATE NOT NULL,
    "inSchool" BOOLEAN NOT NULL DEFAULT false,
    "schoolLevel" "SchoolLevel" NOT NULL DEFAULT 'none',
    "schoolLevelUpdatedAt" DATE,
    "schoolName" TEXT,
    "works" BOOLEAN NOT NULL DEFAULT false,
    "jobDescriptionEnc" BYTEA,
    "hasDisability" BOOLEAN NOT NULL DEFAULT false,
    "disabilityNotesEnc" BYTEA,
    "notesEnc" BYTEA,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "child_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "subjectType" "JobSubjectType" NOT NULL,
    "beneficiaryId" UUID,
    "spouseId" UUID,
    "titleEnc" BYTEA NOT NULL,
    "employerEnc" BYTEA,
    "placeEnc" BYTEA,
    "schedule" TEXT,
    "salaryMinorEnc" BYTEA,
    "currency" CHAR(3) NOT NULL DEFAULT 'TND',
    "isRegistered" BOOLEAN NOT NULL DEFAULT false,
    "startDate" DATE,
    "endDate" DATE,
    "notesEnc" BYTEA,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "housing" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "beneficiaryId" UUID NOT NULL,
    "tenure" "HousingTenure" NOT NULL,
    "rentMinorEnc" BYTEA,
    "currency" CHAR(3) NOT NULL DEFAULT 'TND',
    "ownerNameEnc" BYTEA,
    "ownerPhoneEnc" BYTEA,
    "condition" "HousingCondition" NOT NULL DEFAULT 'fair',
    "rooms" INTEGER,
    "occupants" INTEGER,
    "hasElectricity" BOOLEAN NOT NULL DEFAULT true,
    "hasRunningWater" BOOLEAN NOT NULL DEFAULT true,
    "addressEnc" BYTEA,
    "notesEnc" BYTEA,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "housing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disease" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "beneficiaryId" UUID NOT NULL,
    "name" TEXT,
    "nameEnc" BYTEA,
    "diagnosisDate" DATE,
    "monthlyCostMinorEnc" BYTEA,
    "currency" CHAR(3) NOT NULL DEFAULT 'TND',
    "status" "DiseaseStatus" NOT NULL DEFAULT 'active',
    "needsMedication" BOOLEAN NOT NULL DEFAULT false,
    "needsMonitoring" BOOLEAN NOT NULL DEFAULT false,
    "notesEnc" BYTEA,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "disease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "serious_illness" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "beneficiaryId" UUID NOT NULL,
    "name" TEXT,
    "nameEnc" BYTEA,
    "diagnosisDate" DATE,
    "totalCostMinorEnc" BYTEA,
    "monthlyCostMinorEnc" BYTEA,
    "currency" CHAR(3) NOT NULL DEFAULT 'TND',
    "treatmentStatus" "TreatmentStatus" NOT NULL DEFAULT 'pending',
    "hospital" TEXT,
    "notesEnc" BYTEA,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "serious_illness_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_coverage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "beneficiaryId" UUID NOT NULL,
    "type" "SocialCoverageType" NOT NULL,
    "identifierEnc" BYTEA,
    "monthlyAmountMinorEnc" BYTEA,
    "currency" CHAR(3) NOT NULL DEFAULT 'TND',
    "validFrom" DATE,
    "validUntil" DATE,
    "notesEnc" BYTEA,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "social_coverage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beneficiary_photo" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "beneficiaryId" UUID NOT NULL,
    "fileId" UUID NOT NULL,
    "watermarkedFileId" UUID,
    "thumbnailFileId" UUID,
    "visibility" "PhotoVisibility" NOT NULL DEFAULT 'internal',
    "consentId" UUID,
    "caption" TEXT,
    "takenAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "beneficiary_photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "beneficiaryId" UUID NOT NULL,
    "departmentId" UUID NOT NULL,
    "state" "CaseState" NOT NULL DEFAULT 'submitted',
    "reason" TEXT,
    "openedById" UUID,
    "reviewedById" UUID,
    "approvedById" UUID,
    "closedAt" TIMESTAMPTZ,
    "rejectedReason" TEXT,
    "validUntil" DATE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_review" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "caseId" UUID NOT NULL,
    "reviewerId" UUID NOT NULL,
    "decision" "ReviewDecision" NOT NULL DEFAULT 'pending',
    "commentEnc" BYTEA,
    "attachmentDocumentIds" UUID[],
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "need_score" (
    "caseId" UUID NOT NULL,
    "score" DECIMAL(5,2) NOT NULL,
    "breakdown" JSONB NOT NULL,
    "algorithmVersion" TEXT NOT NULL,
    "computedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "need_score_pkey" PRIMARY KEY ("caseId")
);

-- CreateTable
CREATE TABLE "consent_version" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "purpose" "ConsentPurpose" NOT NULL,
    "version" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "locale" VARCHAR(8) NOT NULL DEFAULT 'ar',
    "effectiveFrom" TIMESTAMPTZ NOT NULL,
    "effectiveTo" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "beneficiaryId" UUID,
    "donorUserId" UUID,
    "purpose" "ConsentPurpose" NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "consentVersionId" UUID,
    "signedDocumentId" UUID,
    "grantedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMPTZ,
    "revokedReason" TEXT,
    "ipAddress" INET,
    "userAgent" TEXT,
    "notes" TEXT,

    CONSTRAINT "consent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donor" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "displayPseudo" TEXT,
    "acceptsTaxReceipt" BOOLEAN NOT NULL DEFAULT false,
    "fiscalId" TEXT,
    "revealToPp" BOOLEAN NOT NULL DEFAULT false,
    "visibility" "DonorVisibility" NOT NULL DEFAULT 'when_paid_out',
    "totalLifetimeMinor" BIGINT NOT NULL DEFAULT 0,
    "totalLifetimeCcy" CHAR(3) NOT NULL DEFAULT 'TND',
    "preferredChannels" "NotificationChannel"[],
    "notesEnc" BYTEA,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "donor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "donorId" UUID,
    "campaignId" UUID,
    "occasionId" UUID,
    "pledgeId" UUID,
    "recurringId" UUID,
    "kind" "DonationKind" NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'TND',
    "receivedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedById" UUID,
    "inKindItemId" UUID,
    "inKindLotId" UUID,
    "inKindQuantity" DECIMAL(14,3),
    "inKindUnit" TEXT,
    "inKindEstValueMinor" BIGINT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "donorNameSnapshot" TEXT,
    "donorFiscalIdSnapshot" TEXT,
    "notesEnc" BYTEA,
    "cancelledAt" TIMESTAMPTZ,
    "cancelledReason" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "donation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donation_allocation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "donationId" UUID NOT NULL,
    "distributionId" UUID,
    "campaignId" UUID,
    "amountMinor" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'TND',
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "donation_allocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pledge" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "donorId" UUID NOT NULL,
    "campaignId" UUID,
    "amountMinor" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'TND',
    "paidMinor" BIGINT NOT NULL DEFAULT 0,
    "dueDate" DATE NOT NULL,
    "state" "PledgeState" NOT NULL DEFAULT 'open',
    "remindersCount" INTEGER NOT NULL DEFAULT 0,
    "lastReminderAt" TIMESTAMPTZ,
    "responsibleUserId" UUID,
    "notesEnc" BYTEA,
    "cancelledAt" TIMESTAMPTZ,
    "cancelledReason" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "pledge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pledge_reminder" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pledgeId" UUID NOT NULL,
    "channel" "PledgeReminderChannel" NOT NULL,
    "sentAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentById" UUID,
    "donorReached" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "pledge_reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_donation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "donorId" UUID NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'TND',
    "interval" "RecurringInterval" NOT NULL,
    "nextRunAt" TIMESTAMPTZ NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "gatewaySubscriptionId" TEXT,
    "startedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMPTZ,
    "cancelledReason" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "recurring_donation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "donationId" UUID NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "providerRef" TEXT,
    "amountMinor" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'TND',
    "status" "PaymentStatus" NOT NULL DEFAULT 'initiated',
    "idempotencyKey" TEXT NOT NULL,
    "initiatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ,
    "failedReason" TEXT,
    "refundedAmountMinor" BIGINT NOT NULL DEFAULT 0,
    "rawPayloadRedacted" JSONB,
    "cashReceiptNumber" TEXT,
    "cashReceivedById" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_provider_config" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "publicKeyEnc" BYTEA,
    "secretKeyEnc" BYTEA NOT NULL,
    "webhookSecretEnc" BYTEA NOT NULL,
    "apiBaseUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "payment_provider_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_webhook_event" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "paymentId" UUID,
    "organizationId" UUID,
    "provider" "PaymentProvider" NOT NULL,
    "externalEventId" TEXT,
    "signatureValid" BOOLEAN NOT NULL,
    "receivedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payloadRedacted" JSONB NOT NULL,
    "ipAddress" INET,
    "processedAt" TIMESTAMPTZ,
    "processedError" TEXT,

    CONSTRAINT "payment_webhook_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_item" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" "InventoryCategory" NOT NULL,
    "unit" TEXT NOT NULL,
    "trackExpiry" BOOLEAN NOT NULL DEFAULT false,
    "minStock" DECIMAL(14,3),
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "inventory_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_lot" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "itemId" UUID NOT NULL,
    "receivedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresOn" DATE,
    "quantityInitial" DECIMAL(14,3) NOT NULL,
    "quantityRemaining" DECIMAL(14,3) NOT NULL,
    "sourceDonationId" UUID,
    "supplierName" TEXT,
    "supplierInvoiceRef" TEXT,
    "unitCostMinor" BIGINT,
    "currency" CHAR(3) NOT NULL DEFAULT 'TND',
    "storageLocation" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "stock_lot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movement" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lotId" UUID NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "reason" TEXT,
    "distributionLineId" UUID,
    "performedById" UUID,
    "performedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distribution" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "beneficiaryId" UUID NOT NULL,
    "campaignId" UUID,
    "occasionId" UUID,
    "kind" "DistributionKind" NOT NULL,
    "status" "DistributionStatus" NOT NULL DEFAULT 'planned',
    "plannedAt" TIMESTAMPTZ,
    "deliveredAt" TIMESTAMPTZ,
    "deliveredById" UUID,
    "signatureFileId" UUID,
    "notesEnc" BYTEA,
    "cancelledAt" TIMESTAMPTZ,
    "cancelledReason" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "distribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distribution_line" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "distributionId" UUID NOT NULL,
    "lineKind" "DistributionLineKind" NOT NULL,
    "itemId" UUID,
    "lotId" UUID,
    "quantity" DECIMAL(14,3),
    "unit" TEXT,
    "amountMinor" BIGINT,
    "currency" CHAR(3) NOT NULL DEFAULT 'TND',
    "valuationMinor" BIGINT,
    "notes" TEXT,

    CONSTRAINT "distribution_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "occasionId" UUID,
    "startsAt" DATE NOT NULL,
    "endsAt" DATE NOT NULL,
    "targetAmountMinor" BIGINT,
    "collectedAmountMinor" BIGINT NOT NULL DEFAULT 0,
    "distributedAmountMinor" BIGINT NOT NULL DEFAULT 0,
    "currency" CHAR(3) NOT NULL DEFAULT 'TND',
    "state" "CampaignState" NOT NULL DEFAULT 'draft',
    "visibleOnPublicPage" BOOLEAN NOT NULL DEFAULT true,
    "coverFileId" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "occasion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringRule" TEXT,
    "isHijriBased" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "occasion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_category" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "isUtility" BOOLEAN NOT NULL DEFAULT false,
    "parentId" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "expense_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'TND',
    "spentAt" DATE NOT NULL,
    "supplier" TEXT,
    "reference" TEXT,
    "paidById" UUID,
    "documentId" UUID,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bill_template" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "htmlContent" TEXT NOT NULL,
    "cssContent" TEXT,
    "primaryColor" TEXT,
    "logoFileId" UUID,
    "series" TEXT NOT NULL DEFAULT 'RECEIPT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdById" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "bill_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bill_number_counter" (
    "organizationId" UUID NOT NULL,
    "series" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "lastValue" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "bill_number_counter_pkey" PRIMARY KEY ("organizationId","series","year")
);

-- CreateTable
CREATE TABLE "bill" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "templateId" UUID,
    "number" TEXT NOT NULL,
    "series" TEXT NOT NULL DEFAULT 'RECEIPT',
    "yearIssued" INTEGER NOT NULL,
    "recipientType" "BillRecipientType" NOT NULL,
    "recipientId" UUID,
    "recipientSnapshot" JSONB NOT NULL,
    "issuedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuedById" UUID,
    "totalMinor" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'TND',
    "pdfFileId" UUID,
    "signatureFileId" UUID,
    "status" "BillStatus" NOT NULL DEFAULT 'issued',
    "cancellationReason" TEXT,
    "cancelledAt" TIMESTAMPTZ,
    "linkedDonationId" UUID,
    "linkedDistributionId" UUID,
    "linkedExpenseId" UUID,
    "isTaxReceipt" BOOLEAN NOT NULL DEFAULT false,
    "organizationFiscalIdSnapshot" TEXT,
    "legalMentions" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "bill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bill_line" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "billId" UUID NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "label" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unitPriceMinor" BIGINT NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "taxRate" DECIMAL(5,2),
    "taxAmountMinor" BIGINT,

    CONSTRAINT "bill_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entry" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "postedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "referenceType" "LedgerReferenceType" NOT NULL,
    "referenceId" UUID NOT NULL,
    "debitAccount" TEXT NOT NULL,
    "creditAccount" TEXT NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'TND',

    CONSTRAINT "ledger_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stored_file" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "bucket" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "sha256" BYTEA NOT NULL,
    "uploadedById" UUID,
    "virusScanStatus" "VirusScanStatus" NOT NULL DEFAULT 'pending',
    "virusScanResult" TEXT,
    "virusScannedAt" TIMESTAMPTZ,
    "isEncrypted" BOOLEAN NOT NULL DEFAULT true,
    "kmsKeyId" TEXT,
    "iv" BYTEA,
    "tag" BYTEA,
    "width" INTEGER,
    "height" INTEGER,
    "hasExif" BOOLEAN NOT NULL DEFAULT false,
    "isWatermarked" BOOLEAN NOT NULL DEFAULT false,
    "isThumbnail" BOOLEAN NOT NULL DEFAULT false,
    "parentFileId" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "stored_file_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "ownerType" "DocumentOwnerType" NOT NULL,
    "ownerId" UUID NOT NULL,
    "category" "DocumentCategory" NOT NULL,
    "fileId" UUID NOT NULL,
    "issuedOn" DATE,
    "expiresOn" DATE,
    "verifiedById" UUID,
    "verifiedAt" TIMESTAMPTZ,
    "notesEnc" BYTEA,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID,
    "actorUserId" UUID,
    "actorIp" INET,
    "actorUserAgent" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" UUID,
    "outcome" "AuditOutcome" NOT NULL DEFAULT 'allow',
    "reason" TEXT,
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB,
    "at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prevHash" BYTEA,
    "thisHash" BYTEA,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "topic" "NotificationTopic" NOT NULL,
    "subject" TEXT,
    "payload" JSONB NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'pending',
    "scheduledAt" TIMESTAMPTZ,
    "sentAt" TIMESTAMPTZ,
    "readAt" TIMESTAMPTZ,
    "failedReason" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "externalRef" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volunteer_shift" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "departmentId" UUID,
    "startsAt" TIMESTAMPTZ NOT NULL,
    "endsAt" TIMESTAMPTZ NOT NULL,
    "location" TEXT,
    "state" "VolunteerShiftState" NOT NULL DEFAULT 'scheduled',
    "scopeOverride" JSONB,
    "checkInAt" TIMESTAMPTZ,
    "checkOutAt" TIMESTAMPTZ,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "volunteer_shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cross_org_dedup_record" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "beneficiaryId" UUID NOT NULL,
    "cinHash" BYTEA NOT NULL,
    "monthlyAidMinor" BIGINT NOT NULL DEFAULT 0,
    "currency" CHAR(3) NOT NULL DEFAULT 'TND',
    "aidActive" BOOLEAN NOT NULL DEFAULT false,
    "consentId" UUID NOT NULL,
    "consentShareAmountId" UUID,
    "validUntil" DATE,
    "lastSyncedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "cross_org_dedup_record_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organization_slug_key" ON "organization"("slug");

-- CreateIndex
CREATE INDEX "organization_slug_idx" ON "organization"("slug");

-- CreateIndex
CREATE INDEX "organization_status_idx" ON "organization"("status");

-- CreateIndex
CREATE INDEX "department_organizationId_idx" ON "department"("organizationId");

-- CreateIndex
CREATE INDEX "department_organizationId_isMain_idx" ON "department"("organizationId", "isMain");

-- CreateIndex
CREATE UNIQUE INDEX "department_organizationId_name_key" ON "department"("organizationId", "name");

-- CreateIndex
CREATE INDEX "user_organizationId_idx" ON "user"("organizationId");

-- CreateIndex
CREATE INDEX "user_organizationId_kind_idx" ON "user"("organizationId", "kind");

-- CreateIndex
CREATE INDEX "user_organizationId_status_idx" ON "user"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "user_organizationId_email_key" ON "user"("organizationId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "user_invite_invitedUserId_key" ON "user_invite"("invitedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "user_invite_tokenHash_key" ON "user_invite"("tokenHash");

-- CreateIndex
CREATE INDEX "user_invite_organizationId_idx" ON "user_invite"("organizationId");

-- CreateIndex
CREATE INDEX "user_invite_email_idx" ON "user_invite"("email");

-- CreateIndex
CREATE INDEX "user_two_factor_userId_idx" ON "user_two_factor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_two_factor_userId_method_key" ON "user_two_factor"("userId", "method");

-- CreateIndex
CREATE UNIQUE INDEX "user_session_refreshTokenHash_key" ON "user_session"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "user_session_userId_idx" ON "user_session"("userId");

-- CreateIndex
CREATE INDEX "user_session_expiresAt_idx" ON "user_session"("expiresAt");

-- CreateIndex
CREATE INDEX "role_organizationId_idx" ON "role"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "role_organizationId_name_key" ON "role"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "permission_code_key" ON "permission"("code");

-- CreateIndex
CREATE INDEX "permission_resource_idx" ON "permission"("resource");

-- CreateIndex
CREATE INDEX "role_permission_permissionId_idx" ON "role_permission"("permissionId");

-- CreateIndex
CREATE INDEX "user_department_role_userId_idx" ON "user_department_role"("userId");

-- CreateIndex
CREATE INDEX "user_department_role_departmentId_idx" ON "user_department_role"("departmentId");

-- CreateIndex
CREATE INDEX "user_department_role_roleId_idx" ON "user_department_role"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "user_department_role_userId_departmentId_roleId_key" ON "user_department_role"("userId", "departmentId", "roleId");

-- CreateIndex
CREATE INDEX "beneficiary_organizationId_idx" ON "beneficiary"("organizationId");

-- CreateIndex
CREATE INDEX "beneficiary_organizationId_status_idx" ON "beneficiary"("organizationId", "status");

-- CreateIndex
CREATE INDEX "beneficiary_organizationId_fullNameHash_idx" ON "beneficiary"("organizationId", "fullNameHash");

-- CreateIndex
CREATE INDEX "beneficiary_organizationId_region_idx" ON "beneficiary"("organizationId", "region");

-- CreateIndex
CREATE UNIQUE INDEX "beneficiary_organizationId_code_key" ON "beneficiary"("organizationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "beneficiary_organizationId_cinHash_key" ON "beneficiary"("organizationId", "cinHash");

-- CreateIndex
CREATE UNIQUE INDEX "spouse_beneficiaryId_key" ON "spouse"("beneficiaryId");

-- CreateIndex
CREATE INDEX "spouse_cinHash_idx" ON "spouse"("cinHash");

-- CreateIndex
CREATE INDEX "child_beneficiaryId_idx" ON "child"("beneficiaryId");

-- CreateIndex
CREATE INDEX "job_beneficiaryId_idx" ON "job"("beneficiaryId");

-- CreateIndex
CREATE INDEX "job_spouseId_idx" ON "job"("spouseId");

-- CreateIndex
CREATE INDEX "job_subjectType_idx" ON "job"("subjectType");

-- CreateIndex
CREATE INDEX "housing_beneficiaryId_idx" ON "housing"("beneficiaryId");

-- CreateIndex
CREATE INDEX "disease_beneficiaryId_idx" ON "disease"("beneficiaryId");

-- CreateIndex
CREATE INDEX "serious_illness_beneficiaryId_idx" ON "serious_illness"("beneficiaryId");

-- CreateIndex
CREATE INDEX "social_coverage_beneficiaryId_idx" ON "social_coverage"("beneficiaryId");

-- CreateIndex
CREATE INDEX "social_coverage_beneficiaryId_type_idx" ON "social_coverage"("beneficiaryId", "type");

-- CreateIndex
CREATE INDEX "beneficiary_photo_beneficiaryId_idx" ON "beneficiary_photo"("beneficiaryId");

-- CreateIndex
CREATE INDEX "beneficiary_photo_visibility_idx" ON "beneficiary_photo"("visibility");

-- CreateIndex
CREATE INDEX "case_organizationId_idx" ON "case"("organizationId");

-- CreateIndex
CREATE INDEX "case_beneficiaryId_idx" ON "case"("beneficiaryId");

-- CreateIndex
CREATE INDEX "case_departmentId_idx" ON "case"("departmentId");

-- CreateIndex
CREATE INDEX "case_organizationId_state_idx" ON "case"("organizationId", "state");

-- CreateIndex
CREATE INDEX "case_validUntil_idx" ON "case"("validUntil");

-- CreateIndex
CREATE INDEX "case_review_caseId_idx" ON "case_review"("caseId");

-- CreateIndex
CREATE INDEX "case_review_reviewerId_idx" ON "case_review"("reviewerId");

-- CreateIndex
CREATE INDEX "need_score_score_idx" ON "need_score"("score");

-- CreateIndex
CREATE INDEX "consent_version_organizationId_purpose_idx" ON "consent_version"("organizationId", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "consent_version_organizationId_purpose_version_locale_key" ON "consent_version"("organizationId", "purpose", "version", "locale");

-- CreateIndex
CREATE INDEX "consent_organizationId_idx" ON "consent"("organizationId");

-- CreateIndex
CREATE INDEX "consent_beneficiaryId_idx" ON "consent"("beneficiaryId");

-- CreateIndex
CREATE INDEX "consent_beneficiaryId_purpose_idx" ON "consent"("beneficiaryId", "purpose");

-- CreateIndex
CREATE INDEX "donor_organizationId_idx" ON "donor"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "donor_organizationId_displayPseudo_key" ON "donor"("organizationId", "displayPseudo");

-- CreateIndex
CREATE INDEX "donation_organizationId_idx" ON "donation"("organizationId");

-- CreateIndex
CREATE INDEX "donation_organizationId_receivedAt_idx" ON "donation"("organizationId", "receivedAt");

-- CreateIndex
CREATE INDEX "donation_donorId_idx" ON "donation"("donorId");

-- CreateIndex
CREATE INDEX "donation_campaignId_idx" ON "donation"("campaignId");

-- CreateIndex
CREATE INDEX "donation_occasionId_idx" ON "donation"("occasionId");

-- CreateIndex
CREATE INDEX "donation_pledgeId_idx" ON "donation"("pledgeId");

-- CreateIndex
CREATE INDEX "donation_kind_idx" ON "donation"("kind");

-- CreateIndex
CREATE INDEX "donation_allocation_donationId_idx" ON "donation_allocation"("donationId");

-- CreateIndex
CREATE INDEX "donation_allocation_distributionId_idx" ON "donation_allocation"("distributionId");

-- CreateIndex
CREATE INDEX "donation_allocation_campaignId_idx" ON "donation_allocation"("campaignId");

-- CreateIndex
CREATE INDEX "pledge_organizationId_idx" ON "pledge"("organizationId");

-- CreateIndex
CREATE INDEX "pledge_donorId_idx" ON "pledge"("donorId");

-- CreateIndex
CREATE INDEX "pledge_state_idx" ON "pledge"("state");

-- CreateIndex
CREATE INDEX "pledge_dueDate_idx" ON "pledge"("dueDate");

-- CreateIndex
CREATE INDEX "pledge_reminder_pledgeId_idx" ON "pledge_reminder"("pledgeId");

-- CreateIndex
CREATE INDEX "recurring_donation_organizationId_idx" ON "recurring_donation"("organizationId");

-- CreateIndex
CREATE INDEX "recurring_donation_donorId_idx" ON "recurring_donation"("donorId");

-- CreateIndex
CREATE INDEX "recurring_donation_nextRunAt_idx" ON "recurring_donation"("nextRunAt");

-- CreateIndex
CREATE UNIQUE INDEX "payment_idempotencyKey_key" ON "payment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "payment_donationId_idx" ON "payment"("donationId");

-- CreateIndex
CREATE INDEX "payment_provider_idx" ON "payment"("provider");

-- CreateIndex
CREATE INDEX "payment_status_idx" ON "payment"("status");

-- CreateIndex
CREATE INDEX "payment_providerRef_idx" ON "payment"("providerRef");

-- CreateIndex
CREATE INDEX "payment_provider_config_organizationId_idx" ON "payment_provider_config"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_provider_config_organizationId_provider_key" ON "payment_provider_config"("organizationId", "provider");

-- CreateIndex
CREATE INDEX "payment_webhook_event_paymentId_idx" ON "payment_webhook_event"("paymentId");

-- CreateIndex
CREATE INDEX "payment_webhook_event_provider_externalEventId_idx" ON "payment_webhook_event"("provider", "externalEventId");

-- CreateIndex
CREATE INDEX "payment_webhook_event_receivedAt_idx" ON "payment_webhook_event"("receivedAt");

-- CreateIndex
CREATE INDEX "inventory_item_organizationId_idx" ON "inventory_item"("organizationId");

-- CreateIndex
CREATE INDEX "inventory_item_organizationId_category_idx" ON "inventory_item"("organizationId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_item_organizationId_name_key" ON "inventory_item"("organizationId", "name");

-- CreateIndex
CREATE INDEX "stock_lot_itemId_idx" ON "stock_lot"("itemId");

-- CreateIndex
CREATE INDEX "stock_lot_expiresOn_idx" ON "stock_lot"("expiresOn");

-- CreateIndex
CREATE UNIQUE INDEX "stock_movement_distributionLineId_key" ON "stock_movement"("distributionLineId");

-- CreateIndex
CREATE INDEX "stock_movement_lotId_idx" ON "stock_movement"("lotId");

-- CreateIndex
CREATE INDEX "stock_movement_performedAt_idx" ON "stock_movement"("performedAt");

-- CreateIndex
CREATE INDEX "distribution_organizationId_idx" ON "distribution"("organizationId");

-- CreateIndex
CREATE INDEX "distribution_beneficiaryId_idx" ON "distribution"("beneficiaryId");

-- CreateIndex
CREATE INDEX "distribution_campaignId_idx" ON "distribution"("campaignId");

-- CreateIndex
CREATE INDEX "distribution_occasionId_idx" ON "distribution"("occasionId");

-- CreateIndex
CREATE INDEX "distribution_status_idx" ON "distribution"("status");

-- CreateIndex
CREATE INDEX "distribution_deliveredAt_idx" ON "distribution"("deliveredAt");

-- CreateIndex
CREATE INDEX "distribution_line_distributionId_idx" ON "distribution_line"("distributionId");

-- CreateIndex
CREATE INDEX "distribution_line_itemId_idx" ON "distribution_line"("itemId");

-- CreateIndex
CREATE INDEX "distribution_line_lotId_idx" ON "distribution_line"("lotId");

-- CreateIndex
CREATE INDEX "campaign_organizationId_idx" ON "campaign"("organizationId");

-- CreateIndex
CREATE INDEX "campaign_state_idx" ON "campaign"("state");

-- CreateIndex
CREATE INDEX "campaign_startsAt_endsAt_idx" ON "campaign"("startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_organizationId_name_key" ON "campaign"("organizationId", "name");

-- CreateIndex
CREATE INDEX "occasion_organizationId_idx" ON "occasion"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "occasion_organizationId_name_periodStart_key" ON "occasion"("organizationId", "name", "periodStart");

-- CreateIndex
CREATE INDEX "expense_category_organizationId_idx" ON "expense_category"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "expense_category_organizationId_name_key" ON "expense_category"("organizationId", "name");

-- CreateIndex
CREATE INDEX "expense_organizationId_idx" ON "expense"("organizationId");

-- CreateIndex
CREATE INDEX "expense_organizationId_spentAt_idx" ON "expense"("organizationId", "spentAt");

-- CreateIndex
CREATE INDEX "expense_categoryId_idx" ON "expense"("categoryId");

-- CreateIndex
CREATE INDEX "bill_template_organizationId_idx" ON "bill_template"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "bill_template_organizationId_name_version_key" ON "bill_template"("organizationId", "name", "version");

-- CreateIndex
CREATE INDEX "bill_organizationId_idx" ON "bill"("organizationId");

-- CreateIndex
CREATE INDEX "bill_organizationId_issuedAt_idx" ON "bill"("organizationId", "issuedAt");

-- CreateIndex
CREATE INDEX "bill_recipientType_recipientId_idx" ON "bill"("recipientType", "recipientId");

-- CreateIndex
CREATE INDEX "bill_linkedDonationId_idx" ON "bill"("linkedDonationId");

-- CreateIndex
CREATE INDEX "bill_linkedDistributionId_idx" ON "bill"("linkedDistributionId");

-- CreateIndex
CREATE INDEX "bill_linkedExpenseId_idx" ON "bill"("linkedExpenseId");

-- CreateIndex
CREATE UNIQUE INDEX "bill_organizationId_series_number_key" ON "bill"("organizationId", "series", "number");

-- CreateIndex
CREATE INDEX "bill_line_billId_idx" ON "bill_line"("billId");

-- CreateIndex
CREATE INDEX "ledger_entry_organizationId_idx" ON "ledger_entry"("organizationId");

-- CreateIndex
CREATE INDEX "ledger_entry_organizationId_postedAt_idx" ON "ledger_entry"("organizationId", "postedAt");

-- CreateIndex
CREATE INDEX "ledger_entry_referenceType_referenceId_idx" ON "ledger_entry"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "stored_file_organizationId_idx" ON "stored_file"("organizationId");

-- CreateIndex
CREATE INDEX "stored_file_virusScanStatus_idx" ON "stored_file"("virusScanStatus");

-- CreateIndex
CREATE UNIQUE INDEX "stored_file_bucket_key_key" ON "stored_file"("bucket", "key");

-- CreateIndex
CREATE INDEX "document_organizationId_idx" ON "document"("organizationId");

-- CreateIndex
CREATE INDEX "document_ownerType_ownerId_idx" ON "document"("ownerType", "ownerId");

-- CreateIndex
CREATE INDEX "document_organizationId_category_idx" ON "document"("organizationId", "category");

-- CreateIndex
CREATE INDEX "document_expiresOn_idx" ON "document"("expiresOn");

-- CreateIndex
CREATE INDEX "audit_log_organizationId_idx" ON "audit_log"("organizationId");

-- CreateIndex
CREATE INDEX "audit_log_organizationId_at_idx" ON "audit_log"("organizationId", "at");

-- CreateIndex
CREATE INDEX "audit_log_actorUserId_idx" ON "audit_log"("actorUserId");

-- CreateIndex
CREATE INDEX "audit_log_action_idx" ON "audit_log"("action");

-- CreateIndex
CREATE INDEX "audit_log_resourceType_resourceId_idx" ON "audit_log"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "notification_organizationId_idx" ON "notification"("organizationId");

-- CreateIndex
CREATE INDEX "notification_userId_idx" ON "notification"("userId");

-- CreateIndex
CREATE INDEX "notification_userId_status_idx" ON "notification"("userId", "status");

-- CreateIndex
CREATE INDEX "notification_topic_idx" ON "notification"("topic");

-- CreateIndex
CREATE INDEX "notification_scheduledAt_idx" ON "notification"("scheduledAt");

-- CreateIndex
CREATE INDEX "volunteer_shift_organizationId_idx" ON "volunteer_shift"("organizationId");

-- CreateIndex
CREATE INDEX "volunteer_shift_userId_idx" ON "volunteer_shift"("userId");

-- CreateIndex
CREATE INDEX "volunteer_shift_state_idx" ON "volunteer_shift"("state");

-- CreateIndex
CREATE INDEX "volunteer_shift_startsAt_endsAt_idx" ON "volunteer_shift"("startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "cross_org_dedup_record_cinHash_idx" ON "cross_org_dedup_record"("cinHash");

-- CreateIndex
CREATE INDEX "cross_org_dedup_record_organizationId_idx" ON "cross_org_dedup_record"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "cross_org_dedup_record_organizationId_beneficiaryId_key" ON "cross_org_dedup_record"("organizationId", "beneficiaryId");

-- AddForeignKey
ALTER TABLE "department" ADD CONSTRAINT "department_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department" ADD CONSTRAINT "department_parentDepartmentId_fkey" FOREIGN KEY ("parentDepartmentId") REFERENCES "department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_invite" ADD CONSTRAINT "user_invite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_invite" ADD CONSTRAINT "user_invite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_invite" ADD CONSTRAINT "user_invite_invitedUserId_fkey" FOREIGN KEY ("invitedUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_two_factor" ADD CONSTRAINT "user_two_factor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_session" ADD CONSTRAINT "user_session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role" ADD CONSTRAINT "role_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_department_role" ADD CONSTRAINT "user_department_role_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_department_role" ADD CONSTRAINT "user_department_role_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_department_role" ADD CONSTRAINT "user_department_role_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficiary_counter" ADD CONSTRAINT "beneficiary_counter_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficiary" ADD CONSTRAINT "beneficiary_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spouse" ADD CONSTRAINT "spouse_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "beneficiary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child" ADD CONSTRAINT "child_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "beneficiary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job" ADD CONSTRAINT "job_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "beneficiary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job" ADD CONSTRAINT "job_spouseId_fkey" FOREIGN KEY ("spouseId") REFERENCES "spouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "housing" ADD CONSTRAINT "housing_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "beneficiary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disease" ADD CONSTRAINT "disease_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "beneficiary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serious_illness" ADD CONSTRAINT "serious_illness_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "beneficiary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_coverage" ADD CONSTRAINT "social_coverage_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "beneficiary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficiary_photo" ADD CONSTRAINT "beneficiary_photo_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "beneficiary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficiary_photo" ADD CONSTRAINT "beneficiary_photo_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "stored_file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficiary_photo" ADD CONSTRAINT "beneficiary_photo_watermarkedFileId_fkey" FOREIGN KEY ("watermarkedFileId") REFERENCES "stored_file"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficiary_photo" ADD CONSTRAINT "beneficiary_photo_thumbnailFileId_fkey" FOREIGN KEY ("thumbnailFileId") REFERENCES "stored_file"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficiary_photo" ADD CONSTRAINT "beneficiary_photo_consentId_fkey" FOREIGN KEY ("consentId") REFERENCES "consent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case" ADD CONSTRAINT "case_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "beneficiary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case" ADD CONSTRAINT "case_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_review" ADD CONSTRAINT "case_review_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "need_score" ADD CONSTRAINT "need_score_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_version" ADD CONSTRAINT "consent_version_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent" ADD CONSTRAINT "consent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent" ADD CONSTRAINT "consent_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "beneficiary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent" ADD CONSTRAINT "consent_consentVersionId_fkey" FOREIGN KEY ("consentVersionId") REFERENCES "consent_version"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent" ADD CONSTRAINT "consent_signedDocumentId_fkey" FOREIGN KEY ("signedDocumentId") REFERENCES "document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donor" ADD CONSTRAINT "donor_id_fkey" FOREIGN KEY ("id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donor" ADD CONSTRAINT "donor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation" ADD CONSTRAINT "donation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation" ADD CONSTRAINT "donation_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "donor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation" ADD CONSTRAINT "donation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation" ADD CONSTRAINT "donation_occasionId_fkey" FOREIGN KEY ("occasionId") REFERENCES "occasion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation" ADD CONSTRAINT "donation_pledgeId_fkey" FOREIGN KEY ("pledgeId") REFERENCES "pledge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation" ADD CONSTRAINT "donation_recurringId_fkey" FOREIGN KEY ("recurringId") REFERENCES "recurring_donation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation" ADD CONSTRAINT "donation_inKindItemId_fkey" FOREIGN KEY ("inKindItemId") REFERENCES "inventory_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation" ADD CONSTRAINT "donation_inKindLotId_fkey" FOREIGN KEY ("inKindLotId") REFERENCES "stock_lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation_allocation" ADD CONSTRAINT "donation_allocation_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "donation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation_allocation" ADD CONSTRAINT "donation_allocation_distributionId_fkey" FOREIGN KEY ("distributionId") REFERENCES "distribution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation_allocation" ADD CONSTRAINT "donation_allocation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pledge" ADD CONSTRAINT "pledge_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pledge" ADD CONSTRAINT "pledge_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "donor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pledge" ADD CONSTRAINT "pledge_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pledge_reminder" ADD CONSTRAINT "pledge_reminder_pledgeId_fkey" FOREIGN KEY ("pledgeId") REFERENCES "pledge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_donation" ADD CONSTRAINT "recurring_donation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_donation" ADD CONSTRAINT "recurring_donation_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "donor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "donation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_provider_config" ADD CONSTRAINT "payment_provider_config_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_webhook_event" ADD CONSTRAINT "payment_webhook_event_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_item" ADD CONSTRAINT "inventory_item_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_lot" ADD CONSTRAINT "stock_lot_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "stock_lot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_distributionLineId_fkey" FOREIGN KEY ("distributionLineId") REFERENCES "distribution_line"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution" ADD CONSTRAINT "distribution_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution" ADD CONSTRAINT "distribution_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "beneficiary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution" ADD CONSTRAINT "distribution_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution" ADD CONSTRAINT "distribution_occasionId_fkey" FOREIGN KEY ("occasionId") REFERENCES "occasion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution" ADD CONSTRAINT "distribution_signatureFileId_fkey" FOREIGN KEY ("signatureFileId") REFERENCES "stored_file"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_line" ADD CONSTRAINT "distribution_line_distributionId_fkey" FOREIGN KEY ("distributionId") REFERENCES "distribution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_line" ADD CONSTRAINT "distribution_line_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_line" ADD CONSTRAINT "distribution_line_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "stock_lot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign" ADD CONSTRAINT "campaign_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign" ADD CONSTRAINT "campaign_occasionId_fkey" FOREIGN KEY ("occasionId") REFERENCES "occasion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "occasion" ADD CONSTRAINT "occasion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_category" ADD CONSTRAINT "expense_category_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_category" ADD CONSTRAINT "expense_category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "expense_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "expense_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_template" ADD CONSTRAINT "bill_template_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_number_counter" ADD CONSTRAINT "bill_number_counter_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill" ADD CONSTRAINT "bill_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill" ADD CONSTRAINT "bill_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "bill_template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill" ADD CONSTRAINT "bill_pdfFileId_fkey" FOREIGN KEY ("pdfFileId") REFERENCES "stored_file"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill" ADD CONSTRAINT "bill_signatureFileId_fkey" FOREIGN KEY ("signatureFileId") REFERENCES "stored_file"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill" ADD CONSTRAINT "bill_linkedDonationId_fkey" FOREIGN KEY ("linkedDonationId") REFERENCES "donation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill" ADD CONSTRAINT "bill_linkedDistributionId_fkey" FOREIGN KEY ("linkedDistributionId") REFERENCES "distribution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill" ADD CONSTRAINT "bill_linkedExpenseId_fkey" FOREIGN KEY ("linkedExpenseId") REFERENCES "expense"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_line" ADD CONSTRAINT "bill_line_billId_fkey" FOREIGN KEY ("billId") REFERENCES "bill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stored_file" ADD CONSTRAINT "stored_file_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stored_file" ADD CONSTRAINT "stored_file_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stored_file" ADD CONSTRAINT "stored_file_parentFileId_fkey" FOREIGN KEY ("parentFileId") REFERENCES "stored_file"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "stored_file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_shift" ADD CONSTRAINT "volunteer_shift_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_shift" ADD CONSTRAINT "volunteer_shift_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_shift" ADD CONSTRAINT "volunteer_shift_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cross_org_dedup_record" ADD CONSTRAINT "cross_org_dedup_record_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "beneficiary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
