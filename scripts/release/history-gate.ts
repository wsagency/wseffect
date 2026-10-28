import { readFile } from 'node:fs/promises'

export async function checkHistoryAudit({ reportPath, ownerApprovedClean }: { reportPath: string; ownerApprovedClean: boolean }): Promise<{ ok: boolean; reason?: string }> {
  let report: string
  try {
    report = await readFile(reportPath, 'utf8')
  } catch {
    return { ok: false, reason: `History audit report is missing or unreadable: ${reportPath}` }
  }
  if (!report.trim()) return { ok: false, reason: `History audit report is empty: ${reportPath}` }
  if (!ownerApprovedClean) return { ok: false, reason: 'History audit requires explicit owner review and approval via --history-audit-reviewed' }
  return { ok: true }
}
