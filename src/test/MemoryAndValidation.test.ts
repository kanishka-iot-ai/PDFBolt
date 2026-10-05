import { describe, it, expect, vi } from 'vitest';
import { getDeviceMemoryProfile, validateFileSize, validateFiles, MAX_FILE_SIZE, ALLOWED_MIME_TYPES } from '../utils/fileValidation';
import { apiClient } from '../services/apiClient';

describe('Device Memory Profiling & RAM Advisories', () => {
  it('detects device memory profile without throwing', () => {
    const profile = getDeviceMemoryProfile();
    expect(profile).toHaveProperty('isMobile');
    expect(profile).toHaveProperty('isConstrained');
    expect(profile).toHaveProperty('tier');
    expect(profile.maxRecommendedSingleFileMB).toBeGreaterThan(0);
  });

  it('validates standard sized files with valid: true and no warning', () => {
    // 10MB dummy file
    const file = new File(['%PDF-1.4 dummy content'], 'small.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 10 * 1024 * 1024 });

    const result = validateFileSize(file, MAX_FILE_SIZE.PDF);
    expect(result.valid).toBe(true);
    expect(result.warning).toBeUndefined();
  });

  it('generates massive document advisory warning on files > 150MB', () => {
    const file = new File(['%PDF-1.4 dummy content'], 'large.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 160 * 1024 * 1024 }); // 160MB

    const result = validateFileSize(file, MAX_FILE_SIZE.PDF);
    expect(result.valid).toBe(true);
    expect(result.warning).toBeDefined();
    expect(result.warning).toContain('Massive Document Advisory');
  });

  it('blocks files exceeding 250MB limit with helpful human error', () => {
    const file = new File(['%PDF-1.4 dummy content'], 'too_huge.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 260 * 1024 * 1024 }); // 260MB

    const result = validateFileSize(file, MAX_FILE_SIZE.PDF);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('File is too large');
  });

  it('anticipatory warmupBackend triggers background ping without error', () => {
    expect(() => apiClient.warmupBackend()).not.toThrow();
  });
});
