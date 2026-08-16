/**
 * Centralized Google AdSense Configuration for PDFBolt.
 * Production-ready, zero hardcoding of publisher IDs.
 */

export interface AdPlacementConfig {
  name: string;
  defaultSlotId: string;
  format: 'auto' | 'fluid' | 'rectangle' | 'horizontal' | 'vertical';
  responsive: boolean;
  minHeightDesktop: string;
  minHeightMobile: string;
  label?: string;
}

// Global Environment Configuration
export const getAdSenseClient = (): string => {
  return (import.meta.env.VITE_ADSENSE_CLIENT || '').trim();
};

export const isAdsEnabled = (): boolean => {
  const envVal = (import.meta.env.VITE_ADS_ENABLED || '').toString().toLowerCase().trim();
  const client = getAdSenseClient();
  
  // Enabled only if explicitly set to true and a client ID is provided
  if (envVal === 'true' || envVal === '1') {
    return client.length > 0;
  }
  return false;
};

export const isAdTestMode = (): boolean => {
  const testVal = (import.meta.env.VITE_ADSENSE_TEST_MODE || '').toString().toLowerCase().trim();
  return testVal === 'true' || testVal === '1' || import.meta.env.DEV;
};

/**
 * Central Named Ad Placements Registry.
 * Centralizes all ad slots, layout reservations to prevent CLS, and responsive formats.
 */
export const AD_PLACEMENTS = {
  // Homepage placements
  HOME_CONTENT: {
    name: 'Home Content Mid',
    defaultSlotId: import.meta.env.VITE_ADSENSE_SLOT_HOME_CONTENT || '',
    format: 'auto',
    responsive: true,
    minHeightDesktop: '120px',
    minHeightMobile: '100px',
    label: 'Advertisement'
  },
  // Tool page educational content placements (Below tool workspace, between How-To and FAQ)
  TOOL_CONTENT_BOTTOM: {
    name: 'Tool Content Bottom',
    defaultSlotId: import.meta.env.VITE_ADSENSE_SLOT_TOOL_CONTENT || '',
    format: 'auto',
    responsive: true,
    minHeightDesktop: '250px',
    minHeightMobile: '200px',
    label: 'Advertisement'
  },
  // Result screen placement (Well below download button)
  RESULT_BOTTOM: {
    name: 'Result Bottom',
    defaultSlotId: import.meta.env.VITE_ADSENSE_SLOT_RESULT_BOTTOM || '',
    format: 'auto',
    responsive: true,
    minHeightDesktop: '120px',
    minHeightMobile: '100px',
    label: 'Advertisement'
  },
  // Guide / Tutorial in-content placement
  GUIDE_IN_CONTENT: {
    name: 'Guide In-Content',
    defaultSlotId: import.meta.env.VITE_ADSENSE_SLOT_GUIDE_CONTENT || '',
    format: 'auto',
    responsive: true,
    minHeightDesktop: '250px',
    minHeightMobile: '200px',
    label: 'Advertisement'
  },
  // Guide / Tutorial sidebar placement
  GUIDE_SIDEBAR: {
    name: 'Guide Sidebar',
    defaultSlotId: import.meta.env.VITE_ADSENSE_SLOT_GUIDE_SIDEBAR || '',
    format: 'rectangle',
    responsive: true,
    minHeightDesktop: '300px',
    minHeightMobile: '250px',
    label: 'Advertisement'
  },
  // Encyclopedia / Format standard page bottom
  ENCYCLOPEDIA_BOTTOM: {
    name: 'Encyclopedia Bottom',
    defaultSlotId: import.meta.env.VITE_ADSENSE_SLOT_ENCYCLOPEDIA || '',
    format: 'auto',
    responsive: true,
    minHeightDesktop: '200px',
    minHeightMobile: '120px',
    label: 'Advertisement'
  },
  // PDF Size Calculator bottom
  CALCULATOR_BOTTOM: {
    name: 'Calculator Bottom',
    defaultSlotId: import.meta.env.VITE_ADSENSE_SLOT_CALCULATOR || '',
    format: 'auto',
    responsive: true,
    minHeightDesktop: '180px',
    minHeightMobile: '120px',
    label: 'Advertisement'
  },
  // Hub page mid-content
  HUB_CONTENT: {
    name: 'Tools Hub Content',
    defaultSlotId: import.meta.env.VITE_ADSENSE_SLOT_HUB || '',
    format: 'auto',
    responsive: true,
    minHeightDesktop: '140px',
    minHeightMobile: '100px',
    label: 'Advertisement'
  }
} as const satisfies Record<string, AdPlacementConfig>;

export type AdPlacementKey = keyof typeof AD_PLACEMENTS;
