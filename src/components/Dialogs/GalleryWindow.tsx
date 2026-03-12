import { useState, useCallback } from 'react';
import { DialogBase } from './DialogBase';
import { Icon } from '../common/Icon';
import { mdiFolder, mdiFolderOpen } from '@mdi/js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GalleryFolder {
  name: string;
  path: string;
  children?: GalleryFolder[];
}

export interface GalleryImage {
  path: string;
  name: string;
}

export interface GalleryWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  galleryPath?: string;
  onImageSelect?: (path: string) => void;
  onSetAsBackground?: (path: string) => void;
  folders?: GalleryFolder[];
  images?: GalleryImage[];
}

// ---------------------------------------------------------------------------
// Folder tree item (recursive)
// ---------------------------------------------------------------------------

function FolderTreeItem({
  folder,
  depth,
  selectedPath,
  onSelect,
}: {
  folder: GalleryFolder;
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
}) {
  const isSelected = selectedPath === folder.path;
  const hasChildren = folder.children && folder.children.length > 0;
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <button
        type="button"
        className="flex w-full items-center gap-1.5 text-left text-xs"
        style={{
          paddingLeft: 8 + depth * 16,
          paddingRight: 8,
          paddingTop: 4,
          paddingBottom: 4,
          backgroundColor: isSelected ? 'var(--accent-orange)' : 'transparent',
          color: isSelected ? '#fff' : 'var(--text-primary)',
          border: 'none',
          cursor: 'pointer',
        }}
        onClick={() => {
          onSelect(folder.path);
          if (hasChildren) setExpanded((prev) => !prev);
        }}
        data-testid={`gallery-folder-${folder.name}`}
      >
        <Icon
          path={expanded && hasChildren ? mdiFolderOpen : mdiFolder}
          size={16}
          color={isSelected ? '#fff' : 'var(--accent-orange)'}
        />
        <span className="truncate">{folder.name}</span>
      </button>

      {expanded &&
        hasChildren &&
        folder.children!.map((child) => (
          <FolderTreeItem
            key={child.path}
            folder={child}
            depth={depth + 1}
            selectedPath={selectedPath}
            onSelect={onSelect}
          />
        ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Full-featured gallery browser with folder tree sidebar,
 * thumbnail grid with adjustable size, and info bar.
 *
 * The component is a UI shell driven entirely by props.
 * Wire up to Tauri filesystem APIs later.
 */
export function GalleryWindow({
  open,
  onOpenChange,
  galleryPath,
  onImageSelect,
  // onSetAsBackground – reserved for future context menu action
  folders = [],
  images = [],
}: GalleryWindowProps) {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [thumbnailSize, setThumbnailSize] = useState(120);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [hoveredImagePath, setHoveredImagePath] = useState<string | null>(null);

  const handleFolderSelect = useCallback((path: string) => {
    setSelectedFolder(path);
    setSelectedImage(null);
  }, []);

  const handleImageDoubleClick = useCallback(
    (image: GalleryImage) => {
      onImageSelect?.(image.path);
    },
    [onImageSelect],
  );

  // ---- Footer ----

  const footer = (
    <button
      type="button"
      className="rounded px-4 py-1.5 text-xs font-medium"
      style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--toolbar-bg)' }}
      onClick={() => onOpenChange(false)}
      data-testid="gallery-close"
    >
      Close
    </button>
  );

  return (
    <DialogBase
      open={open}
      onOpenChange={onOpenChange}
      title="Gallery"
      width={900}
      height={600}
      footer={footer}
    >
      <div
        className="flex"
        style={{ height: '100%' }}
        data-testid="gallery-dialog-content"
      >
        {/* ---- Left sidebar: Folder tree ---- */}
        <div
          className="flex shrink-0 flex-col"
          style={{
            width: 220,
            borderRight: '1px solid var(--border-color)',
          }}
          data-testid="gallery-folder-panel"
        >
          {/* Folders header */}
          <div
            className="shrink-0 select-none px-3 text-xs font-bold"
            style={{
              color: 'var(--accent-orange)',
              height: 32,
              lineHeight: '32px',
            }}
          >
            Folders
          </div>

          {/* Scrollable folder tree */}
          <div
            className="flex-1 overflow-y-auto"
            data-testid="gallery-folder-tree"
          >
            {folders.length === 0 ? (
              <div
                className="px-3 text-[11px] italic"
                style={{ color: '#555', paddingTop: 8 }}
              >
                No folders
              </div>
            ) : (
              folders.map((folder) => (
                <FolderTreeItem
                  key={folder.path}
                  folder={folder}
                  depth={0}
                  selectedPath={selectedFolder}
                  onSelect={handleFolderSelect}
                />
              ))
            )}
          </div>
        </div>

        {/* ---- Right main area ---- */}
        <div
          className="flex flex-1 flex-col"
          style={{ minWidth: 0 }}
        >
          {/* Top toolbar */}
          <div
            className="flex shrink-0 items-center gap-3 border-b px-3"
            style={{
              height: 36,
              borderColor: 'var(--border-color)',
              backgroundColor: 'var(--toolbar-bg)',
            }}
            data-testid="gallery-toolbar"
          >
            {/* Thumbnail size slider */}
            <label
              className="flex items-center gap-1.5 text-[11px]"
              style={{ color: 'var(--text-secondary)' }}
            >
              Size
              <input
                type="range"
                min={60}
                max={200}
                value={thumbnailSize}
                onChange={(e) => setThumbnailSize(Number(e.target.value))}
                style={{ width: 80, accentColor: 'var(--accent-orange)' }}
                data-testid="gallery-size-slider"
              />
              <span style={{ minWidth: 28 }}>{thumbnailSize}</span>
            </label>

            {/* Path display */}
            <div
              className="flex-1 truncate text-right text-[11px]"
              style={{ color: 'var(--text-secondary)' }}
              data-testid="gallery-path-display"
            >
              {galleryPath ?? selectedFolder ?? ''}
            </div>
          </div>

          {/* Scrollable thumbnail grid */}
          <div
            className="flex-1 overflow-y-auto p-2"
            data-testid="gallery-thumbnail-grid"
          >
            {images.length === 0 ? (
              <div
                className="flex h-full items-center justify-center text-xs"
                style={{ color: 'var(--text-secondary)' }}
                data-testid="gallery-no-images"
              >
                No images in this folder
              </div>
            ) : (
              <div className="flex flex-wrap" style={{ gap: 6 }}>
                {images.map((image) => {
                  const isSelected = selectedImage?.path === image.path;
                  const isHovered = hoveredImagePath === image.path;

                  return (
                    <div
                      key={image.path}
                      style={{
                        width: thumbnailSize,
                        height: thumbnailSize * 0.75,
                        border: `1px solid ${isSelected ? 'var(--accent-orange)' : isHovered ? 'var(--accent-orange)' : '#444'}`,
                        borderRadius: 3,
                        backgroundColor: '#1E1E1E',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onClick={() => setSelectedImage(image)}
                      onDoubleClick={() => handleImageDoubleClick(image)}
                      onMouseEnter={() => setHoveredImagePath(image.path)}
                      onMouseLeave={() => setHoveredImagePath(null)}
                      // TODO: Right-click context menu for "Set as Background" etc.
                      // onContextMenu={...}
                      data-testid={`gallery-thumb-${image.name}`}
                    >
                      <img
                        src={image.path}
                        alt={image.name}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain',
                        }}
                        draggable={false}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom info bar */}
          <div
            className="flex shrink-0 items-center border-t px-3 text-[11px]"
            style={{
              height: 24,
              borderColor: 'var(--border-color)',
              color: 'var(--text-secondary)',
              backgroundColor: 'var(--toolbar-bg)',
            }}
            data-testid="gallery-info-bar"
          >
            {selectedImage ? (
              <span data-testid="gallery-selected-info">
                {selectedImage.name}
                {/* Dimensions placeholder: will be populated when Tauri API integration is added */}
              </span>
            ) : (
              <span>{images.length} image{images.length !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>

        {/* PS Data panel placeholder – not implemented yet */}
        {/* <div className="shrink-0" style={{ width: 200, borderLeft: '1px solid var(--border-color)' }}>PS Data</div> */}
      </div>
    </DialogBase>
  );
}

export default GalleryWindow;
