/**
 * MindMosaic — Image Block Component
 *
 * Renders images/diagrams from exam media assets.
 * Respects placement (above, inline, below) and accessibility.
 */

import { useState } from "react";
import type { MediaReference } from "../types/exam.types";

interface ImageBlockProps {
  media: MediaReference;
  /** Base URL for media assets. Falls back to Supabase storage if not provided */
  baseUrl?: string;
}

export function ImageBlock({ media, baseUrl }: ImageBlockProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Construct image URL
  // In production, this would be a Supabase storage URL
  const imageUrl = baseUrl
    ? `${baseUrl}/${media.mediaId}`
    : `/api/media/${media.mediaId}`;

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  // Error state
  if (hasError) {
    return (
      <div className="bg-gray-100 rounded-lg p-8 text-center">
        <p className="text-text-muted text-sm">
          ⚠️ Image could not be loaded
        </p>
        {media.altText && (
          <p className="text-text-muted text-xs mt-2">
            Description: {media.altText}
          </p>
        )}
      </div>
    );
  }

  return (
    <figure className="my-4">
      {/* Loading placeholder */}
      {isLoading && (
        <div className="bg-gray-100 rounded-lg animate-pulse h-48 flex items-center justify-center">
          <span className="text-text-muted text-sm">Loading image...</span>
        </div>
      )}

      {/* Image */}
      <img
        src={imageUrl}
        alt={media.altText}
        onLoad={handleLoad}
        onError={handleError}
        className={`
          max-w-full h-auto rounded-lg border border-border-subtle
          ${isLoading ? "hidden" : "block"}
        `}
      />

      {/* Caption */}
      {media.caption && !isLoading && (
        <figcaption className="mt-2 text-sm text-text-muted text-center">
          {media.caption}
        </figcaption>
      )}
    </figure>
  );
}

// =============================================================================
// Media Block Renderer (handles placement)
// =============================================================================

interface MediaBlockRendererProps {
  mediaReferences: MediaReference[] | null;
  placement: "above" | "inline" | "below";
  baseUrl?: string;
}

export function MediaBlockRenderer({
  mediaReferences,
  placement,
  baseUrl,
}: MediaBlockRendererProps) {
  if (!mediaReferences || mediaReferences.length === 0) {
    return null;
  }

  const filteredMedia = mediaReferences.filter((m) => m.placement === placement);

  if (filteredMedia.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {filteredMedia.map((media) => (
        <ImageBlock key={media.mediaId} media={media} baseUrl={baseUrl} />
      ))}
    </div>
  );
}
