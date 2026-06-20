import { execSync } from 'node:child_process';

const port = String(process.argv[2] || '3000');
const ownPid = String(process.pid);

function parseListeningPids(output, targetPort) {
  const portRe = new RegExp(`:${targetPort}\\s`);
  const pids = new Set();

  for (const line of output.split('\n')) {
    if (!line.includes('LISTENING')) continue;
    if (!portRe.test(line)) continue;
    const pid = line.trim().split(/\s+/).pop();
    if (pid && pid !== '0' && pid !== ownPid) pids.add(pid);
  }

  return pids;
}

function freePortOnWindows() {
  try {
    const out = execSync('netstat -ano -p tcp', { encoding: 'utf8' });
    const pids = parseListeningPids(out, port);

    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
        console.log(`[free-port] Freed port ${port} (PID ${pid})`);
      } catch {
        // Process may have already exited
      }
    }
  } catch {
    // Port is already free
  }
}

function freePortOnUnix() {
  try {
    const out = execSync(`lsof -ti tcp:${port} -sTCP:LISTEN`, { encoding: 'utf8' });
    for (const pid of out.trim().split('\n').filter(Boolean)) {
      if (pid === ownPid) continue;
      try {
        process.kill(Number(pid), 'SIGTERM');
        console.log(`[free-port] Freed port ${port} (PID ${pid})`);
      } catch {
        // Process may have already exited
      }
    }
  } catch {
    // Port is already free
  }
}

if (process.platform === 'win32') {
  freePortOnWindows();
} else {
  freePortOnUnix();
}
