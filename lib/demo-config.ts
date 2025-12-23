/**
 * Demo Configuration
 * 
 * Centralized configuration for demo mode
 * This helps ensure the application is ready for public demos
 */

export const DEMO_CONFIG = {
  // Demo mode enabled
  enabled: process.env.NEXT_PUBLIC_DEMO_MODE === "true" || process.env.NODE_ENV !== "production",
  
  // Demo credentials (for easy login during demos)
  demoCredentials: {
    email: "demo@majlisconnect.com",
    password: "demo123",
    role: "admin" as const,
  },
  
  // Features that should work in demo mode
  features: {
    // Core features
    inbox: true,
    conversations: true,
    automation: true,
    knowledgeBase: true,
    quality: true,
    outbound: true,
    
    // AI features (require API keys)
    langgraph: process.env.USE_LANGGRAPH === "true",
    vapi: process.env.USE_VAPI === "true",
    
    // External integrations (require API keys)
    twilio: !!process.env.TWILIO_ACCOUNT_SID,
    sendgrid: !!process.env.SENDGRID_API_KEY,
  },
  
  // Demo data requirements
  dataRequirements: {
    minConversations: 10,
    minAgents: 3,
    minCustomers: 5,
    minKnowledgeArticles: 20,
  },
  
  // Error handling
  errorHandling: {
    showDetailedErrors: process.env.NODE_ENV === "development",
    logErrors: true,
    fallbackToSampleData: true,
  },
  
  // UI/UX
  ui: {
    showDemoBanner: process.env.NEXT_PUBLIC_DEMO_MODE === "true",
    demoBannerMessage: "Demo Mode - This is a demonstration environment",
  },
} as const

/**
 * Check if a feature is available in demo mode
 */
export function isFeatureEnabled(feature: keyof typeof DEMO_CONFIG.features): boolean {
  return DEMO_CONFIG.features[feature] ?? false
}

/**
 * Get demo status for display
 */
export function getDemoStatus() {
  return {
    enabled: DEMO_CONFIG.enabled,
    features: DEMO_CONFIG.features,
    missingFeatures: Object.entries(DEMO_CONFIG.features)
      .filter(([_, enabled]) => !enabled)
      .map(([feature]) => feature),
  }
}

