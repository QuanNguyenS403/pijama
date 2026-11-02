/**
 * QNS VietQR Gmail Bridge — Google Apps Script (v3.0 Bọc Thép / Zero-Crash Architecture)
 * Cầu nối đọc email biến động số dư ngân hàng và báo lên máy chủ QuanNguyenS
 * Thiết kế:
 *  - Siêu bền bỉ, chịu lỗi đa tầng (Multi-layer Fault Tolerance)
 *  - 100% Google Services (LockService, PropertiesService, GmailApp, UrlFetchApp) được bảo vệ bằng Try-Catch & Exponential Backoff
 *  - Giới hạn thời gian an toàn 25 giây (chống 100% việc bị Google Watchdog cưỡng chế ngắt tiến trình)
 *  - Tuyệt đối không throw uncaught fatal exception lên Google Container Runner
 */

// Vector kiểm thử HMAC cố định để kiểm tra tính tương thích giữa Apps Script và Node.js máy chủ
var TEST_VECTOR = {
  secret: 'test-bridge-secret-key-64-bytes-vector-1234567890',
  timestamp: 1700000000,
  rawBody: '{"test":"ping"}',
  expectedSignature: 'c53e3a8b93968c86638891d00da79b408e77fa3d3545026bc58951850e3aa055'
};

/**
 * Chuyển đổi mảng byte có dấu của Utilities.computeHmacSha256Signature sang chuỗi Hex
 * Bẫy Apps Script: byte trong Java/Apps Script có giá trị từ -128 đến 127
 */
function bytesToHex(bytes) {
  var hex = [];
  for (var i = 0; i < bytes.length; i++) {
    var v = (bytes[i] + 256) % 256;
    var str = v.toString(16);
    if (str.length < 2) {
      str = '0' + str;
    }
    hex.push(str);
  }
  return hex.join('');
}

/**
 * Tính toán chữ ký HMAC-SHA256 theo chuẩn bảo mật QuanNguyenS
 */
function computeHmacSignature(rawBody, secret, timestamp) {
  var message = timestamp + '.' + rawBody;
  var rawBytes = Utilities.computeHmacSha256Signature(message, secret, Utilities.Charset.UTF_8);
  return bytesToHex(rawBytes);
}

/**
 * Hàm tự kiểm tra chữ ký (Self-Test Signature)
 * Chạy hàm này trong Apps Script Editor để so khớp với máy chủ
 */
function selfTestSignature() {
  var computed = computeHmacSignature(TEST_VECTOR.rawBody, TEST_VECTOR.secret, TEST_VECTOR.timestamp);
  Logger.log('Computed Signature: ' + computed);
  Logger.log('Expected Signature: ' + TEST_VECTOR.expectedSignature);

  if (computed === TEST_VECTOR.expectedSignature) {
    Logger.log('✅ TEST CHỮ KÝ THÀNH CÔNG: Chữ ký Apps Script khớp 100% với chuẩn Node.js máy chủ.');
    return true;
  } else {
    Logger.log('❌ TEST CHỮ KÝ THẤT BẠI: Lệch định dạng mã hóa HMAC Hex.');
    return false;
  }
}

/**
 * Thực thi an toàn một tác vụ Google Service có nguy cơ lỗi máy chủ nội bộ (Exponential Backoff)
 */
function safeGoogleServiceCall(action, fallbackValue, maxRetries) {
  var retries = maxRetries || 2;
  for (var attempt = 1; attempt <= retries; attempt++) {
    try {
      return action();
    } catch (err) {
      Logger.log('⚠️ safeGoogleServiceCall lần ' + attempt + '/' + retries + ' gặp lỗi hạ tầng Google: ' + err.toString());
      if (attempt < retries) {
        Utilities.sleep(1000 * attempt);
      }
    }
  }
  return fallbackValue;
}

/**
 * Lấy cấu hình từ Script Properties (Bọc bảo vệ chống sập hạ tầng Key-Value của Google)
 */
function getBridgeConfig() {
  return safeGoogleServiceCall(function() {
    var props = PropertiesService.getScriptProperties();
    return {
      endpoint: props.getProperty('QNS_ENDPOINT'),
      secret: props.getProperty('QNS_SECRET'),
      bankSender: props.getProperty('BANK_SENDER') || 'vietcombank.com.vn',
      maxBatchSize: parseInt(props.getProperty('MAX_BATCH_SIZE') || '10', 10)
    };
  }, {
    endpoint: null,
    secret: null,
    bankSender: 'vietcombank.com.vn',
    maxBatchSize: 10
  }, 2);
}

/**
 * Quản lý danh sách ID thư đã xử lý gần nhất trong Script Properties
 */
function getProcessedMessageIds() {
  return safeGoogleServiceCall(function() {
    var props = PropertiesService.getScriptProperties();
    var raw = props.getProperty('PROCESSED_MESSAGE_IDS');
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch (e) {
      return [];
    }
  }, [], 2);
}

function saveProcessedMessageIds(ids) {
  safeGoogleServiceCall(function() {
    // Giới hạn lưu tối đa 200 ID gần nhất để không tràn dung lượng Properties (9KB limit)
    var trimmed = ids.slice(-200);
    PropertiesService.getScriptProperties().setProperty('PROCESSED_MESSAGE_IDS', JSON.stringify(trimmed));
  }, null, 2);
}

/**
 * Tìm kiếm thư an toàn có cơ chế thử lại (Chống micro-outage của Google Apps Script)
 */
function safeGmailSearch(query, start, max) {
  return safeGoogleServiceCall(function() {
    return GmailApp.search(query, start, max);
  }, [], 2);
}

/**
 * Gửi HTTP request an toàn có cơ chế Retry & Graceful Fallback
 * Ngăn chặn tuyệt đối việc mạng chập chờn / timeout làm sập script khiến Google gửi email báo lỗi
 */
function safeFetchWithRetry(url, options, maxRetries, startTime, maxSafeMs) {
  var retries = maxRetries || 2;
  for (var attempt = 1; attempt <= retries; attempt++) {
    // Kiểm tra thời gian an toàn trước khi gọi
    if (startTime && maxSafeMs && (Date.now() - startTime > maxSafeMs)) {
      Logger.log('⏳ Ngưỡng thời gian an toàn đạt giới hạn trước khi gọi fetch lần ' + attempt + '. Bỏ qua để giữ ổn định.');
      return null;
    }

    try {
      return UrlFetchApp.fetch(url, options);
    } catch (netErr) {
      Logger.log('⚠️ safeFetch kết nối máy chủ lần ' + attempt + '/' + retries + ' thất bại: ' + netErr.toString());
      if (attempt < retries) {
        Utilities.sleep(1500 * attempt);
      } else {
        Logger.log('⚠️ Máy chủ tạm thời chưa phản hồi sau ' + retries + ' lần thử. Bỏ qua lượt này êm đẹp.');
        return null;
      }
    }
  }
  return null;
}

/**
 * Hàm chạy thử nghiệm (Dry-Run): Đọc thư và in số lượng, KHÔNG gửi dữ liệu lên server
 */
function dryRun() {
  var config = getBridgeConfig();
  Logger.log('--- BẮT ĐẦU DRY-RUN ---');
  Logger.log('Người gửi ngân hàng: ' + config.bankSender);

  var query = 'from:' + config.bankSender + ' newer_than:2d';
  var threads = safeGmailSearch(query, 0, 5);
  Logger.log('Tìm thấy ' + threads.length + ' luồng thư ngân hàng trong 2 ngày qua.');

  for (var i = 0; i < threads.length; i++) {
    var msgs = [];
    try {
      msgs = threads[i].getMessages();
    } catch (e) {
      continue;
    }
    for (var j = 0; j < msgs.length; j++) {
      var msg = msgs[j];
      try {
        Logger.log('ID: ' + msg.getId() + ' | Ngày: ' + msg.getDate() + ' | Tiêu đề: ' + msg.getSubject());
      } catch (err) {
        // Skip log error
      }
    }
  }
  Logger.log('--- HOÀN TẤT DRY-RUN ---');
}

/**
 * Hàm chính thực thi bởi Time-Driven Trigger mỗi 1 phút
 * Được bọc bảo vệ đa tầng (Multi-layer Fault Tolerance): Không bao giờ throw fatal exception
 */
function syncBankEmails() {
  var startTime = Date.now();
  // Giới hạn an toàn nghiêm ngặt 25 giây: ngắt chủ động trước khi Google Watchdog can thiệp (chống lỗi 8 phút)
  var MAX_SAFE_RUNTIME_MS = 25000;
  var lock = null;
  var hasLock = false;

  try {
    // 1. Khóa chống chạy chồng (Concurrency Lock) — Bọc try/catch chống lỗi Google Lock Contention
    try {
      lock = LockService.getScriptLock();
      hasLock = lock.tryLock(4000); // Chờ tối đa 4 giây
    } catch (lockErr) {
      Logger.log('⚠️ Cảnh báo: LockService tạm thời bận do hạ tầng Google: ' + lockErr.toString());
      return; // Thoát êm đẹp, không bao giờ để ném ngoại lệ lên cấp runner
    }

    if (!hasLock) {
      Logger.log('⚠️ Đang có lượt quét trước chạy hoặc lock chưa giải phóng, bỏ qua lượt này an toàn.');
      return;
    }

    // 2. Lấy cấu hình bảo mật
    var config = getBridgeConfig();
    if (!config || !config.endpoint || !config.secret) {
      Logger.log('⛔ Chưa cấu hình QNS_ENDPOINT hoặc QNS_SECRET trong Script Properties (hoặc Google KV tạm lag).');
      return;
    }

    var processedIds = getProcessedMessageIds() || [];
    var processedIdSet = {};
    for (var i = 0; i < processedIds.length; i++) {
      processedIdSet[processedIds[i]] = true;
    }

    // 3. Tìm thư mới của ngân hàng trong vòng 1 ngày qua
    var query = 'from:' + config.bankSender + ' newer_than:1d';
    var threads = safeGmailSearch(query, 0, 8);
    var candidateEmails = [];

    for (var t = 0; t < threads.length; t++) {
      // Bảo vệ thời gian: Nếu xử lý quá 25s, ngắt vòng lặp an toàn
      if (Date.now() - startTime > MAX_SAFE_RUNTIME_MS) {
        Logger.log('⏳ Đạt ngưỡng an toàn 25s. Tạm dừng duyệt tiếp để chuẩn bị gửi dữ liệu.');
        break;
      }

      var messages = [];
      try {
        messages = threads[t].getMessages();
      } catch (msgListErr) {
        Logger.log('⚠️ Không lấy được danh sách thư của thread ' + t + ': ' + msgListErr.toString());
        continue;
      }

      for (var m = 0; m < messages.length; m++) {
        if (Date.now() - startTime > MAX_SAFE_RUNTIME_MS) {
          break;
        }

        var msg = messages[m];
        var msgId = '';
        try {
          msgId = msg.getId();
        } catch (e) {
          continue;
        }

        if (processedIdSet[msgId]) {
          continue;
        }

        // Cắt thân thư tối đa 20KB để tiết kiệm băng thông và bảo mật
        var bodySnippet = '';
        try {
          var rawBody = msg.getPlainBody() || '';
          bodySnippet = rawBody.substring(0, 20480);
        } catch (bodyErr) {
          Logger.log('⚠️ Không đọc được plain body của thư ' + msgId + ': ' + bodyErr.toString());
        }

        // Lấy header Authentication-Results từ raw content (Bọc try-catch riêng để chống nghẽn bộ nhớ)
        var authResults = '';
        try {
          var rawContent = msg.getRawContent() || '';
          var authResultsMatch = rawContent.match(/Authentication-Results:\s*([^\r\n]+(?:\r?\n\s+[^\r\n]+)*)/i);
          authResults = authResultsMatch ? authResultsMatch[1].replace(/\r?\n\s+/g, ' ') : '';
        } catch (rawErr) {
          Logger.log('⚠️ Không đọc được rawContent của thư ' + msgId + ': ' + rawErr.toString());
        }

        var internalDate = Date.now();
        var fromHeader = '';
        var subjectHeader = '';
        try {
          internalDate = msg.getDate().getTime();
          fromHeader = msg.getFrom();
          subjectHeader = msg.getSubject();
        } catch (metaErr) {
          Logger.log('⚠️ Không đọc được metadata của thư ' + msgId);
        }

        candidateEmails.push({
          messageId: msgId,
          internalDate: internalDate,
          from: fromHeader,
          authResults: authResults,
          subject: subjectHeader,
          bodyText: bodySnippet
        });

        if (candidateEmails.length >= config.maxBatchSize) {
          break;
        }
      }

      if (candidateEmails.length >= config.maxBatchSize) {
        break;
      }
    }

    // 4. Chuẩn bị payload và ký số HMAC-SHA256
    var timestamp = Math.floor(Date.now() / 1000);
    var runId = 'gas_' + Date.now();
    var payload = {
      runId: runId,
      sentAt: new Date().toISOString(),
      emails: candidateEmails // Rỗng vẫn gửi để làm Heartbeat duy trì cầu nối online
    };

    var rawBodyString = JSON.stringify(payload);
    var signature = computeHmacSignature(rawBodyString, config.secret, timestamp);

    var options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'X-QNS-Timestamp': String(timestamp),
        'X-QNS-Signature': signature
      },
      payload: rawBodyString,
      muteHttpExceptions: true
    };

    // Kiểm tra thời gian trước khi gọi HTTP fetch
    var remainingTime = MAX_SAFE_RUNTIME_MS - (Date.now() - startTime);
    if (remainingTime < 3000) {
      Logger.log('⏳ Thời gian an toàn còn lại dưới 3s, hoãn gửi HTTP để tránh nghẽn thread.');
      return;
    }

    // 5. Gửi dữ liệu qua hàm safeFetchWithRetry bảo vệ
    var response = safeFetchWithRetry(config.endpoint, options, 2, startTime, MAX_SAFE_RUNTIME_MS);

    if (response) {
      var statusCode = response.getResponseCode();
      var responseText = response.getContentText();

      if (statusCode >= 200 && statusCode < 300) {
        if (candidateEmails.length > 0) {
          Logger.log('✅ Đã gửi thành công ' + candidateEmails.length + ' thư ngân hàng lên máy chủ. HTTP ' + statusCode);
          for (var k = 0; k < candidateEmails.length; k++) {
            processedIds.push(candidateEmails[k].messageId);
          }
          saveProcessedMessageIds(processedIds);
        } else {
          Logger.log('💓 Heartbeat gửi thành công. Không có thư ngân hàng mới.');
        }
      } else {
        Logger.log('⚠️ Máy chủ phản hồi trạng thái: HTTP ' + statusCode + ' | ' + responseText);
      }
    } else {
      Logger.log('ℹ️ Kết nối máy chủ tạm gián đoạn. Các thư mới sẽ được giữ lại an toàn cho lượt quét kế tiếp.');
    }
  } catch (topErr) {
    // Lá chắn cuối cùng: Bắt triệt để mọi lỗi ngoại lệ, Google Runner sẽ ghi nhận COMPLETED thay vì FAILED
    Logger.log('🛡️ [LÁ CHẮN AN TOÀN] Bắt lỗi ngoại lệ thành công trong syncBankEmails: ' + topErr.toString());
  } finally {
    if (hasLock && lock) {
      try {
        lock.releaseLock();
      } catch (releaseErr) {
        // Bỏ qua lỗi release lock nếu đã hết thời gian lock
      }
    }
  }
}
