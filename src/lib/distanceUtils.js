// src/lib/distanceUtils.js
// Bộ công cụ tính toán khoảng cách và nhận diện điều kiện Ship COD (Bán kính 30km từ Amber Riverside)

export const SHOP_ORIGIN = {
  name: 'Amber Riverside',
  address: 'Amber Riverside, 622 Minh Khai, Vĩnh Tuy, Hai Bà Trưng, Hà Nội',
  lat: 20.998436,
  lng: 105.868725,
  maxCodRadiusKm: 30,
}

// Bán kính / tọa độ trọng tâm của các quận huyện tại Hà Nội so với Amber Riverside (622 Minh Khai)
// Tọa độ và cự ly đường bộ ước tính (km)
export const HANOI_DISTRICTS_DISTANCE = {
  // ── Các quận nội thành (Cực gần <= 15km) ──
  'hai bà trưng': { dist: 2.5, lat: 21.0069, lng: 105.8524 },
  'hoàng mai':     { dist: 4.0, lat: 20.9765, lng: 105.8562 },
  'hoàn kiếm':     { dist: 4.5, lat: 21.0285, lng: 105.8542 },
  'đống đa':       { dist: 5.5, lat: 21.0181, lng: 105.8288 },
  'long biên':     { dist: 6.5, lat: 21.0368, lng: 105.8926 },
  'ba đình':       { dist: 7.5, lat: 21.0341, lng: 105.8242 },
  'thanh xuân':    { dist: 7.5, lat: 20.9937, lng: 105.8116 },
  'tây hồ':        { dist: 9.5, lat: 21.0682, lng: 105.8248 },
  'cầu giấy':      { dist: 10.5, lat: 21.0362, lng: 105.7906 },
  'thanh trì':     { dist: 9.0, lat: 20.9421, lng: 105.8456 },
  'gia lâm':       { dist: 9.5, lat: 21.0195, lng: 105.9388 },
  'hà đông':       { dist: 14.5, lat: 20.9632, lng: 105.7654 },
  'nam từ liêm':   { dist: 14.0, lat: 21.0163, lng: 105.7538 },
  'bắc từ liêm':   { dist: 15.5, lat: 21.0664, lng: 105.7547 },

  // ── Các huyện ven đô (Trong bán kính 18km - 28km <= 30km) ──
  'hoài đức':      { dist: 21.0, lat: 21.0245, lng: 105.6985 },
  'đông anh':      { dist: 20.0, lat: 21.1378, lng: 105.8456 },
  'đan phượng':    { dist: 24.5, lat: 21.0968, lng: 105.6685 },
  'thường tín':    { dist: 21.5, lat: 20.8654, lng: 105.8642 },
  'thanh oai':     { dist: 23.0, lat: 20.8845, lng: 105.7765 },

  // ── Huyện ranh giới 28km - 33km (Cần kiểm tra kỹ theo xã) ──
  'quốc oai':      { dist: 29.5, lat: 20.9854, lng: 105.6321 },
  'chương mỹ':     { dist: 29.0, lat: 20.8845, lng: 105.6985 },
  'mê linh':       { dist: 32.5, lat: 21.1765, lng: 105.7185 },
  'sóc sơn':       { dist: 36.5, lat: 21.2645, lng: 105.8465 },
  'thạch thất':    { dist: 35.0, lat: 21.0125, lng: 105.5465 },
  'phúc thọ':      { dist: 38.0, lat: 21.1125, lng: 105.5465 },

  // ── Các huyện ngoại thành xa (> 35km - 70km: VƯỢT QUÁ BÁN KÍNH 30KM) ──
  'phú xuyên':     { dist: 38.5, lat: 20.7325, lng: 105.8965 },
  'sơn tây':       { dist: 48.0, lat: 21.1345, lng: 105.5025 },
  'thị xã sơn tây':{ dist: 48.0, lat: 21.1345, lng: 105.5025 },
  'ứng hòa':       { dist: 46.0, lat: 20.7525, lng: 105.7925 },
  'mỹ đức':        { dist: 55.0, lat: 20.6525, lng: 105.7525 },
  'ba vì':         { dist: 65.0, lat: 21.1825, lng: 105.3525 },
}

// Các huyện lân cận thuộc Hưng Yên & Bắc Ninh gần kho Amber Riverside (Minh Khai / Vĩnh Tuy)
export const NEARBY_PROVINCES_SUBDISTRICTS = {
  // Hưng Yên
  'văn giang':  { dist: 13.5, lat: 20.9325, lng: 105.9525, allowed: true }, // Ecopark, Phụng Công...
  'văn lâm':    { dist: 19.5, lat: 20.9765, lng: 106.0125, allowed: true },
  'yên mỹ':     { dist: 28.5, lat: 20.8925, lng: 106.0125, allowed: true },
  'khoái châu': { dist: 33.0, lat: 20.8225, lng: 105.9825, allowed: false },
  // Bắc Ninh
  'từ sơn':     { dist: 21.5, lat: 21.1165, lng: 105.9625, allowed: true },
  'tiên du':    { dist: 29.0, lat: 21.1325, lng: 106.0325, allowed: true },
  'tp bắc ninh':{ dist: 35.0, lat: 21.1825, lng: 106.0725, allowed: false },
}

// Tính khoảng cách Haversine đường thẳng giữa 2 tọa độ (km)
export function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371 // Bán kính Trái Đất (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  // Hệ số uốn lượn đường bộ (road curvature factor) ~1.28
  return Math.round(R * c * 1.28 * 10) / 10
}

/**
 * Phân tích địa chỉ và tính toán khoảng cách so với Amber Riverside
 * @param {Object} param0 { address, ward, district, city }
 * @returns {Object} { distanceKm, isCodAllowed, message, provider }
 */
export function evaluateCodEligibility({ address = '', ward = '', district = '', city = 'Hà Nội' }) {
  const normCity = String(city || '').trim().toLowerCase()
  const normDistrict = String(district || '').trim().toLowerCase()
  const normWard = String(ward || '').trim().toLowerCase()
  const normAddress = String(address || '').trim().toLowerCase()
  const fullText = `${normAddress} ${normWard} ${normDistrict} ${normCity}`

  // 1. Nhận diện các địa danh xa > 30km kể cả khi chưa chọn dropdown city
  const isFarProvince =
    fullText.includes('hồ chí minh') || fullText.includes('sài gòn') || fullText.includes('tphcm') || fullText.includes('tp.hcm') ||
    fullText.includes('quận 1') || fullText.includes('bến nghé') || fullText.includes('quận 2') || fullText.includes('quận 3') ||
    fullText.includes('quận 7') || fullText.includes('bình thạnh') || fullText.includes('thủ đức') ||
    fullText.includes('đà nẵng') || fullText.includes('da nang') || fullText.includes('cần thơ') ||
    fullText.includes('bình dương') || fullText.includes('đồng nai') || fullText.includes('huế') ||
    fullText.includes('nha trang') || fullText.includes('vũng tàu') || fullText.includes('hải phòng') ||
    fullText.includes('quảng ninh') || fullText.includes('thanh hóa') || fullText.includes('nghệ an') ||
    fullText.includes('nam định') || fullText.includes('thái bình') || fullText.includes('lâm đồng') ||
    fullText.includes('đà lạt')

  const isHanoi = !isFarProvince && (normCity.includes('hà nội') || normCity.includes('ha noi') || fullText.includes('hà nội') || fullText.includes('ha noi'))
  const isHungYen = !isFarProvince && (normCity.includes('hưng yên') || normCity.includes('hung yen') || fullText.includes('hưng yên'))
  const isBacNinh = !isFarProvince && (normCity.includes('bắc ninh') || normCity.includes('bac ninh') || fullText.includes('bắc ninh'))

  if (isFarProvince || (!isHanoi && !isHungYen && !isBacNinh)) {
    // Ước tính khoảng cách các tỉnh xa
    let approxKm = 100
    if (normCity.includes('hải phòng') || normCity.includes('hải dương') || normCity.includes('nam định')) approxKm = 85
    else if (normCity.includes('đà nẵng') || normCity.includes('huế')) approxKm = 750
    else if (normCity.includes('hồ chí minh') || normCity.includes('sài gòn') || normCity.includes('bình dương')) approxKm = 1680
    else approxKm = 120

    return {
      distanceKm: approxKm,
      isCodAllowed: false,
      maxCodRadiusKm: SHOP_ORIGIN.maxCodRadiusKm,
      origin: SHOP_ORIGIN.address,
      destination: `${address ? address + ', ' : ''}${ward ? ward + ', ' : ''}${district ? district + ', ' : ''}${city}`,
      message: `Địa chỉ cách kho hàng ~${approxKm}km (vượt quá bán kính 30km hỗ trợ Ship COD). Vui lòng thanh toán chuyển khoản VietQR để nhận ưu đãi giảm 10%.`,
      method: 'rule_province_geo',
    }
  }

  // 2. Tỉnh Hưng Yên & Bắc Ninh (Chỉ chấp nhận các huyện giáp ranh cụ thể)
  if (isHungYen || isBacNinh) {
    for (const [key, data] of Object.entries(NEARBY_PROVINCES_SUBDISTRICTS)) {
      if (fullText.includes(key)) {
        const isAllowed = data.dist <= SHOP_ORIGIN.maxCodRadiusKm
        return {
          distanceKm: data.dist,
          isCodAllowed: isAllowed,
          maxCodRadiusKm: SHOP_ORIGIN.maxCodRadiusKm,
          origin: SHOP_ORIGIN.address,
          destination: `${address ? address + ', ' : ''}${ward ? ward + ', ' : ''}${district ? district + ', ' : ''}${city}`,
          message: isAllowed
            ? `Địa chỉ trong bán kính ~${data.dist}km từ Amber Riverside (Đủ điều kiện Ship COD).`
            : `Địa chỉ cách kho hàng ~${data.dist}km (vượt quá bán kính 30km hỗ trợ Ship COD). Vui lòng thanh toán qua VietQR.`,
          method: 'nearby_province_district',
        }
      }
    }
    // Không nhận diện được huyện giáp ranh cụ thể của Hưng Yên / Bắc Ninh -> Mặc định trung tâm tỉnh ~45km
    return {
      distanceKm: 45.0,
      isCodAllowed: false,
      maxCodRadiusKm: SHOP_ORIGIN.maxCodRadiusKm,
      origin: SHOP_ORIGIN.address,
      destination: `${address ? address + ', ' : ''}${ward ? ward + ', ' : ''}${district ? district + ', ' : ''}${city}`,
      message: `Địa chỉ cách kho hàng ~45km (vượt quá bán kính 30km hỗ trợ Ship COD). Vui lòng thanh toán qua VietQR.`,
      method: 'nearby_province_default',
    }
  }

  // 3. Hà Nội: Nhận diện theo 30 Quận / Huyện
  // Tìm quận huyện phù hợp
  let matchedDistrictKey = null
  for (const districtKey of Object.keys(HANOI_DISTRICTS_DISTANCE)) {
    if (normDistrict.includes(districtKey) || fullText.includes(districtKey)) {
      matchedDistrictKey = districtKey
      break
    }
  }

  if (matchedDistrictKey) {
    const distInfo = HANOI_DISTRICTS_DISTANCE[matchedDistrictKey]
    let estimatedDist = distInfo.dist

    // Tinh chỉnh theo phường xã nếu ở các huyện ranh giới
    if (matchedDistrictKey === 'quốc oai' || matchedDistrictKey === 'chương mỹ') {
      if (normWard.includes('xuân mai') || normWard.includes('miếu môn')) {
        estimatedDist = 34.0 // Vượt 30km
      }
    }

    const isAllowed = estimatedDist <= SHOP_ORIGIN.maxCodRadiusKm
    return {
      distanceKm: estimatedDist,
      isCodAllowed: isAllowed,
      maxCodRadiusKm: SHOP_ORIGIN.maxCodRadiusKm,
      origin: SHOP_ORIGIN.address,
      destination: `${address ? address + ', ' : ''}${ward ? ward + ', ' : ''}${district ? district + ', ' : ''}${city}`,
      message: isAllowed
        ? `Địa chỉ cách Amber Riverside ~${estimatedDist}km (Đủ điều kiện Ship COD).`
        : `Địa chỉ cách kho hàng ~${estimatedDist}km (vượt quá bán kính 30km hỗ trợ Ship COD). Vui lòng thanh toán qua VietQR (giảm 10%).`,
      method: 'hanoi_district_resolver',
    }
  }

  // Nếu khách chưa nhập cụ thể quận huyện tại Hà Nội -> Mặc định trung tâm Hà Nội (~5km)
  if (!normDistrict || normDistrict.length < 2) {
    return {
      distanceKm: 4.5,
      isCodAllowed: true,
      maxCodRadiusKm: SHOP_ORIGIN.maxCodRadiusKm,
      origin: SHOP_ORIGIN.address,
      destination: city,
      message: 'Vui lòng nhập quận/huyện để kiểm tra cự ly chính xác.',
      method: 'hanoi_city_center',
    }
  }

  // Mặc định nội thành Hà Nội nếu quận không khớp
  return {
    distanceKm: 8.5,
    isCodAllowed: true,
    maxCodRadiusKm: SHOP_ORIGIN.maxCodRadiusKm,
    origin: SHOP_ORIGIN.address,
    destination: `${district}, ${city}`,
    message: 'Địa chỉ trong phạm vi nội thành Hà Nội (Hỗ trợ Ship COD).',
    method: 'hanoi_fallback',
  }
}
