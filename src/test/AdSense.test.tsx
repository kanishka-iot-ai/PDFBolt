import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { 
  AD_PLACEMENTS, 
  isAdsEnabled, 
  getAdSenseClient, 
  isAdTestMode 
} from '../config/adsenseConfig';
import AdSlot from '../components/AdSlot';
import CookieConsent from '../components/CookieConsent';

describe('AdSense Configuration & Registry', () => {
  it('defines valid named placements with responsive parameters', () => {
    expect(AD_PLACEMENTS.HOME_CONTENT).toBeDefined();
    expect(AD_PLACEMENTS.TOOL_CONTENT_BOTTOM).toBeDefined();
    expect(AD_PLACEMENTS.RESULT_BOTTOM).toBeDefined();
    expect(AD_PLACEMENTS.GUIDE_IN_CONTENT).toBeDefined();
    expect(AD_PLACEMENTS.ENCYCLOPEDIA_BOTTOM).toBeDefined();

    expect(AD_PLACEMENTS.HOME_CONTENT.responsive).toBe(true);
    expect(AD_PLACEMENTS.RESULT_BOTTOM.minHeightDesktop).toBeDefined();
  });

  it('safely handles missing environment variables in dev', () => {
    const enabled = isAdsEnabled();
    expect(typeof enabled).toBe('boolean');
  });
});

describe('AdSlot Component', () => {
  it('renders development fallback cleanly when ads are disabled in dev mode', () => {
    render(<AdSlot placement="HOME_CONTENT" />);
    const devBadge = screen.getByText(/Development Mode/i);
    expect(devBadge).toBeInTheDocument();
  });

  it('preserves min-height reservation to protect Core Web Vitals (CLS)', () => {
    const { container } = render(
      <AdSlot placement="TOOL_CONTENT_BOTTOM" minHeight="250px" />
    );
    const element = container.firstChild as HTMLElement;
    expect(element).toHaveStyle({ minHeight: '250px' });
  });
});

describe('CookieConsent Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('displays consent banner and allows accepting all cookies', () => {
    render(
      <BrowserRouter>
        <CookieConsent darkMode={false} />
      </BrowserRouter>
    );

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    const acceptBtn = screen.getByRole('button', { name: /Accept All/i });
    expect(acceptBtn).toBeInTheDocument();

    fireEvent.click(acceptBtn);

    const stored = JSON.parse(localStorage.getItem('pdfbolt.cookie_consent') || '{}');
    expect(stored.status).toBe('accepted');
    expect(stored.adPersonalization).toBe(true);
  });

  it('allows essential only choice and sets non-personalized ads request flag', () => {
    render(
      <BrowserRouter>
        <CookieConsent darkMode={true} />
      </BrowserRouter>
    );

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    const essentialBtn = screen.getByRole('button', { name: /Essential Only/i });
    expect(essentialBtn).toBeInTheDocument();

    fireEvent.click(essentialBtn);

    const stored = JSON.parse(localStorage.getItem('pdfbolt.cookie_consent') || '{}');
    expect(stored.status).toBe('essential_only');
    expect(stored.adPersonalization).toBe(false);
    expect((window as any).adsbygoogle.requestNonPersonalizedAds).toBe(1);
  });
});
