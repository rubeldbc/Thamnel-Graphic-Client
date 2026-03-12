import { useCallback } from 'react';
import {
  mdiFolderMultiple,
  mdiRefresh,
  mdiCollapseAll,
  mdiFolderStar,
  mdiFileFind,
  mdiDownload,
  mdiViewGrid,
  mdiSort,
} from '@mdi/js';
import { Icon } from '../common/Icon';
import { useMediaStore } from '../../stores/mediaStore';
import { useDocumentStore } from '../../stores/documentStore';
import { createDefaultLayer } from '../../types/index';

/** Toolbar button descriptor. */
interface TbBtn {
  icon: string;
  title: string;
  testId: string;
}

const TOOLBAR_BUTTONS: TbBtn[] = [
  { icon: mdiFolderMultiple, title: 'Folders', testId: 'ig-folders' },
  { icon: mdiRefresh, title: 'Refresh', testId: 'ig-refresh' },
  { icon: mdiCollapseAll, title: 'Collapse', testId: 'ig-collapse' },
  { icon: mdiFolderStar, title: 'Quick Folders', testId: 'ig-quick-folders' },
  { icon: mdiFileFind, title: 'Explorer', testId: 'ig-explorer' },
  { icon: mdiDownload, title: 'Download', testId: 'ig-download' },
  { icon: mdiViewGrid, title: 'View Mode', testId: 'ig-view-mode' },
  { icon: mdiSort, title: 'Sort', testId: 'ig-sort' },
];

/**
 * Image Gallery tab content for the Left Tab Panel.
 *
 * Shows a toolbar, search input, thumb-size slider, tree/thumbnail split,
 * PS Data panel placeholder, and info bar.
 * Double-click a thumbnail to add as a new image layer.
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

  return (
    <div
      data-testid="image-gallery-tab"
      className="flex h-full flex-col overflow-hidden"
    >
      {/* Toolbar row */}
      <div
        className="flex shrink-0 flex-wrap items-center gap-0.5 border-b px-1 py-0.5"
        style={{ borderColor: 'var(--border-color)' }}
      >
        {TOOLBAR_BUTTONS.map((b) => (
          <button
            key={b.testId}
            data-testid={b.testId}
            title={b.title}
            className="tg-hoverable flex items-center justify-center rounded"
            style={{ width: 24, height: 24 }}
          >
            <Icon path={b.icon} size="xs" />
          </button>
        ))}
      </div>

      {/* Search + Thumb size */}
      <div
        className="flex shrink-0 items-center gap-2 border-b px-2 py-1"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <input
          type="text"
          placeholder="Search..."
          data-testid="ig-search"
          value={imageSearchQuery}
          onChange={(e) => setImageSearchQuery(e.target.value)}
          className="rounded border px-1.5 py-0.5 text-[11px] outline-none"
          style={{
            width: 120,
            backgroundColor: 'var(--dark-bg)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)',
          }}
        />

        <label className="flex items-center gap-1 text-[10px] text-text-secondary select-none">
          Thumb
          <input
            type="range"
            min={60}
            max={200}
            value={thumbSize}
            onChange={(e) => setThumbSize(Number(e.target.value))}
            data-testid="ig-thumb-slider"
            className="h-1 w-14 cursor-pointer"
          />
        </label>
      </div>

      {/* 3-column body: tree | splitter | thumbnails */}
      <div className="flex min-h-0 flex-1">
        {/* Tree view */}
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
