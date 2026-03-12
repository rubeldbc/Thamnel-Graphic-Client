import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CanvasContextMenu } from '../components/ContextMenus/CanvasContextMenu';
import { CanvasMultiSelectMenu } from '../components/ContextMenus/CanvasMultiSelectMenu';
import { LayerContextMenu } from '../components/ContextMenus/LayerContextMenu';
import { GroupContextMenu } from '../components/ContextMenus/GroupContextMenu';
import { SuperLockedMenu } from '../components/ContextMenus/SuperLockedMenu';

// ---------------------------------------------------------------------------
// Helper: Radix ContextMenu opens on the 'contextmenu' event on the trigger.
// In jsdom the portal content appears in document.body once opened.
// ---------------------------------------------------------------------------

function rightClick(element: HTMLElement) {
  // Radix ContextMenu listens for pointerdown (button 2) then contextmenu.
  fireEvent.pointerDown(element, { button: 2, pointerType: 'mouse' });
  fireEvent.contextMenu(element);
}

// ===========================================================================
// CanvasContextMenu
// ===========================================================================

describe('CanvasContextMenu', () => {
  it('renders trigger content', () => {
    const onAction = vi.fn();
    render(
      <CanvasContextMenu onAction={onAction}>
        <div data-testid="canvas-trigger">Canvas Area</div>
      </CanvasContextMenu>,
    );
    expect(screen.getByTestId('canvas-trigger')).toBeInTheDocument();
    expect(screen.getByText('Canvas Area')).toBeInTheDocument();
  });

  it('opens with correct data-testid on right-click', async () => {
    const onAction = vi.fn();
    render(
      <CanvasContextMenu onAction={onAction}>
        <div data-testid="canvas-trigger">Canvas Area</div>
      </CanvasContextMenu>,
    );

    rightClick(screen.getByTestId('canvas-trigger'));

    await waitFor(() => {
      expect(screen.getByTestId('canvas-context-menu')).toBeInTheDocument();
    });
  });

  it('shows expected menu items when opened', async () => {
    const onAction = vi.fn();
    render(
      <CanvasContextMenu onAction={onAction}>
        <div data-testid="canvas-trigger">Canvas Area</div>
      </CanvasContextMenu>,
    );

    rightClick(screen.getByTestId('canvas-trigger'));

    await waitFor(() => {
      expect(screen.getByText('Copy')).toBeInTheDocument();
      expect(screen.getByText('Paste')).toBeInTheDocument();
      expect(screen.getByText('Duplicate')).toBeInTheDocument();
      // "Delete" appears twice: as the item label and its shortcut hint.
      // Use getAllByText to verify at least one is present.
      expect(screen.getAllByText('Delete').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Transform')).toBeInTheDocument();
      expect(screen.getByText('Style Preset')).toBeInTheDocument();
      expect(screen.getByText('Select Layer')).toBeInTheDocument();
    });
  });
});

// ===========================================================================
// CanvasMultiSelectMenu
// ===========================================================================

describe('CanvasMultiSelectMenu', () => {
  it('renders trigger content', () => {
    const onAction = vi.fn();
    render(
      <CanvasMultiSelectMenu onAction={onAction}>
        <div data-testid="multi-trigger">Multi Selection</div>
      </CanvasMultiSelectMenu>,
    );
    expect(screen.getByTestId('multi-trigger')).toBeInTheDocument();
    expect(screen.getByText('Multi Selection')).toBeInTheDocument();
  });

  it('opens with correct data-testid on right-click', async () => {
    const onAction = vi.fn();
    render(
      <CanvasMultiSelectMenu onAction={onAction}>
        <div data-testid="multi-trigger">Multi Selection</div>
      </CanvasMultiSelectMenu>,
    );

    rightClick(screen.getByTestId('multi-trigger'));

    await waitFor(() => {
      expect(screen.getByTestId('canvas-multi-context-menu')).toBeInTheDocument();
    });
  });

  it('shows expected menu items when opened', async () => {
    const onAction = vi.fn();
    render(
      <CanvasMultiSelectMenu onAction={onAction}>
        <div data-testid="multi-trigger">Multi Selection</div>
      </CanvasMultiSelectMenu>,
    );

    rightClick(screen.getByTestId('multi-trigger'));

    await waitFor(() => {
      expect(screen.getByText('Group')).toBeInTheDocument();
      expect(screen.getByText('Autosize')).toBeInTheDocument();
      expect(screen.getByText('Delete Selected')).toBeInTheDocument();
    });
  });
});

// ===========================================================================
// LayerContextMenu
// ===========================================================================

describe('LayerContextMenu', () => {
  it('renders trigger content', () => {
    const onAction = vi.fn();
    render(
      <LayerContextMenu onAction={onAction} layerType="image">
        <div data-testid="layer-trigger">Layer Row</div>
      </LayerContextMenu>,
    );
    expect(screen.getByTestId('layer-trigger')).toBeInTheDocument();
    expect(screen.getByText('Layer Row')).toBeInTheDocument();
  });

  it('opens with correct data-testid on right-click', async () => {
    const onAction = vi.fn();
    render(
      <LayerContextMenu onAction={onAction} layerType="text">
        <div data-testid="layer-trigger">Layer Row</div>
      </LayerContextMenu>,
    );

    rightClick(screen.getByTestId('layer-trigger'));

    await waitFor(() => {
      expect(screen.getByTestId('layer-context-menu')).toBeInTheDocument();
    });
  });

  it('shows "Get Video Name" for image layers', async () => {
    const onAction = vi.fn();
    render(
      <LayerContextMenu onAction={onAction} layerType="image">
        <div data-testid="layer-trigger">Layer Row</div>
      </LayerContextMenu>,
    );

    rightClick(screen.getByTestId('layer-trigger'));

    await waitFor(() => {
      expect(screen.getByText('Get Video Name')).toBeInTheDocument();
    });
  });

  it('hides "Get Video Name" for non-image layers', async () => {
    const onAction = vi.fn();
    render(
      <LayerContextMenu onAction={onAction} layerType="text">
        <div data-testid="layer-trigger">Layer Row</div>
      </LayerContextMenu>,
    );

    rightClick(screen.getByTestId('layer-trigger'));

    await waitFor(() => {
      expect(screen.getByTestId('layer-context-menu')).toBeInTheDocument();
    });

    expect(screen.queryByText('Get Video Name')).not.toBeInTheDocument();
  });
});

// ===========================================================================
// GroupContextMenu
// ===========================================================================

describe('GroupContextMenu', () => {
  it('renders trigger content', () => {
    const onAction = vi.fn();
    render(
      <GroupContextMenu onAction={onAction}>
        <div data-testid="group-trigger">Group Row</div>
      </GroupContextMenu>,
    );
    expect(screen.getByTestId('group-trigger')).toBeInTheDocument();
    expect(screen.getByText('Group Row')).toBeInTheDocument();
  });

  it('opens with correct data-testid on right-click', async () => {
    const onAction = vi.fn();
    render(
      <GroupContextMenu onAction={onAction}>
        <div data-testid="group-trigger">Group Row</div>
      </GroupContextMenu>,
    );

    rightClick(screen.getByTestId('group-trigger'));

    await waitFor(() => {
      expect(screen.getByTestId('group-context-menu')).toBeInTheDocument();
    });
  });

  it('shows expected menu items when opened', async () => {
    const onAction = vi.fn();
    render(
      <GroupContextMenu onAction={onAction}>
        <div data-testid="group-trigger">Group Row</div>
      </GroupContextMenu>,
    );

    rightClick(screen.getByTestId('group-trigger'));

    await waitFor(() => {
      expect(screen.getByText('Rename')).toBeInTheDocument();
      expect(screen.getByText('Duplicate Group')).toBeInTheDocument();
      expect(screen.getByText('New Sub-Group')).toBeInTheDocument();
      expect(screen.getByText('Change Group Color')).toBeInTheDocument();
      expect(screen.getByText('Ungroup')).toBeInTheDocument();
      expect(screen.getByText('Delete Group')).toBeInTheDocument();
      expect(screen.getByText('Super Lock')).toBeInTheDocument();
    });
  });
});

// ===========================================================================
// SuperLockedMenu
// ===========================================================================

describe('SuperLockedMenu', () => {
  it('renders trigger content', () => {
    const onAction = vi.fn();
    render(
      <SuperLockedMenu onAction={onAction}>
        <div data-testid="locked-trigger">Locked Layer</div>
      </SuperLockedMenu>,
    );
    expect(screen.getByTestId('locked-trigger')).toBeInTheDocument();
    expect(screen.getByText('Locked Layer')).toBeInTheDocument();
  });

  it('opens with correct data-testid on right-click', async () => {
    const onAction = vi.fn();
    render(
      <SuperLockedMenu onAction={onAction}>
        <div data-testid="locked-trigger">Locked Layer</div>
      </SuperLockedMenu>,
    );

    rightClick(screen.getByTestId('locked-trigger'));

    await waitFor(() => {
      expect(screen.getByTestId('superlocked-context-menu')).toBeInTheDocument();
    });
  });

  it('shows only "Off Super Lock" item', async () => {
    const onAction = vi.fn();
    render(
      <SuperLockedMenu onAction={onAction}>
        <div data-testid="locked-trigger">Locked Layer</div>
      </SuperLockedMenu>,
    );

    rightClick(screen.getByTestId('locked-trigger'));

    await waitFor(() => {
      expect(screen.getByText('Off Super Lock')).toBeInTheDocument();
    });
  });
});
