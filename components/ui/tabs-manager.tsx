'use client';

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { X, Circle, FileIcon } from 'lucide-react';
import { cn } from '../../app/utils/cn';
import { FileSystemItem } from './file-explorer';
import { useToast } from '../providers/toast-provider';
import { ScrollArea } from './scroll-area';

interface TabsManagerProps {
  files: FileSystemItem[];
  currentFile: FileSystemItem | null;
  onSelectFile: (file: FileSystemItem) => void;
  onCloseFile: (fileId: string) => void;
}

interface TabProps {
  file: FileSystemItem;
  isActive: boolean;
  hasUnsavedChanges: boolean;
  onSelect: (file: FileSystemItem) => void;
  onClose: (e: React.MouseEvent, fileId: string) => void;
  getShortenedName: (name: string) => string;
}

// Memoized Tab component to prevent unnecessary re-renders
const Tab = memo(({ 
  file, 
  isActive, 
  hasUnsavedChanges, 
  onSelect, 
  onClose,
  getShortenedName
}: TabProps) => {
  return (
    <div
      key={file.id}
      className={cn(
        'flex items-center px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border-r cursor-pointer group relative min-w-[80px] sm:min-w-[120px] max-w-[150px] sm:max-w-[200px]',
        isActive
          ? 'bg-background/80 text-foreground'
          : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
      )}
      onClick={() => onSelect(file)}
    >
      <div className="flex items-center gap-1 sm:gap-1.5 w-full overflow-hidden">
        <FileIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
        <span className="truncate block">
          <span className="hidden sm:inline">{file.name}</span>
          <span className="inline sm:hidden">{getShortenedName(file.name)}</span>
        </span>
        
        {/* Unsaved indicator */}
        {hasUnsavedChanges && (
          <Circle 
            className="h-1.5 sm:h-2 w-1.5 sm:w-2 fill-current text-blue-400 flex-shrink-0" 
            strokeWidth={0}
          />
        )}
      </div>
      
      <button
        className="ml-1 sm:ml-2 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
        onClick={(e) => onClose(e, file.id)}
        aria-label="Close tab"
      >
        <X className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
      </button>
    </div>
  );
});

Tab.displayName = 'Tab';

export const TabsManager = memo<TabsManagerProps>(({
  files,
  currentFile,
  onSelectFile,
  onCloseFile,
}) => {
  const { toast } = useToast();
  const [openTabs, setOpenTabs] = useState<FileSystemItem[]>([]);
  const [unsavedChanges, setUnsavedChanges] = useState<Record<string, boolean>>({});
  
  // Load open tabs from localStorage on mount - run only once on mount
  useEffect(() => {
    try {
      const savedOpenTabIds = localStorage.getItem('smartscope-open-tabs');
      if (savedOpenTabIds) {
        const tabIds = JSON.parse(savedOpenTabIds) as string[];
        const loadedTabs = tabIds
          .map(id => files.find(file => file.type === 'file' && file.id === id))
          .filter(Boolean) as FileSystemItem[];
        
        if (loadedTabs.length > 0) {
          setOpenTabs(loadedTabs);
          
          // If we have loaded tabs but no current file is set, set the first tab as current
          if (!currentFile && loadedTabs[0]) {
            requestAnimationFrame(() => {
              onSelectFile(loadedTabs[0]);
            });
          }
        }
      }
    } catch (error) {
      console.error('Error loading tabs:', error);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on component mount
  
  // When current file changes, add it to open tabs if not already there
  useEffect(() => {
    if (!currentFile || currentFile.type !== 'file') return;
    
    // Prevent duplicate tabs and unnecessary state updates
    if (!openTabs.some(tab => tab.id === currentFile.id)) {
      // Use functional updates to avoid stale state
      setOpenTabs(prevTabs => {
        const newOpenTabs = [...prevTabs, currentFile];
        
        // Save to localStorage
        localStorage.setItem(
          'smartscope-open-tabs',
          JSON.stringify(newOpenTabs.map(tab => tab.id))
        );
        
        return newOpenTabs;
      });
    }
  }, [currentFile, openTabs]);
  
  // Handle closing a tab - wrapped in useCallback to memoize
  const handleCloseTab = useCallback((e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    
    // Check if there are unsaved changes first
    if (unsavedChanges[fileId]) {
      // Ask for confirmation
      if (!window.confirm('You have unsaved changes. Are you sure you want to close this tab?')) {
        return;
      }
    }
    
    // Use functional updates
    setOpenTabs(prevTabs => {
      const newOpenTabs = prevTabs.filter(tab => tab.id !== fileId);
      
      // Save to localStorage
      localStorage.setItem(
        'smartscope-open-tabs',
        JSON.stringify(newOpenTabs.map(tab => tab.id))
      );
      
      return newOpenTabs;
    });
    
    // If the closed tab was the current file, select another tab
    if (currentFile && currentFile.id === fileId) {
      if (openTabs.length > 1) {
        // Select the tab to the left, or the first tab if the closed tab was the first
        const currentIndex = openTabs.findIndex(tab => tab.id === fileId);
        const newIndex = Math.max(0, currentIndex - 1);
        
        // Use requestAnimationFrame to defer state update
        requestAnimationFrame(() => {
          onSelectFile(openTabs.filter(tab => tab.id !== fileId)[newIndex]);
        });
      } else {
        // No tabs left, clear current file
        onCloseFile(fileId);
      }
    } else {
      // Just close the tab without changing the current selection
      onCloseFile(fileId);
    }
  }, [currentFile, openTabs, unsavedChanges, onSelectFile, onCloseFile]);
  
  // Mark a file as having unsaved changes
  const markFileAsUnsaved = useCallback((fileId: string, isUnsaved: boolean) => {
    setUnsavedChanges(prev => ({
      ...prev,
      [fileId]: isUnsaved
    }));
  }, []);
  
  // Add this function to get a shortened filename for mobile displays
  const getShortenedName = useCallback((name: string) => {
    // If name is already short enough, return it
    if (name.length <= 12) return name;
    
    // For mobile, show just the first 6 chars + ... + last 3 chars
    const ext = name.includes('.') ? name.split('.').pop() : '';
    const base = name.includes('.') ? name.split('.').slice(0, -1).join('.') : name;
    
    if (base.length <= 6) return name;
    return `${base.substring(0, 6)}...${ext ? `.${ext}` : ''}`;
  }, []);

  // Memoize the tabs list to prevent unnecessary re-renders
  const tabsList = useMemo(() => (
    <div className="flex w-max">
      {openTabs.map(file => (
        <Tab
          key={file.id}
          file={file}
          isActive={currentFile?.id === file.id}
          hasUnsavedChanges={!!unsavedChanges[file.id]}
          onSelect={onSelectFile}
          onClose={handleCloseTab}
          getShortenedName={getShortenedName}
        />
      ))}
    </div>
  ), [openTabs, currentFile, unsavedChanges, onSelectFile, handleCloseTab, getShortenedName]);

  return (
    <div className="flex border-b overflow-hidden">
      <ScrollArea 
        className="flex-grow overflow-x-auto w-full"
      >
        {tabsList}
      </ScrollArea>
    </div>
  );
});

TabsManager.displayName = 'TabsManager'; 