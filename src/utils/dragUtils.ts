import React from 'react';

/**
 * Creates an isolated, clean drag ghost for HTML5 Drag and Drop.
 * This guarantees that Chromium / WebKit will NOT capture neighboring sibling
 * elements or flexbox bleed into the drag preview image.
 */
export const setCustomDragGhost = (e: React.DragEvent) => {
  const currentTarget = e.currentTarget as HTMLElement;
  if (!currentTarget || !e.dataTransfer) return;

  const rect = currentTarget.getBoundingClientRect();
  const ghost = currentTarget.cloneNode(true) as HTMLElement;

  // Remove interactive and hover-only buttons/badges/inputs that shouldn't appear in drag ghost
  ghost.querySelectorAll('button, input, [title*="фото"], [title*="Вернуть"], [title*="Удалить"]').forEach((el) => {
    el.remove();
  });

  // Make sure inner camera or action overlays are removed
  const cameraBadges = ghost.querySelectorAll('.group-hover\\:opacity-100');
  cameraBadges.forEach((el) => el.remove());

  // Isolate the element completely in DOM
  ghost.style.position = 'fixed';
  ghost.style.top = '-9999px';
  ghost.style.left = '-9999px';
  ghost.style.width = `${rect.width}px`;
  ghost.style.height = `${rect.height}px`;
  ghost.style.boxSizing = 'border-box';
  ghost.style.overflow = 'hidden';
  ghost.style.borderRadius = '0.5rem';
  ghost.style.zIndex = '99999';
  ghost.style.pointerEvents = 'none';
  ghost.style.transform = 'none';
  ghost.style.transition = 'none';
  ghost.style.opacity = '0.96';
  ghost.style.boxShadow = '0 12px 28px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.15)';

  document.body.appendChild(ghost);

  // Set drag image centered at cursor
  try {
    e.dataTransfer.setDragImage(ghost, rect.width / 2, rect.height / 2);
  } catch (err) {
    console.warn('Could not set custom drag image', err);
  }

  // Remove offscreen clone on next tick after drag image is rasterized
  setTimeout(() => {
    if (ghost.parentNode) {
      ghost.parentNode.removeChild(ghost);
    }
  }, 0);
};
