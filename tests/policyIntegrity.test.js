import test from 'node:test'
import assert from 'node:assert/strict'
import { policiesData } from '../src/data/policies.js'
import { products } from '../src/data/products.js'

test('Policy Integrity: Đối chiếu các hằng số vận hành giữa chính sách và mã nguồn', () => {
  const termsText = JSON.stringify(policiesData.terms)
  const shippingText = JSON.stringify(policiesData.shipping)
  const privacyText = JSON.stringify(policiesData.privacy)

  // 1. Ngưỡng Freeship 500.000đ
  assert.ok(
    shippingText.includes('500.000đ'),
    'Chính sách giao hàng phải niêm yết ngưỡng 500.000đ'
  )

  // 2. Phí vận chuyển tiêu chuẩn 30.000đ
  assert.ok(
    shippingText.includes('30.000đ'),
    'Chính sách giao hàng phải niêm yết mức phí vận chuyển 30.000đ'
  )

  // 3. Ưu đãi VietQR 10%
  assert.ok(
    termsText.includes('10%'),
    'Điều khoản dịch vụ phải nêu rõ mức ưu đãi giảm 10% khi chọn VietQR'
  )

  // 4. Thời gian Pre-order 7–10 ngày làm việc (khớp products.js)
  const daybreakPreOrder = products.find((p) => p.id === 'the-classic-set')?.preOrder
  assert.deepEqual(daybreakPreOrder?.leadTimeDays, [7, 10])
  assert.ok(
    termsText.includes('7–10 ngày làm việc') || termsText.includes('7-10 ngày làm việc'),
    'Điều khoản phải nêu thời gian hoàn thiện Pre-order 7–10 ngày làm việc'
  )
  assert.ok(
    shippingText.includes('7–10 ngày làm việc') || shippingText.includes('7-10 ngày làm việc'),
    'Chính sách vận chuyển phải nêu thời gian hoàn thiện Pre-order 7–10 ngày làm việc'
  )

  // 5. Bán kính ship COD 30 km quanh kho Amber Riverside
  assert.ok(
    termsText.includes('30km') || termsText.includes('30 km'),
    'Điều khoản phải giới hạn phạm vi COD bán kính 30km'
  )
  assert.ok(
    shippingText.includes('30km') || shippingText.includes('30 km'),
    'Chính sách vận chuyển phải nêu rõ phạm vi COD bán kính 30km'
  )
})

test('Policy Integrity: Kiểm tra cấm các cụm từ tuyệt đối sai lệch trong Terms và Shipping', () => {
  const termsText = JSON.stringify(policiesData.terms)
  const shippingText = JSON.stringify(policiesData.shipping)

  // Không cam kết "an toàn cho mọi làn da"
  assert.equal(termsText.includes('an toàn cho mọi làn da'), false, 'Không được dùng cam kết tuyệt đối "an toàn cho mọi làn da"')

  // Không cam kết "100% tự nhiên" cho toàn bộ sản phẩm
  assert.equal(termsText.includes('100% tự nhiên'), false, 'Không được khẳng định "100% tự nhiên" cho toàn bộ sản phẩm')

  // Không cam kết COD "mọi đơn hàng trên toàn quốc"
  assert.equal(termsText.includes('đồng kiểm COD) trước khi thanh toán đối với mọi đơn hàng trên toàn quốc'), false)
  assert.equal(shippingText.includes('mọi đơn hàng trên toàn quốc') && shippingText.includes('COD'), false)

  // Không có cam kết 24/7 không có căn cứ
  assert.equal(termsText.includes('24/7'), false, 'Điều khoản không được dùng nhãn 24/7')
  assert.equal(shippingText.includes('24/7'), false, 'Chính sách vận chuyển không được dùng nhãn 24/7')
})

test('Policy Integrity: Bảo toàn nguyên vẹn 100% mục đổi trả (return) theo Luật Thép 2', () => {
  const returnPolicy = policiesData.return
  assert.ok(returnPolicy, 'Mục return phải tồn tại')
  assert.equal(returnPolicy.id, 'return')
  assert.equal(returnPolicy.title, 'Chính Sách Đổi Trả Hàng')
  assert.equal(returnPolicy.subtitle, 'Cam kết chất lượng sản phẩm & quy định đổi trả, hủy đơn minh bạch')
  assert.equal(returnPolicy.lastUpdated, 'Áp dụng cho toàn bộ sản phẩm QuanNguyenS')
  assert.equal(returnPolicy.sections.length, 4)

  // Kiểm tra 4 heading gốc
  assert.equal(returnPolicy.sections[0].heading, '1. Cam kết hài lòng')
  assert.equal(returnPolicy.sections[1].heading, '2. Xin lưu ý về điều kiện bảo hành')
  assert.equal(returnPolicy.sections[2].heading, '3. Thay đổi và Hủy đơn hàng')
  assert.equal(returnPolicy.sections[3].heading, '4. Hàng hóa bị hư hỏng hoặc thiếu ?')

  // Kiểm tra nội dung nguyên văn
  assert.ok(returnPolicy.sections[0].content[2].includes('phí xử lý môi trường 15%'))
  assert.ok(returnPolicy.sections[1].content[0].includes('kết quả đạt được'))
  assert.ok(returnPolicy.sections[2].content[0].includes('1 giờ'))
  assert.ok(returnPolicy.sections[3].content[0].includes('24 giờ'))
})

test('Policy Integrity: Bảo toàn nguyên vẹn Google Limited Use Disclosure theo Luật Thép 6', () => {
  const privacy = policiesData.privacy
  const googleSection = privacy.sections.find((s) => s.heading.includes('Google Limited Use Disclosure'))
  assert.ok(googleSection, 'Mục Google Limited Use Disclosure phải tồn tại')

  const viText = googleSection.content.find((c) => c.includes('Tuyên bố tiếng Việt:'))
  const enText = googleSection.content.find((c) => c.includes('Official English Statement:'))

  assert.ok(viText, 'Phải có tuyên bố tiếng Việt')
  assert.ok(enText, 'Phải có tuyên bố tiếng Anh')

  assert.ok(
    viText.includes(
      'Việc ứng dụng QuanNguyenS sử dụng và chuyển giao thông tin nhận được từ Google APIs cho bất kỳ ứng dụng nào khác sẽ luôn tuân thủ Chính sách dữ liệu người dùng của Dịch vụ Google API (Google API Services User Data Policy), bao gồm cả các yêu cầu về Sử dụng Có giới hạn (Limited Use requirements).'
    ),
    'Tuyên bố tiếng Việt phải nguyên văn 100%'
  )

  assert.ok(
    enText.includes(
      'QuanNguyenS\'s use and transfer to any other app of information received from Google APIs will adhere to the Google API Services User Data Policy, including the Limited Use requirements.'
    ),
    'Tuyên bố tiếng Anh phải nguyên văn 100%'
  )
})

test('Policy Integrity: Kiểm tra ngày hiệu lực và phiên bản hợp lệ', () => {
  for (const key of ['terms', 'privacy', 'shipping']) {
    const policy = policiesData[key]
    assert.ok(policy.effectiveDate, `${key} phải có effectiveDate`)
    assert.match(policy.effectiveDate, /^\d{4}-\d{2}-\d{2}$/, `${key}.effectiveDate phải đúng định dạng YYYY-MM-DD`)
    assert.ok(policy.version, `${key} phải có version`)
    assert.ok(Array.isArray(policy.changelog), `${key}.changelog phải là mảng`)
    assert.ok(policy.changelog.length > 0, `${key}.changelog không được rỗng`)
  }
})
