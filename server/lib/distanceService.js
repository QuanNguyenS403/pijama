// server/lib/distanceService.js
// Dịch vụ tính toán khoảng cách địa chỉ và kiểm tra điều kiện Ship COD (Google Maps API + Fallback Thông Minh)

export const SHOP_ORIGIN = {
  name: 'Amber Riverside',
  address: 'Amber Riverside, 622 Minh Khai, Vĩnh Tuy, Hai Bà Trưng, Hà Nội',
  lat: 20.998436,
  lng: 105.868725,
  maxCodRadiusKm: 30,
}

// Bán kính / cự ly đường bộ chuẩn của các quận huyện tại Hà Nội so với Amber Riverside
const HANOI_DISTRICTS = {
  'hai bà trưng': 2.5,
  'hoàng mai':     4.0,
  'hoàn kiếm':     4.5,
  'đống đa':       5.5,
  'long biên':     6.5,
  'ba đình':       7.5,
  'thanh xuân':    7.5,
  'tây hồ':        9.5,
  'cầu giấy':      10.5,
  'thanh trì':     9.0,
  'gia lâm':       9.5,
  'hà đông':       14.5,
  'nam từ liêm':   14.0,
  'bắc từ liêm':   15.5,
  'hoài đức':      21.0,
  'đông anh':      20.0,
  'đan phượng':    24.5,
  'thường tín':    21.5,
  'thanh oai':     23.0,
  'quốc oai':      29.5,
  'chương mỹ':     29.0,
  'mê linh':       32.5,  // > 30km
  'sóc sơn':       36.5,  // > 30km
  'thạch thất':    35.0,  // > 30km
  'phúc thọ':      38.0,  // > 30km
  'phú xuyên':     38.5,  // > 30km
  'sơn tây':       48.0,  // > 30km
  'thị xã sơn tây':48.0,  // > 30km
  'ứng hòa':       46.0,  // > 30km
  'mỹ đức':        55.0,  // > 30km
  'ba vì':         65.0,  // > 30km
}

const NEARBY_COMMUNES = {
  'văn giang': 13.5,
  'văn lâm':   19.5,
  'yên mỹ':    28.5,
  'khoái châu':33.0,
  'từ sơn':    21.5,
  'tiên du':   29.0,
}

/**
 * Gọi Google Maps Distance Matrix API
 */
async function fetchGoogleMapsDistance(origin, destination, apiKey) {
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(
    origin
  )}&destinations=${encodeURIComponent(destination)}&units=metric&language=vi&key=${apiKey}`

  const response = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!response.ok) {
    throw new Error(`Google Maps API HTTP ${response.status}`)
  }

  const data = await response.json()
  if (data.status !== 'OK') {
    throw new Error(`Google Maps API error status: ${data.status} - ${data.error_message || ''}`)
  }

  const element = data.rows?.[0]?.elements?.[0]
  if (!element || element.status !== 'OK') {
    throw new Error(`Google Maps route status: ${element?.status || 'NO_ROUTE'}`)
  }

  // Distance in meters
  const meters = element.distance.value
  const km = Math.round((meters / 1000) * 10) / 10
  return km
}

/**
 * Tính toán khoảng cách và kiểm tra điều kiện COD
 */
export async function calculateShippingDistance({ address = '', ward = '', district = '', city = 'Hà Nội' }) {
  const cleanAddress = [address, ward, district, city].filter(Boolean).map((s) => String(s).trim()).join(', ')
  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAP_API_KEY ||
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    ''

  // 1. Thử gọi Google Maps API nếu có API Key
  if (apiKey && apiKey.length > 10 && cleanAddress.length > 5) {
    try {
      const distanceKm = await fetchGoogleMapsDistance(SHOP_ORIGIN.address, cleanAddress, apiKey)
      const isCodAllowed = distanceKm <= SHOP_ORIGIN.maxCodRadiusKm

      return {
        success: true,
        provider: 'google_maps_api',
        origin: SHOP_ORIGIN.address,
        destination: cleanAddress,
        distanceKm,
        isCodAllowed,
        maxCodRadiusKm: SHOP_ORIGIN.maxCodRadiusKm,
        message: isCodAllowed
          ? `Khoảng cách ${distanceKm}km (Google Maps) — Đủ điều kiện thanh toán Ship COD.`
          : `Khoảng cách ${distanceKm}km (Google Maps) — Vượt quá bán kính 30km hỗ trợ Ship COD. Vui lòng thanh toán VietQR.`,
      }
    } catch (err) {
      console.warn('⚠️ Google Maps API error (falling back to built-in geo resolver):', err.message)
    }
  }

  // 2. Thuật toán phân tích tọa độ & cự ly dự phòng chuẩn xác (Built-in Intelligent Resolver)
  const normCity = String(city || '').toLowerCase()
  const normDistrict = String(district || '').toLowerCase()
  const normWard = String(ward || '').toLowerCase()
  const fullText = `${cleanAddress} ${normCity} ${normDistrict} ${normWard}`.toLowerCase()

  // Nhận diện chuẩn xác các địa danh/tỉnh thành xa > 30km
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

  // Trường hợp tỉnh xa (> 30km chắc chắn)
  if (isFarProvince || (!isHanoi && !isHungYen && !isBacNinh)) {
    let approxKm = 100
    if (fullText.includes('hồ chí minh') || fullText.includes('sài gòn') || fullText.includes('tphcm') || fullText.includes('tp.hcm') || fullText.includes('bến nghé')) approxKm = 1680
    else if (fullText.includes('đà nẵng') || fullText.includes('da nang') || fullText.includes('huế')) approxKm = 750
    else if (fullText.includes('hải phòng') || fullText.includes('hải dương') || fullText.includes('nam định')) approxKm = 85

    return {
      success: true,
      provider: 'intelligent_geo_resolver',
      origin: SHOP_ORIGIN.address,
      destination: cleanAddress,
      distanceKm: approxKm,
      isCodAllowed: false,
      maxCodRadiusKm: SHOP_ORIGIN.maxCodRadiusKm,
      message: `Địa chỉ cách Amber Riverside ~${approxKm}km (vượt quá bán kính 30km hỗ trợ Ship COD). Vui lòng thanh toán chuyển khoản VietQR (nhận ưu đãi giảm 10%).`,
    }
  }

  // Trường hợp Hưng Yên / Bắc Ninh
  if (isHungYen || isBacNinh) {
    for (const [key, dist] of Object.entries(NEARBY_COMMUNES)) {
      if (fullText.includes(key)) {
        const isAllowed = dist <= SHOP_ORIGIN.maxCodRadiusKm
        return {
          success: true,
          provider: 'intelligent_geo_resolver',
          origin: SHOP_ORIGIN.address,
          destination: cleanAddress,
          distanceKm: dist,
          isCodAllowed: isAllowed,
          maxCodRadiusKm: SHOP_ORIGIN.maxCodRadiusKm,
          message: isAllowed
            ? `Địa chỉ cách kho ~${dist}km — Đủ điều kiện Ship COD.`
            : `Địa chỉ cách kho ~${dist}km — Vượt quá 30km hỗ trợ Ship COD. Vui lòng thanh toán VietQR.`,
        }
      }
    }
    return {
      success: true,
      provider: 'intelligent_geo_resolver',
      origin: SHOP_ORIGIN.address,
      destination: cleanAddress,
      distanceKm: 45.0,
      isCodAllowed: false,
      maxCodRadiusKm: SHOP_ORIGIN.maxCodRadiusKm,
      message: `Địa chỉ cách kho ~45km (vượt quá bán kính 30km). Vui lòng chọn thanh toán VietQR.`,
    }
  }

  // Trường hợp Hà Nội
  for (const [districtKey, dist] of Object.entries(HANOI_DISTRICTS)) {
    if (normDistrict.includes(districtKey) || fullText.includes(districtKey)) {
      let finalDist = dist
      if ((districtKey === 'quốc oai' || districtKey === 'chương mỹ') && (normWard.includes('xuân mai') || normWard.includes('miếu môn'))) {
        finalDist = 34.0
      }
      const isAllowed = finalDist <= SHOP_ORIGIN.maxCodRadiusKm
      return {
        success: true,
        provider: 'intelligent_geo_resolver',
        origin: SHOP_ORIGIN.address,
        destination: cleanAddress,
        distanceKm: finalDist,
        isCodAllowed: isAllowed,
        maxCodRadiusKm: SHOP_ORIGIN.maxCodRadiusKm,
        message: isAllowed
          ? `Địa chỉ cách Amber Riverside ~${finalDist}km — Đủ điều kiện Ship COD.`
          : `Địa chỉ cách kho ~${finalDist}km (vượt quá bán kính 30km hỗ trợ Ship COD). Vui lòng thanh toán VietQR.`,
      }
    }
  }

  // Fallback mặc định nội thành Hà Nội
  return {
    success: true,
    provider: 'intelligent_geo_resolver',
    origin: SHOP_ORIGIN.address,
    destination: cleanAddress,
    distanceKm: 7.5,
    isCodAllowed: true,
    maxCodRadiusKm: SHOP_ORIGIN.maxCodRadiusKm,
    message: 'Địa chỉ trong phạm vi nội thành Hà Nội (Hỗ trợ Ship COD).',
  }
}
