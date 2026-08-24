/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {useData, useSettings} from '@/context';
import type {Example} from '@/lib/types';
import {getYouTubeVideoId} from '@/lib/youtube';

interface ExampleGalleryProps {
  selectedExample: Example | null;
  onSelectExample: (example: Example) => void;
}

export default function ExampleGallery({
  selectedExample,
  onSelectExample,
}: ExampleGalleryProps) {
  const {t} = useSettings();
  const {examples} = useData();

  const thumbnailUrl = (url: string) => {
    const id = getYouTubeVideoId(url);
    return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : '';
  };

  return (
    <div className="gallery">
      <h2 className="gallery-title">{t.examples}</h2>
      <div className="gallery-grid">
        {examples.map((example) => (
          <button
            key={example.url}
            className={
              selectedExample?.url === example.url
                ? 'gallery-item selected'
                : 'gallery-item'
            }
            onClick={() => onSelectExample(example)}>
            <span className="thumb-wrap">
              <img
                src={thumbnailUrl(example.url)}
                alt=""
                loading="lazy"
                className="thumb"
              />
            </span>
            <span className="gallery-item-title">{example.title}</span>
          </button>
        ))}
      </div>

      <style>{`
        .gallery-title {
          font-size: 1rem;
          font-weight: 700;
          margin-bottom: 0.6rem;
        }

        .gallery-grid {
          display: grid;
          gap: 0.6rem;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        }

        .gallery-item {
          background: var(--color-surface);
          border: 2px solid transparent;
          border-radius: var(--radius);
          color: var(--color-text);
          display: flex;
          flex-direction: column;
          font-weight: 500;
          overflow: hidden;
          padding: 0;
          text-align: left;
        }

        .gallery-item.selected {
          border-color: var(--color-accent);
        }

        .thumb-wrap {
          display: block;
          padding-top: 56.25%;
          position: relative;
          width: 100%;
        }

        .thumb {
          height: 100%;
          left: 0;
          object-fit: cover;
          position: absolute;
          top: 0;
          width: 100%;
        }

        .gallery-item-title {
          display: block;
          font-size: 0.85rem;
          line-height: 1.35;
          padding: 0.5rem 0.6rem 0.6rem;
        }
      `}</style>
    </div>
  );
}
