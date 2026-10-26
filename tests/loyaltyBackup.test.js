import { test, describe, before } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Database from 'better-sqlite3'
import { performDatabaseBackup } from '../server/lib/backupService.js'
import { initLoyaltySchema, createMember, getLoyaltyDb } from '../server/lib/loyalty/loyaltyDb.js'
import { getDb } from '../server/lib/accountDb.js'
import { recordLedgerEntry, getMemberPointsBalance } from '../server/lib/loyalty/ledger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe('Loyalty Backup & Recovery Integrity Test', () => {
  let testMemberId

  before(() => {
    initLoyaltySchema()
    const testPhone = '098' + Math.floor(1000000 + Math.random() * 9000000)
    const member = createMember({
      phone: testPhone,
      fullName: 'Nguyễn Backup Test',
      email: `backup_${Date.now()}@example.com`,
      tier: 'GOLD',
    })
    testMemberId = member.id

    recordLedgerEntry({
      memberId: testMemberId,
      type: 'EARN',
      pointsDelta: 50,
      spendDelta: 5000000,
      idempotencyKey: `earn:backup_test_${Date.now()}`,
      reason: 'Đơn hàng thử nghiệm sao lưu',
    })
  })

  test('Sao lưu accounts.db giữ nguyên trọn vẹn dữ liệu loyalty_members và loyalty_ledger', async () => {
    const backupResult = await performDatabaseBackup()
    assert.equal(backupResult.accountsDb, true, 'Sao lưu accounts.db phải thành công')

    const backupDir = path.resolve(__dirname, '../server/data/backups')
    assert.ok(fs.existsSync(backupDir), 'Thư mục backup phải tồn tại')

    const backupFiles = fs.readdirSync(backupDir).filter((f) => f.startsWith('accounts_') && f.endsWith('.db'))
    assert.ok(backupFiles.length > 0, 'Phải có ít nhất 1 file backup accounts_*.db')

    // Mở file backup mới nhất để kiểm chứng dữ liệu độc lập
    const latestBackup = backupFiles.sort().reverse()[0]
    const backupDbPath = path.resolve(backupDir, latestBackup)
    const backupDb = new Database(backupDbPath, { readonly: true })

    try {
      // 1. Kiểm tra tồn tại các bảng loyalty
      const tables = backupDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'loyalty_%'").all()
      const tableNames = tables.map((t) => t.name)
      assert.ok(tableNames.includes('loyalty_members'), 'Bảng loyalty_members phải có trong bản sao lưu')
      assert.ok(tableNames.includes('loyalty_ledger'), 'Bảng loyalty_ledger phải có trong bản sao lưu')

      // 2. Kiểm tra dữ liệu hội viên trong bản backup
      const memberInBackup = backupDb.prepare('SELECT * FROM loyalty_members WHERE id = ?').get(testMemberId)
      assert.ok(memberInBackup, 'Hội viên phải tồn tại trong bản sao lưu')
      assert.equal(memberInBackup.full_name, 'Nguyễn Backup Test')
      assert.equal(memberInBackup.tier, 'GOLD')

      // 3. Kiểm tra sổ cái và số dư điểm trong bản backup
      const ledgerInBackup = backupDb.prepare('SELECT * FROM loyalty_ledger WHERE member_id = ?').all(testMemberId)
      assert.ok(ledgerInBackup.length >= 1, 'Bản ghi sổ cái phải tồn tại trong bản sao lưu')
      assert.equal(ledgerInBackup[0].points_delta, 50)
    } finally {
      backupDb.close()
    }
  })
})
