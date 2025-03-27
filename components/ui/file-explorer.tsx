'use client';

import React, { useState, useCallback, memo, useMemo } from 'react';
import { 
  FolderIcon, FileIcon, ChevronRight, ChevronDown, 
  FilePlus, FolderPlus, MoreVertical, Trash2, Edit2, Copy, Check
} from 'lucide-react';
import { cn } from '../../app/utils/cn';
import { Button } from './button';
import { ScrollArea } from './scroll-area';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from './context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog';
import { Input } from './input';
import { Label } from './label';
import { useToast } from '../providers/toast-provider';

// File/Folder type and structure
export interface FileSystemItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileSystemItem[];
  parent?: string;
  createdAt: Date;
  updatedAt: Date;
  language?: string;
}

export interface FileSystemContextType {
  files: FileSystemItem[];
  currentFile: FileSystemItem | null;
  createFile: (name: string, parentId?: string) => void;
  createFolder: (name: string, parentId?: string) => void;
  renameItem: (id: string, newName: string) => void;
  deleteItem: (id: string) => void;
  updateFileContent: (id: string, content: string) => void;
  selectFile: (id: string) => void;
}

export interface FileExplorerProps {
  files: FileSystemItem[];
  currentFile: FileSystemItem | null;
  onFileSelect: (file: FileSystemItem) => void;
  onCreateFile: (name: string, parentId?: string) => void;
  onCreateFolder: (name: string, parentId?: string) => void;
  onRenameItem: (id: string, newName: string) => void;
  onDeleteItem: (id: string) => void;
  onCreateNew?: (type: 'file' | 'folder') => void;
}

// Define FileItem props interface
interface FileItemProps {
  item: FileSystemItem;
  level: number;
  expandedFolders: Record<string, boolean>;
  currentFile: FileSystemItem | null;
  renamingItem: string | null;
  renameValue: string;
  handleFileClick: (item: FileSystemItem) => void;
  handleRenameSubmit: (id: string) => void;
  handleStartRename: (id: string, name: string) => void;
  handleCancelRename: () => void;
  handleSetContextParent: (id: string) => void;
  onDeleteItem: (id: string) => void;
  renderFileSystemItem: (item: FileSystemItem, level: number) => React.ReactNode;
  setRenameValue: (value: string) => void;
}

// Create a memoized file item component
const FileItem = memo(({ 
  item, 
  level, 
  expandedFolders,
  currentFile,
  renamingItem,
  renameValue,
  handleFileClick,
  handleRenameSubmit,
  handleStartRename,
  handleCancelRename,
  handleSetContextParent,
  onDeleteItem,
  renderFileSystemItem,
  setRenameValue
}: FileItemProps) => {
  const isFolder = item.type === 'folder';
  const isExpanded = expandedFolders[item.id] || false;
  const isSelected = currentFile?.id === item.id;
  const isRenaming = renamingItem === item.id;

  return (
    <div key={item.id} className="select-none">
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div 
            className={cn(
              'flex items-center py-1 px-2 text-sm rounded-md cursor-pointer hover:bg-accent/40 transition-colors',
              isSelected && !isFolder && 'bg-accent text-accent-foreground',
              isRenaming && 'bg-accent/20'
            )}
            style={{ paddingLeft: `${Math.min(level * 12, 40) + 8}px` }}
            onClick={() => handleFileClick(item)}
          >
            <div className="flex items-center flex-1 min-w-0">
              {isFolder && (
                <span className="mr-1 text-muted-foreground flex-shrink-0">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </span>
              )}
              
              <span className="mr-2 text-muted-foreground flex-shrink-0">
                {isFolder ? (
                  <FolderIcon className="h-4 w-4" />
                ) : (
                  <FileIcon className="h-4 w-4" />
                )}
              </span>
              
              {isRenaming ? (
                <div className="flex items-center gap-1 w-full min-w-0">
                  <Input
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    className="h-6 py-0 text-xs"
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        handleRenameSubmit(item.id);
                      } else if (e.key === 'Escape') {
                        handleCancelRename();
                      }
                    }}
                    onClick={e => e.stopPropagation()}
                  />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-5 w-5 flex-shrink-0" 
                    onClick={e => {
                      e.stopPropagation();
                      handleRenameSubmit(item.id);
                    }}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <span className="truncate text-sm">{item.name}</span>
              )}
            </div>
            
            {!isRenaming && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100">
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem 
                    onClick={() => handleStartRename(item.id, item.name)}
                  >
                    <Edit2 className="mr-2 h-4 w-4" />
                    <span>Rename</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDeleteItem(item.id)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Delete</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          {isFolder && (
            <>
              <ContextMenuItem onClick={() => handleSetContextParent(item.id)}>
                <FilePlus className="mr-2 h-4 w-4" />
                <span>New File</span>
              </ContextMenuItem>
              <ContextMenuItem onClick={() => handleSetContextParent(item.id)}>
                <FolderPlus className="mr-2 h-4 w-4" />
                <span>New Folder</span>
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          )}
          <ContextMenuItem onClick={() => handleStartRename(item.id, item.name)}>
            <Edit2 className="mr-2 h-4 w-4" />
            <span>Rename</span>
          </ContextMenuItem>
          <ContextMenuItem 
            onClick={() => onDeleteItem(item.id)}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Delete</span>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      
      {isFolder && isExpanded && item.children && (
        <div>
          {item.children.map(child => renderFileSystemItem(child, level + 1))}
        </div>
      )}
    </div>
  );
});

FileItem.displayName = 'FileItem';

export const FileExplorer: React.FC<FileExplorerProps> = ({
  files,
  currentFile,
  onFileSelect,
  onCreateFile,
  onCreateFolder,
  onRenameItem,
  onDeleteItem,
  onCreateNew,
}) => {
  const { toast } = useToast();
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [renamingItem, setRenamingItem] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [contextParent, setContextParent] = useState<string | undefined>(undefined);
  const [setRenameValueFunc] = useState(() => (value: string) => setRenameValue(value));

  // Memoize functions that update state to prevent unnecessary re-renders
  const toggleFolder = useCallback((id: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  }, []);

  const handleRenameSubmit = useCallback((id: string) => {
    if (!renameValue.trim()) {
      toast({
        title: 'Error',
        description: 'Name cannot be empty',
        type: 'error'
      });
      return;
    }
    
    onRenameItem(id, renameValue);
    setRenamingItem(null);
    setRenameValue('');
  }, [renameValue, onRenameItem, toast]);

  const handleStartRename = useCallback((id: string, name: string) => {
    setRenamingItem(id);
    setRenameValue(name);
  }, []);

  const handleCancelRename = useCallback(() => {
    setRenamingItem(null);
    setRenameValue('');
  }, []);

  const handleSetContextParent = useCallback((id: string) => {
    setContextParent(id);
  }, []);

  const handleFileClick = useCallback((item: FileSystemItem) => {
    if (item.type === 'folder') {
      toggleFolder(item.id);
    } else {
      onFileSelect(item);
    }
  }, [toggleFolder, onFileSelect]);

  // Memoize the renderFileSystemItem function to prevent unnecessary re-renders
  const renderFileSystemItem = useCallback((item: FileSystemItem, level: number = 0) => {
    return (
      <FileItem
        key={item.id}
        item={item}
        level={level}
        expandedFolders={expandedFolders}
        currentFile={currentFile}
        renamingItem={renamingItem}
        renameValue={renameValue}
        handleFileClick={handleFileClick}
        handleRenameSubmit={handleRenameSubmit}
        handleStartRename={handleStartRename}
        handleCancelRename={handleCancelRename}
        handleSetContextParent={handleSetContextParent}
        onDeleteItem={onDeleteItem}
        renderFileSystemItem={renderFileSystemItem}
        setRenameValue={setRenameValueFunc}
      />
    );
  }, [expandedFolders, currentFile, renamingItem, renameValue, handleFileClick, handleRenameSubmit, handleStartRename, handleCancelRename, handleSetContextParent, onDeleteItem, setRenameValueFunc]);

  // Memoize file list to prevent re-renders
  const filesList = useMemo(() => (
    <div className="p-2">
      {files.map(item => renderFileSystemItem(item, 0))}
    </div>
  ), [files, renderFileSystemItem]);

  // Memoize the button click handlers
  const handleCreateNewFile = useCallback(() => {
    if (onCreateNew) {
      onCreateNew('file');
    }
  }, [onCreateNew]);

  const handleCreateNewFolder = useCallback(() => {
    if (onCreateNew) {
      onCreateNew('folder');
    }
  }, [onCreateNew]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-2 border-b">
        <h3 className="text-sm font-medium">Files</h3>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={handleCreateNewFile}
          >
            <FilePlus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={handleCreateNewFolder}
          >
            <FolderPlus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <ScrollArea className="flex-1 overflow-auto">
        {filesList}
      </ScrollArea>
    </div>
  );
}; 