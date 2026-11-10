import { loadEnvironment } from './envCheck.js'

const isNodeTestRunner =
  Boolean(process.env.NODE_TEST_CONTEXT) ||
  process.execArgv.some((arg) => arg === '--test' || arg.startsWith('--test-'))

// Nạp sớm biến môi trường trước khi các module static import khác đọc process.env
if (process.env.NODE_ENV !== 'test' && !isNodeTestRunner) {
  loadEnvironment()
}
