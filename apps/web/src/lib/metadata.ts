import type { Metadata } from "next";

export const BRAND_NAME = "Handsell - Orienta";

export function createPageMetadata(title: string, description = BRAND_NAME): Metadata {
  return {
    title,
    description,
  };
}
