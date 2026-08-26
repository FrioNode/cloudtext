export const ONBOARDING_STEP_ORDER = [
  'verify_email',
  'download_app',
  'api_key',
  'register_device',
  'choose_plan',
  'first_message',
] as const

export type OnboardingStepId = (typeof ONBOARDING_STEP_ORDER)[number]

export const ONBOARDING_OPTIONAL_STEP_IDS: OnboardingStepId[] = [
  'download_app',
  'choose_plan',
]
