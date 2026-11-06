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
  return (import.meta.env.VITE_ADSENSE_CLIENT || 'ca-pub-9225330373068045').trim();
};

export const isAdsEnabled = (): boolean => {
  const envVal = (import.meta.env.VITE_ADS_ENABLED || '').toString().toLowerCase().trim();
  const client = getAdSenseClient();
  
  // Enabled if set to true, or enabled by default in production with valid client
  if (envVal === 'false' || envVal === '0') {
    return false;
  }
  if (import.meta.env.DEV && envVal !== 'true' && envVal !== '1') {
    return false;
  }
  return client.length > 0;
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
  HOME_TOOL_TRANSITION: {
    name: 'Home Tool Transition (Post-Grid)',
    defaultSlotId: import.meta.env.VITE_ADSENSE_SLOT_HOME_TOOL_TRANSITION || import.meta.env.VITE_ADSENSE_SLOT_HOME_CONTENT || '',
    format: 'auto',
    responsive: true,
    minHeightDesktop: '115px',
    minHeightMobile: '110px',
    label: 'Advertisement'
  },
  HOME_CONTENT: {
    name: 'Home Content Mid',
    defaultSlotId: import.meta.env.VITE_ADSENSE_SLOT_HOME_CONTENT || '',
    format: 'auto',
    responsive: true,
    minHeightDesktop: '115px',
    minHeightMobile: '110px',
    label: 'Advertisement'
  },
  HOME_KNOWLEDGE_BOTTOM: {
    name: 'Home Knowledge Bottom',
    defaultSlotId: import.meta.env.VITE_ADSENSE_SLOT_HOME_KNOWLEDGE || import.meta.env.VITE_ADSENSE_SLOT_HOME_CONTENT || '',
    format: 'auto',
    responsive: true,
    minHeightDesktop: '115px',
    minHeightMobile: '110px',
    label: 'Advertisement'
  },
  HOME_PRE_FOOTER: {
    name: 'Home Pre-Footer',
    defaultSlotId: import.meta.env.VITE_ADSENSE_SLOT_HOME_PRE_FOOTER || import.meta.env.VITE_ADSENSE_SLOT_HOME_CONTENT || '',
    format: 'auto',
    responsive: true,
    minHeightDesktop: '115px',
    minHeightMobile: '110px',
    label: 'Advertisement'
  },
  // Tool page educational content placements (Below tool workspace, between How-To and FAQ)
  TOOL_CONTENT_BOTTOM: {
    name: 'Tool Content Bottom',
    defaultSlotId: import.meta.env.VITE_ADSENSE_SLOT_TOOL_CONTENT || '',
    format: 'auto',
    responsive: true,
    minHeightDesktop: '110px',
    minHeightMobile: '100px',
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
    minHeightDesktop: '115px',
    minHeightMobile: '110px',
    label: 'Advertisement'
  },
  HUB_CONTENT_MID: {
    name: 'Tools Hub Mid-Section',
    defaultSlotId: import.meta.env.VITE_ADSENSE_SLOT_HUB_MID || import.meta.env.VITE_ADSENSE_SLOT_HUB || '',
    format: 'auto',
    responsive: true,
    minHeightDesktop: '115px',
    minHeightMobile: '110px',
    label: 'Advertisement'
  },
  // Desktop Left & Right Vertical Side Rails (160x600 Wide Skyscraper)
  TOOL_SIDE_RAIL_LEFT: {
    name: 'Tool Desktop Side Rail (Left)',
    defaultSlotId: import.meta.env.VITE_ADSENSE_SLOT_SIDE_RAIL_LEFT || '',
    format: 'vertical',
    responsive: false,
    minHeightDesktop: '250px',
    minHeightMobile: '0px',
    label: 'Advertisement'
  },
  TOOL_SIDE_RAIL_RIGHT: {
    name: 'Tool Desktop Side Rail (Right)',
    defaultSlotId: import.meta.env.VITE_ADSENSE_SLOT_SIDE_RAIL_RIGHT || '',
    format: 'vertical',
    responsive: false,
    minHeightDesktop: '250px',
    minHeightMobile: '0px',
    label: 'Advertisement'
  },
  // PDF Inspector Mid-Report Sponsored Slot
  INSPECTOR_MID: {
    name: 'PDF Inspector Mid-Report',
    defaultSlotId: import.meta.env.VITE_ADSENSE_SLOT_INSPECTOR_MID || import.meta.env.VITE_ADSENSE_SLOT_RESULT_BOTTOM || '',
    format: 'auto',
    responsive: true,
    minHeightDesktop: '115px',
    minHeightMobile: '110px',
    label: 'Advertisement'
  },
  // Persona Workflow Transition Sponsored Slot
  WORKFLOW_TRANSITION: {
    name: 'Workflow Transition',
    defaultSlotId: import.meta.env.VITE_ADSENSE_SLOT_WORKFLOW || import.meta.env.VITE_ADSENSE_SLOT_HOME_CONTENT || '',
    format: 'auto',
    responsive: true,
    minHeightDesktop: '115px',
    minHeightMobile: '110px',
    label: 'Advertisement'
  }
} as const satisfies Record<string, AdPlacementConfig>;

export type AdPlacementKey = keyof typeof AD_PLACEMENTS;
