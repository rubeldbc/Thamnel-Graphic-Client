import * as Select from '@radix-ui/react-select';
import { Icon } from '../common/Icon';
import { mdiChevronDown } from '@mdi/js';

export interface ComboOption {
  label: string;
  value: string;
}

export interface ToolbarComboBoxProps {
  /** Currently selected value. */
  value?: string;
  /** Change handler receiving the new value. */
  onChange?: (value: string) => void;
  /** Dropdown options. */
  options: ComboOption[];
  /** Width of the combo box in pixels. */
  width?: number;
  /** Placeholder text when no value is selected. */
  placeholder?: string;
  /** data-testid for testing. */
  testId?: string;
}

/**
 * Styled combo box / select built on Radix Select.
 * Height 22px, dark theme, 11px font.
 */
export function ToolbarComboBox({
  value,
  onChange,
  options,
  width = 100,
  placeholder = 'Select...',
  testId,
}: ToolbarComboBoxProps) {
  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger
        data-testid={testId}
        className="inline-flex items-center justify-between gap-1 rounded-sm border px-1.5 outline-none"
        style={{
          width,
          height: 22,
          backgroundColor: '#2A2A2A',
          borderColor: 'var(--border-color)',
          color: 'var(--text-primary)',
          fontSize: 11,
        }}
      >
        <Select.Value placeholder={placeholder} />
        <Select.Icon>
          <Icon path={mdiChevronDown} size={12} color="var(--text-secondary)" />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content
          className="z-50 overflow-hidden rounded-md border shadow-lg"
          style={{
            backgroundColor: 'var(--panel-bg)',
            borderColor: 'var(--border-color)',
          }}
          position="popper"
          sideOffset={2}
        >
          <Select.Viewport className="p-1">
            {options.map((opt) => (
              <Select.Item
                key={opt.value}
                value={opt.value}
                className="cursor-default rounded-sm px-2 py-0.5 text-[11px] outline-none select-none data-[highlighted]:bg-[var(--hover-bg)]"
                style={{ color: 'var(--text-primary)' }}
              >
                <Select.ItemText>{opt.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

export default ToolbarComboBox;
