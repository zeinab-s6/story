export function trackClientCancellation(req, res) {
  let cancelled = false;

  function onClose() {
    if (!res.writableEnded) {
      cancelled = true;
    }
  }

  req.on('close', onClose);

  return {
    isCancelled() {
      return cancelled;
    },
    cleanup() {
      req.off('close', onClose);
    },
  };
}

export default trackClientCancellation;
