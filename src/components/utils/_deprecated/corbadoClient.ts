"use client";

import Corbado from '@corbado/web-js';

let loaded: Promise<any> | null = null;

export async function getCorbado(): Promise<any> {
  if (!loaded) {
    loaded = (Corbado as any).load({ projectId: process.env.NEXT_PUBLIC_CORBADO_PROJECT_ID! } as any);
  }
  return loaded as Promise<any>;
}
