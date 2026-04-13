import { fileURLToPath } from 'node:url'

import type { NextConfig } from 'next'

async function createNextConfig(): Promise<NextConfig> {
  const { createJiti } = await import('jiti')
  const jiti = createJiti(fileURLToPath(import.meta.url))

  await jiti.import('./src/env')

  return {
    allowedDevOrigins: ['arrived-roller-said-discovery.trycloudflare.com'],
    reactStrictMode: true,
  }
}

const NextApp = async () => createNextConfig()

export default NextApp
