import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import FileSizeComparisonBadge from '../components/FileSizeComparisonBadge';
import OutputPreviewModal from '../components/OutputPreviewModal';

describe('FileSizeComparisonBadge Component', () => {
  it('renders exact size preserved badge when original equals output', () => {
    render(
      <FileSizeComparisonBadge
        originalBytes={500000}
        outputBytes={500000}
        darkMode={false}
      />
    );
    expect(screen.getByText(/Exact Size Preserved/i)).toBeInTheDocument();
    expect(screen.getByText(/488.3 KB/i)).toBeInTheDocument();
  });

  it('renders percentage savings badge when output is compressed/smaller', () => {
    render(
      <FileSizeComparisonBadge
        originalBytes={1000000} // ~976 KB
        outputBytes={500000}   // ~488 KB (-50%)
        darkMode={false}
        isCompressed={true}
      />
    );
    expect(screen.getByText(/50% Smaller/i)).toBeInTheDocument();
    expect(screen.getByText(/(Compressed)/i)).toBeInTheDocument();
  });
});

describe('OutputPreviewModal Component', () => {
  beforeEach(() => {
    // Mock global fetch to return an empty arraybuffer
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)),
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders modal dialog with header, filename, and download button when open', async () => {
    const handleClose = vi.fn();

    await act(async () => {
      render(
        <OutputPreviewModal
          isOpen={true}
          onClose={handleClose}
          fileUrl="blob:http://localhost:4173/sample-pdf"
          fileName="converted_report.pdf"
          fileType="pdf"
          downloadUrl="blob:http://localhost:4173/sample-pdf"
          originalSizeBytes={1024000}
          outputSizeBytes={819200}
          darkMode={false}
        />
      );
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('converted_report.pdf')).toBeInTheDocument();
    expect(screen.getByText('20% Smaller')).toBeInTheDocument();

    // Click close button
    const closeBtn = screen.getByLabelText('Close Preview');
    await act(async () => {
      fireEvent.click(closeBtn);
    });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <OutputPreviewModal
        isOpen={false}
        onClose={() => {}}
        fileUrl={null}
        fileName="test.pdf"
        fileType="pdf"
      />
    );
    expect(container.firstChild).toBeNull();
  });
});
