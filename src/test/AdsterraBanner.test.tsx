import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import AdsterraBanner from '../components/AdsterraBanner';

describe('AdsterraBanner Component', () => {
  it('renders development placeholder when no keys are configured in dev mode', () => {
    render(<AdsterraBanner format="728x90" />);
    const placeholder = screen.getByText(/Adsterra Placeholder/i);
    expect(placeholder).toBeInTheDocument();
  });

  it('renders an isolated iframe with correct dimensions when a custom key is provided', () => {
    render(<AdsterraBanner format="728x90" customKey="test_key_12345" />);
    const iframe = screen.getByTitle('Advertisement 728x90') as HTMLIFrameElement;
    expect(iframe).toBeInTheDocument();
    expect(iframe.getAttribute('width')).toBe('728');
    expect(iframe.getAttribute('height')).toBe('90');
    expect(iframe.srcdoc).toContain("key' : 'test_key_12345'");
  });

  it('renders native banner format correctly with container ID in iframe', () => {
    render(<AdsterraBanner format="native" customKey="test_native_key_999" />);
    const iframe = screen.getByTitle('Advertisement Native Banner') as HTMLIFrameElement;
    expect(iframe).toBeInTheDocument();
    expect(iframe.srcdoc).toContain('container-test_native_key_999');
    expect(iframe.srcdoc).toContain('test_native_key_999/invoke.js');
  });

  it('renders responsive desktop and mobile containers when keys are provided', () => {
    render(
      <AdsterraBanner
        format="responsive"
        customKey="test_responsive_key"
        showLabel={true}
      />
    );
    expect(screen.getByText('Sponsored')).toBeInTheDocument();
    const iframes = screen.getAllByTitle(/Advertisement/i);
    expect(iframes.length).toBeGreaterThan(0);
  });
});
