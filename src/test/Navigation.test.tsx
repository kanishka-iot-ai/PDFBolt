import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { ActiveWorkProvider, useActiveWork } from '../context/ActiveWorkContext';

const TestNavbarWrapper: React.FC<{ initialHasActiveWork?: boolean }> = ({ initialHasActiveWork = false }) => {
  const SetWorkHelper = () => {
    const { setHasActiveWork } = useActiveWork();
    React.useEffect(() => {
      setHasActiveWork(initialHasActiveWork);
    }, [initialHasActiveWork, setHasActiveWork]);
    return null;
  };

  return (
    <MemoryRouter initialEntries={['/pdf-to-word']}>
      <ActiveWorkProvider>
        <SetWorkHelper />
        <Navbar
          darkMode={false}
          toggleDarkMode={() => {}}
          soundEnabled={true}
          toggleSound={() => {}}
        />
      </ActiveWorkProvider>
    </MemoryRouter>
  );
};

describe('Global Home Navigation', () => {
  it('renders primary Home navigation link and logo linking to / with accessible labels', () => {
    render(<TestNavbarWrapper initialHasActiveWork={false} />);

    // Logo & Home link have accessible labels
    const homeLinks = screen.getAllByRole('link', { name: /Go to PDFBolt home/i });
    expect(homeLinks.length).toBeGreaterThanOrEqual(2); // Logo + Desktop/Mobile Home buttons

    // Verify href attribute points to /
    homeLinks.forEach(link => {
      expect(link.getAttribute('href')).toBe('/');
    });
  });

  it('renders footer Home link with accessible label', () => {
    render(
      <BrowserRouter>
        <Footer darkMode={false} />
      </BrowserRouter>
    );

    const footerHomeLinks = screen.getAllByRole('link', { name: /Go to PDFBolt home/i });
    expect(footerHomeLinks.length).toBeGreaterThanOrEqual(1);
    expect(footerHomeLinks[0].getAttribute('href')).toBe('/');
  });

  it('shows confirmation modal when clicking Home if active unsaved work exists', () => {
    render(<TestNavbarWrapper initialHasActiveWork={true} />);

    // Click first Home link
    const homeLinks = screen.getAllByRole('link', { name: /Go to PDFBolt home/i });
    fireEvent.click(homeLinks[0]);

    // Confirmation modal should be visible
    expect(screen.getByText(/Leave this tool\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Your current files and progress may be cleared if you leave this page\./i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Stay/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Go Home/i })).toBeInTheDocument();

    // Clicking Stay closes the modal
    fireEvent.click(screen.getByRole('button', { name: /Stay/i }));
    expect(screen.queryByText(/Leave this tool\?/i)).not.toBeInTheDocument();
  });
});
