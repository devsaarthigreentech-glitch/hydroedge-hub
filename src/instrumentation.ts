// Runs once when the server starts (Next.js instrumentation hook). Firmware
// update jobs advance from here, so they do not depend on a page being open.
// So does the resend of unanswered commands (lib/nano-cmd-retry).
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startFwRunner } = await import('@/lib/nano-fw-runner');
    startFwRunner();
    // Commands a unit never answered are sent again when it comes back online.
    const { startCmdRetry } = await import('@/lib/nano-cmd-retry');
    startCmdRetry();
  }
}
