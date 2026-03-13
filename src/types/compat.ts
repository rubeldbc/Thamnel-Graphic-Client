// Compatibility adapter — bidirectional conversion between old and new types.
// DELETE this file after all components are migrated to Node types.

import type { LayerModel } from './LayerModel';
import { createDefaultLayer } from './LayerModel';
import type { ProjectModel } from './ProjectModel';
import type { Node, NodeBase } from './node';
import type { DocumentModel } from './document-model';
import type { Transform } from './transform';
import type { NodeIdentity } from './identity';
import type { TextProperties } from './TextProperties';
import { createDefaultTextProperties } from './TextProperties';
import type { ShapeProperties } from './ShapeProperties';
import { createDefaultShapeProperties } from './ShapeProperties';

// ---------------------------------------------------------------------------
// Node → LayerModel (for components not yet migrated)
// ---------------------------------------------------------------------------

/** Convert a new Node to the old flat LayerModel shape. */
export function nodeToLegacyLayer(node: Node): LayerModel {
  const { base, kind } = node;
  const { identity, transform, size } = base;

  const layer = createDefaultLayer({
    id: identity.id,
    name: identity.displayName,
    x: transform.position.x,
    y: transform.position.y,
    width: size.width,
    height: size.height,
    rotation: transform.rotation,
    anchorX: transform.anchor.x,
    anchorY: transform.anchor.y,
    opacity: base.opacity,
    visible: base.visible,
    locked: base.locked,
    superLocked: base.superLocked,
    blendMode: base.blendMode,
    flipHorizontal: base.flipHorizontal,
    flipVertical: base.flipVertical,
    padding: base.padding,
    effects: base.effects,
    colorAdjustments: base.colorAdjustments,
    cropTop: base.cropTop,
    cropBottom: base.cropBottom,
    cropLeft: base.cropLeft,
    cropRight: base.cropRight,
    parentGroupId: base.parentGroupId,
    depth: base.depth,
    isBackground: base.isBackground,
    renderVersion: base.renderVersion,
    bindingKey: identity.bindingKey ?? '',
    displayName: identity.displayName,
  });

  switch (kind.type) {
    case 'Image':
      layer.type = 'image';
      layer.imageData = kind.imageData;
      layer.thumbnailData = kind.thumbnailData;
      layer.blurRadius = kind.blurRadius;
      layer.isFrameReceiver = kind.isFrameReceiver;
      layer.isLiveDateTime = kind.isLiveDateTime;
      // blurMaskData: Uint8Array conversion
      layer.blurMaskData = kind.blurMaskData
        ? new Uint8Array(kind.blurMaskData)
        : null;
      break;
    case 'Text':
      layer.type = 'text';
      // Extract TextProperties from the kind (exclude 'type' discriminator)
      {
        const { type: _, ...textProps } = kind;
        layer.textProperties = textProps as unknown as TextProperties;
      }
      break;
    case 'Shape':
      layer.type = 'shape';
      {
        const { type: _, ...shapeProps } = kind;
        layer.shapeProperties = shapeProps as unknown as ShapeProperties;
      }
      break;
    case 'Group':
      layer.type = 'group';
      layer.childIds = kind.childIds;
      layer.groupColor = kind.groupColor;
      layer.isExpanded = kind.isExpanded;
      break;
  }

  return layer;
}

// ---------------------------------------------------------------------------
// LayerModel → Node (for loading old .rbl files)
// ---------------------------------------------------------------------------

/** Convert an old flat LayerModel to the new Node structure. */
export function legacyLayerToNode(layer: LayerModel): Node {
  const identity: NodeIdentity = {
    id: layer.id,
    bindingKey: layer.bindingKey || null,
    displayName: layer.name,
  };

  const transform: Transform = {
    anchor: { x: layer.anchorX, y: layer.anchorY },
    position: { x: layer.x, y: layer.y },
    scale: { x: 1, y: 1 },
    rotation: layer.rotation,
    skew: { x: 0, y: 0 },
  };

  const base: NodeBase = {
    identity,
    transform,
    size: { width: layer.width, height: layer.height },
    opacity: layer.opacity,
    visible: layer.visible,
    locked: layer.locked,
    superLocked: layer.superLocked,
    blendMode: layer.blendMode,
    flipHorizontal: layer.flipHorizontal,
    flipVertical: layer.flipVertical,
    padding: layer.padding,
    effects: layer.effects,
    colorAdjustments: layer.colorAdjustments,
    cropTop: layer.cropTop,
    cropBottom: layer.cropBottom,
    cropLeft: layer.cropLeft,
    cropRight: layer.cropRight,
    parentGroupId: layer.parentGroupId,
    depth: layer.depth,
    isBackground: layer.isBackground,
    renderVersion: layer.renderVersion,
  };

  switch (layer.type) {
    case 'text':
      return {
        base,
        kind: {
          type: 'Text',
          ...(layer.textProperties ?? createDefaultTextProperties()),
        },
      };
    case 'shape':
      return {
        base,
        kind: {
          type: 'Shape',
          ...(layer.shapeProperties ?? createDefaultShapeProperties()),
        },
      };
    case 'group':
      return {
        base,
        kind: {
          type: 'Group',
          childIds: layer.childIds,
          groupColor: layer.groupColor,
          isExpanded: layer.isExpanded,
        },
      };
    default:
      // image (default)
      return {
        base,
        kind: {
          type: 'Image',
          imageData: layer.imageData,
          thumbnailData: layer.thumbnailData,
          blurMaskData: layer.blurMaskData
            ? Array.from(layer.blurMaskData)
            : null,
          blurRadius: layer.blurRadius,
          isFrameReceiver: layer.isFrameReceiver,
          isLiveDateTime: layer.isLiveDateTime,
        },
      };
  }
}

// ---------------------------------------------------------------------------
// DocumentModel → ProjectModel
// ---------------------------------------------------------------------------

/** Convert a new DocumentModel to the old ProjectModel shape. */
export function documentToLegacyProject(doc: DocumentModel): ProjectModel {
  return {
    projectId: doc.id,
    version: doc.version,
    canvasWidth: doc.canvasSize.width,
    canvasHeight: doc.canvasSize.height,
    backgroundColor: doc.backgroundColor,
    layers: doc.nodes.map(nodeToLegacyLayer),
    videoPaths: doc.videoPaths,
    timestamps: Object.fromEntries(doc.timestamps),
    metadata: {
      name: doc.metadata.name,
      author: doc.metadata.author,
      createdAt: doc.metadata.createdAt,
      modifiedAt: doc.metadata.modifiedAt,
      description: doc.metadata.description,
    },
  };
}

// ---------------------------------------------------------------------------
// ProjectModel → DocumentModel
// ---------------------------------------------------------------------------

/** Convert an old ProjectModel to the new DocumentModel structure. */
export function legacyProjectToDocument(project: ProjectModel): DocumentModel {
  return {
    id: project.projectId,
    version: project.version,
    canvasSize: {
      width: project.canvasWidth,
      height: project.canvasHeight,
    },
    backgroundColor: project.backgroundColor,
    nodes: project.layers.map(legacyLayerToNode),
    videoPaths: project.videoPaths,
    timestamps: Object.entries(project.timestamps),
    metadata: {
      name: project.metadata.name,
      author: project.metadata.author,
      createdAt: project.metadata.createdAt,
      modifiedAt: project.metadata.modifiedAt,
      description: project.metadata.description,
    },
  };
}
