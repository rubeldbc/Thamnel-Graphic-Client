import { mdiRefresh, mdiMusicNote } from '@mdi/js';
import { Icon } from '../common/Icon';
import { useMediaStore } from '../../stores/mediaStore';

/**
 * Server Audio tab content for the Left Tab Panel.
 *
 * Shows a header with refresh button, a scrollable list for audio items
 * (each with radio, icon, name, duration), a status line, and empty state.
 * Wired to mediaStore for real data.
 */
export function ServerAudioTab() {
  const audioItems = useMediaStore((s) => s.audioItems);
  const selectedAudioId = useMediaStore((s) => s.selectedAudioId);
  const selectAudio = useMediaStore((s) => s.selectAudio);
  const audioStatus = useMediaStore((s) => s.audioStatus);
  const setAudioStatus = useMediaStore((s) => s.setAudioStatus);
  const _setAudioItems: unknown = useMediaStore((s) => s.setAudioItems); void _setAudioItems;

  const handleRefresh = () => {
    setAudioStatus('Refreshing...');
    // Simulate a refresh; in real app this would fetch from server
    setTimeout(() => {
      setAudioStatus(`${audioItems.length} audio files loaded`);
    }, 500);
  };

  return (
    <div
      data-testid="server-audio-tab"
      className="flex h-full flex-col overflow-hidden"
    >
      {/* Header */}
      <div
        className="flex shrink-0 items-center justify-between px-2 select-none"
        style={{ height: 28 }}
      >
        <span
          className="text-[11px] font-bold"
          style={{ color: 'var(--accent-orange)' }}
          data-testid="sa-header"
        >
          SERVER AUDIO
        </span>

        <button
          data-testid="sa-refresh"
          title="Refresh"
          className="tg-hoverable flex items-center justify-center rounded"
          style={{ width: 24, height: 24 }}
          onClick={handleRefresh}
        >
          <Icon path={mdiRefresh} size="sm" />
        </button>
      </div>

      {/* Scrollable list */}
      <div
        className="flex min-h-0 flex-1 flex-col overflow-auto border-t"
        style={{ borderColor: 'var(--border-color)' }}
        data-testid="sa-list"
      >
        {audioItems.length === 0 ? (
          /* Empty state */
          <div className="flex flex-1 items-center justify-center">
            <span
              className="text-[11px]"
              style={{ color: 'var(--text-disabled)' }}
              data-testid="sa-empty"
            >
              No audio files
            </span>
          </div>
        ) : (
          audioItems.map((item) => (
            <div
              key={item.id}
              data-testid={`sa-audio-item-${item.id}`}
              className="flex cursor-pointer items-center gap-2 border-b px-2"
              style={{
                height: 32,
                borderColor: 'var(--border-color)',
                backgroundColor:
                  item.id === selectedAudioId
                    ? 'var(--hover-bg)'
                    : undefined,
              }}
              onClick={() => selectAudio(item.id)}
            >
              <input
                type="radio"
                name="server-audio"
                checked={item.id === selectedAudioId}
                onChange={() => selectAudio(item.id)}
                data-testid={`sa-radio-${item.id}`}
                className="accent-orange-500"
              />
              <Icon path={mdiMusicNote} size="sm" color="var(--text-secondary)" />
              <span
                className="min-w-0 flex-1 truncate text-[11px]"
                style={{ color: 'var(--text-primary)' }}
              >
                {item.name}
              </span>
              <span
                className="shrink-0 text-[10px]"
                style={{ color: 'var(--text-secondary)' }}
              >
                {item.duration}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Status text */}
      <div
        className="shrink-0 border-t px-2 text-[10px]"
        style={{
          borderColor: 'var(--border-color)',
          color: 'var(--text-secondary)',
          height: 22,
          lineHeight: '22px',
        }}
        data-testid="sa-status"
      >
        {audioStatus}
      </div>
    </div>
  );
}

export default ServerAudioTab;
