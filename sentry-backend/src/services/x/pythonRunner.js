const { spawn } = require("child_process");
const path = require("path");

function runPythonWorker({
  keyword,
  limit = Number(process.env.X_WORKER_LIMIT || 20),
  tab = "LATEST",
  timeoutMs = Number(process.env.X_WORKER_TIMEOUT_MS || 120000),
} = {}) {
  return new Promise((resolve) => {
    const pythonBin = process.env.PYTHON_BIN || "python";
    const workerPath =
      process.env.PYTHON_WORKER_PATH ||
      path.join("workers", "x_harvest_worker.py");

    const args = [
      workerPath,
      "--keyword",
      String(keyword || ""),
      "--limit",
      String(limit),
      "--tab",
      tab,
      "--timeout",
      String(timeoutMs),
    ];

    let stdout = "";
    let stderr = "";
    let finished = false;

    const child = spawn(pythonBin, args, {
      cwd: process.cwd(),
      shell: false,
      windowsHide: true,
      env: {
        ...process.env,
      },
    });

    const timeout = setTimeout(() => {
      if (finished) return;

      finished = true;

      try {
        child.kill("SIGKILL");
      } catch {
        // ignore
      }

      return resolve({
        ok: false,
        timeout: true,
        keyword,
        message: `Worker timeout setelah ${timeoutMs} ms untuk keyword: ${keyword}`,
        stdout,
        stderr,
        records: [],
      });
    }, timeoutMs + 5000);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      if (finished) return;

      finished = true;
      clearTimeout(timeout);

      return resolve({
        ok: false,
        keyword,
        message: error.message,
        stdout,
        stderr,
        records: [],
      });
    });

    child.on("close", () => {
      if (finished) return;

      finished = true;
      clearTimeout(timeout);

      const lines = stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      const lastJsonLine = [...lines].reverse().find((line) => {
        return line.startsWith("{") && line.endsWith("}");
      });

      if (!lastJsonLine) {
        return resolve({
          ok: false,
          keyword,
          message: "Worker tidak mengembalikan JSON valid.",
          stdout,
          stderr,
          records: [],
        });
      }

      try {
        const parsed = JSON.parse(lastJsonLine);
        return resolve({
          ...parsed,
          stdout,
          stderr,
        });
      } catch (error) {
        return resolve({
          ok: false,
          keyword,
          message: `Gagal parse JSON worker: ${error.message}`,
          stdout,
          stderr,
          records: [],
        });
      }
    });
  });
}

module.exports = {
  runPythonWorker,
};