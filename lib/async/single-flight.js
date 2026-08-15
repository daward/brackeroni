export function runSingleFlight(pendingRequestRef, createRequest) {
  if (pendingRequestRef.current) {
    return pendingRequestRef.current;
  }

  const request = Promise.resolve().then(createRequest);
  pendingRequestRef.current = request;
  const clearPendingRequest = () => {
    if (pendingRequestRef.current === request) {
      pendingRequestRef.current = null;
    }
  };
  request.then(clearPendingRequest, clearPendingRequest);

  return request;
}