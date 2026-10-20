import { getRequestHeader, getRequestIP, type H3Event } from 'h3'
import { useRuntimeConfig } from '#imports'

// Client headers are only trusted when configured: anyone can send X-Forwarded-For.
export function getClientIP(event: H3Event): string {
  const { ipHeader, trustProxy } = useRuntimeConfig().maintenanceMode as { ipHeader?: string, trustProxy?: boolean }
  const fromHeader = ipHeader ? getRequestHeader(event, ipHeader)?.split(',')[0]?.trim() : ''
  return fromHeader || getRequestIP(event, { xForwardedFor: !!trustProxy }) || 'unknown'
}

export function isAllowedIP(event: H3Event): boolean {
  const { allowedIPs } = useRuntimeConfig().public.maintenanceMode as { allowedIPs?: string[] }
  return !!allowedIPs?.length && allowedIPs.includes(getClientIP(event))
}
