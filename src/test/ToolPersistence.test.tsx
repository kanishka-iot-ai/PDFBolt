import React, { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ActiveWorkProvider, useActiveWork } from '../context/ActiveWorkContext';
import SEOLandingPage from '../components/SEOLandingPage';

// A mock stateful tool component to simulate file selection
const MockStatefulTool: React.FC = () => {
  const { setHasActiveWork } = useActiveWork();
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const handleSelectFile = () => {
    setSelectedFileName('sample_contract.pdf');
    setHasActiveWork(true);
  };

  const handleReset = () => {
    setSelectedFileName(null);
    setHasActiveWork(false);
  };

  return (
    <div data-testid="mock-tool">
      {selectedFileName ? (
        <div data-testid="workspace">
          <span>Active File: {selectedFileName}</span>
          <button onClick={handleReset}>Clear File</button>
        </div>
      ) : (
        <div data-testid="upload-screen">
          <span>Upload Screen</span>
          <button onClick={handleSelectFile}>Choose PDF</button>
        </div>
      )}
    </div>
  );
};

describe('Tool Component Persistence in SEOLandingPage', () => {
  it('does NOT unmount or reset tool state when file is chosen and hasActiveWork toggles', async () => {
    render(
      <HelmetProvider>
        <MemoryRouter>
          <ActiveWorkProvider>
            <SEOLandingPage toolId="merge" darkMode={false}>
              <MockStatefulTool />
            </SEOLandingPage>
          </ActiveWorkProvider>
        </MemoryRouter>
      </HelmetProvider>
    );

    // Initial state: upload screen is shown
    expect(screen.getByTestId('upload-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('workspace')).not.toBeInTheDocument();

    // Click "Choose PDF" to simulate selecting a file
    await act(async () => {
      fireEvent.click(screen.getByText('Choose PDF'));
    });

    // Workspace MUST be active and file state preserved!
    expect(screen.getByTestId('workspace')).toBeInTheDocument();
    expect(screen.getByText('Active File: sample_contract.pdf')).toBeInTheDocument();
    expect(screen.queryByTestId('upload-screen')).not.toBeInTheDocument();
  });
});
