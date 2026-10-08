const { spawn } = require('node:child_process')
const args = process.argv.slice(2)
const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev',
  ...(args.length ? args : ['--port', '3001'])], {
  stdio: 'inherit',
  env: { ...process.env, DEV_SIMULATE_SEND_TIMEOUT: 'true', DEV_SIMULATE_EXECUTE_TIMEOUT: 'false' },
})
child.on('exit', (code) => { process.exitCode = code || 0 })
child.on('error', (error) => { console.error(error.message); process.exitCode = 1 })
