/**
 * QNS VietQR Gmail Bridge — Google Apps Script (WP12 - v2.0 Siêu Bền Vững / High-Resilience)
 * Cầu nối đọc email biến động số dư ngân hàng và báo lên máy chủ QuanNguyenS
 * Thiết kế: Nhẹ, an toàn, tự phục hồi khi mạng chập chờn, chống crash hạ tầng Google
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
 * Lấy cấu hình từ Script Properties
 */
function getBridgeConfig() {
  var props = PropertiesService.getScriptProperties();
  return {
    endpoint: props.getProperty('QNS_ENDPOINT'),
    secret: props.getProperty('QNS_SECRET'),
    bankSender: props.getProperty('BANK_SENDER') || 'vietcombank.com.vn',
    maxBatchSize: parseInt(props.getProperty('MAX_BATCH_SIZE') || '10', 10)
  };
}

/**
 * Quản lý danh sách ID thư đã xử lý gần nhất trong Script Properties
 */
function getProcessedMessageIds() {
  var props = PropertiesService.getScriptProperties();
  var raw = props.getProperty('PROCESSED_MESSAGE_IDS');
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function saveProcessedMessageIds(ids) {
  // Giới hạn lưu tối đa 200 ID gần nhất để không tràn dung lượng Properties (9KB limit)
  var trimmed = ids.slice(-200);
  PropertiesService.getScriptProperties().setProperty('PROCESSED_MESSAGE_IDS', JSON.stringify(trimmed));
}

/**
 * Tìm kiếm thư an toàn có cơ chế thử lại (Chống micro-outage của Google Apps Script)
 */
function safeGmailSearch(query, start, max) {
  for (var attempt = 1; attempt <= 2; attempt++) {
    try {
      return GmailApp.search(query, start, max);
    } catch (err) {
      Logger.log('⚠️ safeGmailSearch lần ' + attempt + ' gặp lỗi hạ tầng Google: ' + err.toString());
      if (attempt < 2) {
        Utilities.sleep(1500);
      }
    }
  }
  return [];
}

/**
 * Gửi HTTP request an toàn có cơ chế Retry & Graceful Fallback
 * Ngăn chặn tuyệt đối việc mạng chập chờn / timeout làm sập script khiến Google gửi email báo lỗi
 */
function safeFetchWithRetry(url, options, maxRetries) {
  var retries = maxRetries || 2;
  for (var attempt = 1; attempt <= retries; attempt++) {
    try {
      return UrlFetchApp.fetch(url, options);
    } catch (netErr) {
      Logger.log('⚠️ safeFetch kết nối máy chủ lần ' + attempt + '/' + retries + ' thất bại: ' + netErr.toString());
      if (attempt < retries) {
        Utilities.sleep(2000 * attempt);
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
    var msgs = threads[i].getMessages();
    for (var j = 0; j < msgs.length; j++) {
      var msg = msgs[j];
      Logger.log('ID: ' + msg.getId() + ' | Ngày: ' + msg.getDate() + ' | Tiêu đề: ' + msg.getSubject());
    }
  }
  Logger.log('--- HOÀN TẤT DRY-RUN ---');
}

/**
 * Hàm chính thực thi bởi Time-Driven Trigger mỗi 1 phút
 * Được bọc bảo vệ đa tầng (Multi-layer Fault Tolerance): Không bao giờ throw fatal exception
 */
function syncBankEmails() {
  // 1. Khóa chống chạy chồng (Concurrency Lock)
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    Logger.log('⚠️ Đang có lượt quét trước chạy, bỏ qua lượt này để tránh trùng lặp.');
    return;
  }

  var startTime = Date.now();
  var MAX_SAFE_RUNTIME_MS = 40000; // Giới hạn tối đa 40s (tránh bị Google ngắt kết nối ở mốc 130s)

  try {
    var config = getBridgeConfig();
    if (!config.endpoint || !config.secret) {
      Logger.log('⛔ Chưa cấu hình QNS_ENDPOINT hoặc QNS_SECRET trong Script Properties.');
      return;
    }

    var processedIds = getProcessedMessageIds();
    var processedIdSet = {};
    for (var i = 0; i < processedIds.length; i++) {
      processedIdSet[processedIds[i]] = true;
    }

    // 2. Tìm thư mới của ngân hàng trong vòng 1 ngày qua (có cơ chế chống lỗi Google)
    var query = 'from:' + config.bankSender + ' newer_than:1d';
    var threads = safeGmailSearch(query, 0, 10);
    var candidateEmails = [];

    for (var t = 0; t < threads.length; t++) {
      // Bảo vệ thời gian: Nếu xử lý quá 40s, ngắt vòng lặp an toàn
      if (Date.now() - startTime > MAX_SAFE_RUNTIME_MS) {
        Logger.log('⏳ Đạt ngưỡng thời gian an toàn (40s). Tạm dừng quét tiếp để gửi lô thư đã gom.');
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

        // Lấy header Authentication-Results từ raw content (Bọc try-catch riêng để chống tràn bộ nhớ / timeout)
        var authResults = '';
        try {
          var rawContent = msg.getRawContent() || '';
          var authResultsMatch = rawContent.match(/Authentication-Results:\s*([^\r\n]+(?:\r?\n\s+[^\r\n]+)*)/i);
          authResults = authResultsMatch ? authResultsMatch[1].replace(/\r?\n\s+/g, ' ') : '';
        } catch (rawErr) {
          Logger.log('⚠️ Không đọc được rawContent của thư ' + msgId + ' (thư quá lớn hoặc lỗi kết nối): ' + rawErr.toString());
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

    // 3. Chuẩn bị payload và ký số HMAC-SHA256
    var timestamp = Math.floor(Date.now() / 1000);
    var runId = 'gas_' + Date.now();
    var payload = {
      runId: runId,
      sentAt: new Date().toISOString(),
      emails: candidateEmails // Rỗng vẫn gửi để làm Heartbeat
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

    // 4. Gửi dữ liệu qua hàm safeFetchWithRetry bảo vệ
    var response = safeFetchWithRetry(config.endpoint, options, 2);

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
      Logger.log('ℹ️ Kết nối máy chủ tạm gián đoạn. Các thư mới sẽ được giữ lại để gửi ở lượt quét kế tiếp.');
    }
  } catch (err) {
    // Bắt mọi ngoại lệ cấp cao nhất để Google Apps Script không đánh dấu là FAILED
    Logger.log('❌ Lỗi ngoại lệ trong syncBankEmails (đã được ngăn chặn an toàn): ' + err.toString());
  } finally {
    try {
      lock.releaseLock();
    } catch (lockErr) {
      // Bỏ qua lỗi release lock nếu có
    }
  }
}
