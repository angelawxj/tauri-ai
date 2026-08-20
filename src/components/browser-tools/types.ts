export type BrowserElementRect = { x: number; y: number; width: number; height: number };

export type BrowserElementCapture = {
  page: {
    url: string;
    title: string;
    viewportWidth: number;
    viewportHeight: number;
    scrollX: number;
    scrollY: number;
    capturedAt: string;
  };
  target: {
    tagName: string;
    selector: string;
    text: string;
    html: string;
    attributes: Record<string, string>;
    role: string | null;
    accessibleName: string | null;
    rectViewport: BrowserElementRect;
    rectPage: BrowserElementRect;
    styles: Record<string, string>;
  };
  nearbyText: string[];
  ancestorPath: string[];
  screenshot: string | null;
};

import type { BrowserSurface } from "./browser-surface";

export type BrowserToolProps = {
  surfaceRef: React.RefObject<BrowserSurface | null>;
  disabled?: boolean;
};

export type BrowserAnnotation = {
  id: string;
  index: number;
  comment: string;
  intent: "fix" | "change" | "question" | "approve";
  capture: BrowserElementCapture;
};
