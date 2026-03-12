import { useCallback, useRef } from 'react';
import {
  mdiRefresh,
  mdiArrowCollapseLeft,
  mdiFolderStar,
  mdiFolderOpen,
  mdiCloudDownload,
  mdiViewGrid,
  mdiViewList,
  mdiFormatListBulleted,
  mdiSortAlphabeticalAscending,
  mdiSortAlphabeticalDescending,
  mdiSortCalendarDescending,
  mdiSortNumericDescending,
  mdiClose,
} from '@mdi/js';
import { Icon } from '../common/Icon';
import { useMediaStore } from '../../stores/mediaStore';
import { useDocumentStore } from '../../stores/documentStore';
import { createDefaultLayer } from '../../types/index';

const VIEW_MODE_ICONS = [mdiViewGrid, mdiViewList, mdiFormatListBulleted];
const VIEW_MODE_LABELS = ['View: Large Thumbnails', 'View: Mini List', 'View: File List'];

const SORT_ICONS = [
  mdiSortAlphabeticalAscending,
  mdiSortAlphabeticalDescending,
  mdiSortCalendarDescending,
  mdiSortNumericDescending,
];
const SORT_LABELS = ['Sort: Name A-Z', 'Sort: Name Z-A', 'Sort: Date Created', 'Sort: File Size'];

/**
 * Image Gallery tab content for the Left Tab Panel.
 *
 * Toolbar matches WPF: Refresh, Toggle Folders, Quick Folders, Open in Explorer,
 * separator, Download Gallery Pack, separator, View Mode, Sort.
 * Below toolbar: Search + Thumb size slider.
 * Body: folder tree | thumbnails. Footer: PS Data + info bar.
 */
export function ImageGalleryTab() {
  const images = useMediaStore((s) => s.images);
  const imageFolders = useMediaStore((s) => s.imageFolders);
  const imageSearchQuery = useMediaStore((s) => s.imageSearchQuery);
  const setImageSearchQuery = useMediaStore((s) => s.setImageSearchQuery);
  const thumbSize = useMediaStore((s) => s.thumbSize);
  const setThumbSize = useMediaStore((s) => s.setThumbSize);
  const selectedFolderId = useMediaStore((s) => s.selectedFolderId);
  const setSelectedFolder = useMediaStore((s) => s.setSelectedFolder);
  const folderTreeCollapsed = useMediaStore((s) => s.folderTreeCollapsed);
  const setFolderTreeCollapsed = useMediaStore((s) => s.setFolderTreeCollapsed);
  const viewMode = useMediaStore((s) => s.viewMode);
  const cycleViewMode = useMediaStore((s) => s.cycleViewMode);
  const sortMode = useMediaStore((s) => s.sortMode);
  const cycleSortMode = useMediaStore((s) => s.cycleSortMode);

  const searchRef = useRef<HTMLInputElement>(null);

  const addLayer = useDocumentStore((s) => s.addLayer);
  const selectLayer = useDocumentStore((s) => s.selectLayer);

  // Filter images by folder and search query
  const filteredImages = images.filter((img) => {
    const matchesFolder =
      !selectedFolderId || img.folder === selectedFolderId;
    const matchesSearch =
      !imageSearchQuery ||
      img.name.toLowerCase().includes(imageSearchQuery.toLowerCase());
    return matchesFolder && matchesSearch;
  });

  const handleDoubleClickImage = useCallback(
    (imageSrc: string, imageName: string) => {
      const layer = createDefaultLayer({
        type: 'image',
        name: imageName,
        imageData: imageSrc,
        width: 200,
        height: 200,
      });
      addLayer(layer);
      selectLayer(layer.id);
    },
    [addLayer, selectLayer],
  );

  const handleRefresh = () => {
    // Refresh folder tree and thumbnails
    setImageSearchQuery('');
  };

  const handleToggleFolders = () => {
    setFolderTreeCollapsed(!folderTreeCollapsed);
  };

  const handleOpenInExplorer = () => {
    // Open current folder in system explorer (placeholder)
  };

  const handleDownloadGallery = () => {
    // Download gallery pack (placeholder)
  };

  const handleClearSearch = () => {
    setImageSearchQuery('');
    searchRef.current?.focus();
  };

  /** Vertical separator matching WPF Rectangle separators. */
  const Separator = () => (
    <div
      className="mx-0.5 self-stretch"
      style={{ width: 1, backgroundColor: 'var(--border-color)', margin: '4px 2px' }}
    />
  );

  return (
    <div
      data-testid="image-gallery-tab"
      className="flex h-full flex-col overflow-hidden"
    >
      {/* Toolbar row */}
      <div
        className="flex shrink-0 items-center border-b px-1 py-0.5"
        style={{
          borderColor: 'var(--border-color)',
          backgroundColor: 'var(--toolbar-bg)',
          padding: '4px 2px',
        }}
      >
        {/* Refresh */}
        <button
          data-testid="ig-refresh"
          title="Refresh"
          className="tg-hoverable flex items-center justify-center rounded"
          style={{ width: 24, height: 24, padding: 2 }}
          onClick={handleRefresh}
        >
          <Icon path={mdiRefresh} size={14} />
        </button>

        {/* Toggle Folders */}
        <button
          data-testid="ig-toggle-folders"
          title="Toggle Folders"
          className="tg-hoverable flex items-center justify-center rounded"
          style={{ width: 24, height: 24, padding: 2 }}
          onClick={handleToggleFolders}
        >
          <Icon path={mdiArrowCollapseLeft} size={14} />
        </button>

        {/* Quick Folders */}
        <button
          data-testid="ig-quick-folders"
          title="Quick Folders"
          className="tg-hoverable flex items-center justify-center rounded"
          style={{ width: 24, height: 24, padding: 2 }}
        >
          <Icon path={mdiFolderStar} size={14} />
        </button>

        {/* Open in Explorer */}
        <button
          data-testid="ig-open-explorer"
          title="Open in Explorer"
          className="tg-hoverable flex items-center justify-center rounded"
          style={{ width: 24, height: 24, padding: 2 }}
          onClick={handleOpenInExplorer}
        >
          <Icon path={mdiFolderOpen} size={12} />
        </button>

        <Separator />

        {/* Download Gallery Pack */}
        <button
          data-testid="ig-download"
          title="Download Gallery Pack"
          className="tg-hoverable flex items-center justify-center rounded"
          style={{ width: 24, height: 24, padding: 2 }}
          onClick={handleDownloadGallery}
        >
          <Icon path={mdiCloudDownload} size={14} color="var(--accent-orange)" />
        </button>

        <Separator />

        {/* View Mode */}
        <button
          data-testid="ig-view-mode"
          title={VIEW_MODE_LABELS[viewMode]}
          className="tg-hoverable flex items-center justify-center rounded"
          style={{ width: 24, height: 24, padding: 2 }}
          onClick={cycleViewMode}
        >
          <Icon path={VIEW_MODE_ICONS[viewMode]} size={14} />
        </button>

        {/* Sort */}
        <button
          data-testid="ig-sort"
          title={SORT_LABELS[sortMode]}
          className="tg-hoverable flex items-center justify-center rounded"
          style={{ width: 24, height: 24, padding: 2 }}
          onClick={cycleSortMode}
        >
          <Icon path={SORT_ICONS[sortMode]} size={14} />
        </button>
      </div>

      {/* Search + Thumb size */}
      <div
        className="flex shrink-0 items-center gap-2 border-b px-2 py-1"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <div className="relative">
          <input
            ref={searchRef}
            type="text"
            placeholder="Search..."
            data-testid="ig-search"
            value={imageSearchQuery}
            onChange={(e) => setImageSearchQuery(e.target.value)}
            className="rounded border py-0.5 pr-5 pl-1.5 text-[11px] outline-none"
            style={{
              width: 120,
              height: 20,
              backgroundColor: 'var(--dark-bg)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
              padding: '2px 16px 2px 4px',
            }}
          />
          {imageSearchQuery && (
            <button
              data-testid="ig-search-clear"
              title="Clear search"
              className="tg-hoverable absolute top-1/2 right-0 flex -translate-y-1/2 items-center justify-center"
              style={{ width: 16, height: 16, padding: 0 }}
              onClick={handleClearSearch}
            >
              <Icon path={mdiClose} size={10} />
            </button>
          )}
        </div>

        <label className="flex items-center gap-1 text-[10px] select-none" style={{ color: 'var(--text-secondary)' }}>
          Size
          <input
            type="range"
            min={60}
            max={200}
            value={thumbSize}
            onChange={(e) => setThumbSize(Number(e.target.value))}
            data-testid="ig-thumb-slider"
            className="h-1 cursor-pointer"
            style={{ minWidth: 40 }}
          />
        </label>
      </div>

      {/* Body: folder tree | thumbnails */}
      <div className="flex min-h-0 flex-1">
        {/* Folder tree */}
        {!folderTreeCollapsed && (
          <div
            className="shrink-0 overflow-auto border-r"
            style={{
              width: 160,
              borderColor: 'var(--border-color)',
            }}
            data-testid="ig-tree"
          >
            {imageFolders.length === 0 ? (
              <div
                className="flex h-full items-center justify-center text-[10px]"
                style={{ color: 'var(--text-disabled)' }}
              >
                Folders
              </div>
            ) : (
              <div className="py-1">
                {imageFolders.map((folder) => (
                  <div
                    key={folder.path}
                    data-testid={`ig-folder-${folder.name}`}
                    className="cursor-pointer px-2 py-1 text-[11px]"
                    style={{
                      color:
                        selectedFolderId === folder.path
                          ? 'var(--accent-orange)'
                          : 'var(--text-primary)',
                      backgroundColor:
                        selectedFolderId === folder.path
                          ? 'var(--hover-bg)'
                          : undefined,
                    }}
                    onClick={() => setSelectedFolder(folder.path)}
                  >
                    {folder.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Thumbnail area */}
        <div
          className="flex min-w-0 flex-1 flex-col overflow-auto"
          data-testid="ig-thumbs"
        >
          {filteredImages.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <span
                className="text-[11px]"
                style={{ color: 'var(--text-disabled)' }}
                data-testid="ig-empty"
              >
                No images
              </span>
            </div>
          ) : (
            <div
              className="flex flex-wrap gap-1 p-1"
              data-testid="ig-thumbnail-grid"
            >
              {filteredImages.map((img) => (
                <div
                  key={img.id}
                  data-testid={`ig-thumb-${img.id}`}
                  className="cursor-pointer overflow-hidden rounded border border-border"
                  style={{
                    width: thumbSize,
                    height: thumbSize,
                  }}
                  title={img.name}
                  onDoubleClick={() =>
                    handleDoubleClickImage(img.src, img.name)
                  }
                >
                  <img
                    src={img.src}
                    alt={img.name}
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* PS Data panel placeholder */}
      <div
        className="shrink-0 border-t px-2 py-1 text-[10px]"
        style={{
          borderColor: 'var(--border-color)',
          color: 'var(--text-disabled)',
          height: 28,
        }}
        data-testid="ig-ps-data"
      >
        PS Data
      </div>

      {/* Info bar */}
      <div
        className="shrink-0 border-t px-2 text-[10px]"
        style={{
          borderColor: 'var(--border-color)',
          color: 'var(--text-secondary)',
          height: 20,
          lineHeight: '20px',
        }}
        data-testid="ig-info-bar"
      >
        {filteredImages.length} items
      </div>
    </div>
  );
}

export default ImageGalleryTab;
