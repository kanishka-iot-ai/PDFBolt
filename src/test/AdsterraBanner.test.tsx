import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import AdsterraBanner from '../components/AdsterraBanner';

describe('AdsterraBanner Component', () => {
  it('renders production 728x90 banner with active Adsterra key and bauval script', () => {
    render(<AdsterraBanner format="728x90" />);
    const iframe = screen.getByTitle('Advertisement 728x90') as HTMLIFrameElement;
    expect(iframe).toBeInTheDocument();
    expect(iframe.srcdoc).toContain('13354ccc8669e9f00c6b801f09f46212');
    expect(iframe.srcdoc).toContain('https://bauval.org/22/13354ccc8669e9f00c6b801f09f46212');
  });

  it('renders 300x250 banner with active Adsterra mobile key', () => {
    render(<AdsterraBanner format="300x250" />);
    const iframe = screen.getByTitle('Advertisement 300x250') as HTMLIFrameElement;
    expect(iframe).toBeInTheDocument();
    expect(iframe.srcdoc).toContain('b829e60459e206fdcb08b6bd0e342172');
    expect(iframe.srcdoc).toContain('https://bauval.org/22/b829e60459e206fdcb08b6bd0e342172');
  });

  it('renders native banner format correctly with container ID in iframe', () => {
    render(<AdsterraBanner format="native" customKey="test_native_key_999" />);
    const iframe = screen.getByTitle('Advertisement Native Banner') as HTMLIFrameElement;
    expect(iframe).toBeInTheDocument();
    expect(iframe.srcdoc).toContain('container-test_native_key_999');
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
