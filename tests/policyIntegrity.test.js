import test from 'node:test'
import assert from 'node:assert/strict'
import { policiesData } from '../src/data/policies.js'
import { products } from '../src/data/products.js'

test('Policy Integrity: Đối chiếu các hằng số vận hành giữa chính sách và mã nguồn', () => {
  const shippingText = JSON.stringify(policiesData.shipping)
  const privacyText = JSON.stringify(policiesData.privacy)

  // 0. Mục terms đã được loại bỏ hoàn toàn
  assert.equal(policiesData.terms, undefined, 'Mục Điều khoản dịch vụ (terms) phải được loại bỏ hoàn toàn')

  // 1. Thời gian nhận hàng 2-4 ngày toàn quốc
  assert.ok(
    shippingText.includes('2-4 ngày'),
    'Chính sách giao hàng phải nêu thời gian nhận hàng trung bình 2-4 ngày'
  )
  assert.ok(
    shippingText.includes('toàn quốc'),
    'Chính sách giao hàng phải áp dụng toàn quốc'
  )

  // 2. Thời gian gửi hàng trong vòng 24h
  assert.ok(
    shippingText.includes('24h'),
    'Chính sách giao hàng phải nêu thời gian gửi hàng trong vòng 24h'
  )

  // 3. Số điện thoại hotline
  assert.ok(
    shippingText.includes('0981753082'),
    'Chính sách giao hàng phải có hotline 0981753082'
  )
})

test('Policy Integrity: Kiểm tra cấm các cụm từ tuyệt đối sai lệch trong Shipping', () => {
  const shippingText = JSON.stringify(policiesData.shipping)

  // Không có cam kết 24/7 không có căn cứ
  assert.equal(shippingText.includes('24/7'), false, 'Chính sách vận chuyển không được dùng nhãn 24/7')
})

test('Policy Integrity: Kiểm tra tính toàn vẹn của mục trả hàng (return)', () => {
  const returnPolicy = policiesData.return
  assert.ok(returnPolicy, 'Mục return phải tồn tại')
  assert.equal(returnPolicy.id, 'return')
  assert.equal(returnPolicy.title, 'Chính Sách Trả Hàng')
  assert.ok(returnPolicy.sections.length >= 4)

  // Kiểm tra các heading chính
  assert.equal(returnPolicy.sections[0].heading, '1. Địa điểm áp dụng')
  assert.equal(returnPolicy.sections[1].heading, '2. Điều kiện trả hàng')
  assert.equal(returnPolicy.sections[2].heading, '3. Quy định trả hàng')
  assert.equal(returnPolicy.sections[3].heading, '4. Quy trình trả hàng')

  // Kiểm tra các nội dung cốt lõi
  const fullContent = JSON.stringify(returnPolicy.sections)
  assert.ok(fullContent.includes('05 ngày'))
  assert.ok(fullContent.includes('Tiktokshop'))
  assert.ok(fullContent.includes('03 ngày'))
  assert.ok(fullContent.includes('02 ngày'))
  assert.ok(fullContent.includes('Giftcard/Voucher'))
})

test('Policy Integrity: Kiểm tra mục Google Limited Use Disclosure đã được loại bỏ theo yêu cầu', () => {
  const privacy = policiesData.privacy
  const googleSection = privacy.sections.find((s) => s.heading.includes('Google Limited Use Disclosure'))
  assert.equal(googleSection, undefined, 'Mục Google Limited Use Disclosure phải không còn tồn tại')
})

test('Policy Integrity: Kiểm tra ngày hiệu lực và phiên bản hợp lệ', () => {
  for (const key of ['privacy', 'loyalty']) {
    const policy = policiesData[key]
    assert.ok(policy.effectiveDate, `${key} phải có effectiveDate`)
    assert.match(policy.effectiveDate, /^\d{4}-\d{2}-\d{2}$/, `${key}.effectiveDate phải đúng định dạng YYYY-MM-DD`)
    assert.ok(policy.version, `${key} phải có version`)
    assert.ok(Array.isArray(policy.changelog), `${key}.changelog phải là mảng`)
    assert.ok(policy.changelog.length > 0, `${key}.changelog không được rỗng`)
  }
})
