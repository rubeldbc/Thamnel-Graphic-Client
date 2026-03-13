// Node types matching Rust thamnel_core::node serde output.

import type { Size } from './geometry';
import type { Transform } from './transform';
import type { NodeIdentity } from './identity';
import type { BlendMode } from './enums';
import type { LayerEffect, ColorAdjustments } from './LayerEffect';
import type { TextProperties } from './TextProperties';
import type { ShapeProperties } from './ShapeProperties';

// Re-export EffectStack as alias for LayerEffect (same structure, different name).
export type EffectStack = LayerEffect;

// --- NodeBase: common properties shared by all node types ---

export interface NodeBase {
  identity: NodeIdentity;
  transform: Transform;
  size: Size;
  opacity: number;
  visible: boolean;
  locked: boolean;
  superLocked: boolean;
  blendMode: BlendMode;
  flipHorizontal: boolean;
  flipVertical: boolean;
  padding: number;
  effects: EffectStack;
  colorAdjustments: ColorAdjustments;
  cropTop: number;
  cropBottom: number;
  cropLeft: number;
  cropRight: number;
  parentGroupId: string | null;
  depth: number;
  isBackground: boolean;
  renderVersion: number;
}

// --- Type-specific data ---

export interface ImageData {
  imageData: string | null;
  thumbnailData: string | null;
  blurMaskData: number[] | null;
  blurRadius: number;
  isFrameReceiver: boolean;
  isLiveDateTime: boolean;
}

export interface GroupData {
  childIds: string[];
  groupColor: string | null;
  isExpanded: boolean;
}

// --- NodeKind: tagged union for type-specific data ---

export type NodeKind =
  | { type: 'Image' } & ImageData
  | { type: 'Text' } & TextProperties
  | { type: 'Shape' } & ShapeProperties
  | { type: 'Group' } & GroupData;

// --- Node: the main document node ---

export interface Node {
  base: NodeBase;
  kind: NodeKind;
}

// --- Node type discriminator helpers ---

export type NodeType = 'Image' | 'Text' | 'Shape' | 'Group';

export function getNodeType(node: Node): NodeType {
  return node.kind.type;
}

export function isImageNode(node: Node): boolean {
  return node.kind.type === 'Image';
}

export function isTextNode(node: Node): boolean {
  return node.kind.type === 'Text';
}

export function isShapeNode(node: Node): boolean {
  return node.kind.type === 'Shape';
}

export function isGroupNode(node: Node): boolean {
  return node.kind.type === 'Group';
}

export function getImageData(node: Node): ImageData | null {
  if (node.kind.type === 'Image') {
    const { type: _, ...data } = node.kind;
    return data as ImageData;
  }
  return null;
}

export function getTextProperties(node: Node): TextProperties | null {
  if (node.kind.type === 'Text') {
    const { type: _, ...props } = node.kind;
    return props as unknown as TextProperties;
  }
  return null;
}

export function getShapeProperties(node: Node): ShapeProperties | null {
  if (node.kind.type === 'Shape') {
    const { type: _, ...props } = node.kind;
    return props as unknown as ShapeProperties;
  }
  return null;
}

export function getGroupData(node: Node): GroupData | null {
  if (node.kind.type === 'Group') {
    const { type: _, ...data } = node.kind;
    return data as GroupData;
  }
  return null;
}
