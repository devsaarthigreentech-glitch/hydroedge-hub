// Runs once when the server starts (Next.js instrumentation hook). Firmware
// update jobs advance from here, so they do not depend on a page being open.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startFwRunner } = await import('@/lib/nano-fw-runner');
    startFwRunner();
  }
}
