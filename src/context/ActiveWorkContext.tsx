import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ActiveWorkContextType {
  hasActiveWork: boolean;
  setHasActiveWork: (hasWork: boolean) => void;
  workDescription: string;
  setWorkDescription: (desc: string) => void;
  stopAllMediaStreams: () => void;
}

const ActiveWorkContext = createContext<ActiveWorkContextType | undefined>(undefined);

export const ActiveWorkProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [hasActiveWork, setHasActiveWork] = useState(false);
  const [workDescription, setWorkDescription] = useState('active document processing');

  // Stop any active camera/microphone streams safely
  const stopAllMediaStreams = () => {
    try {
      // Look for any active video elements in document and stop their streams
      const videoElements = document.querySelectorAll('video');
      videoElements.forEach(video => {
        if (video.srcObject && 'getTracks' in (video.srcObject as any)) {
          const stream = video.srcObject as MediaStream;
          stream.getTracks().forEach(track => {
            try {
              track.stop();
            } catch (e) {}
          });
          video.srcObject = null;
        }
      });
    } catch (e) {
      console.warn("Media stream cleanup notice:", e);
    }
  };

  // Warn on browser reload/close if active work is ongoing
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasActiveWork) {
        e.preventDefault();
        e.returnValue = 'Your current files and progress may be cleared if you leave this page.';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasActiveWork]);

  return (
    <ActiveWorkContext.Provider
      value={{
        hasActiveWork,
        setHasActiveWork,
        workDescription,
        setWorkDescription,
        stopAllMediaStreams
      }}
    >
      {children}
    </ActiveWorkContext.Provider>
  );
};

export const useActiveWork = (): ActiveWorkContextType => {
  const context = useContext(ActiveWorkContext);
  if (!context) {
    return {
      hasActiveWork: false,
      setHasActiveWork: () => {},
      workDescription: '',
      setWorkDescription: () => {},
      stopAllMediaStreams: () => {}
    };
  }
  return context;
};
