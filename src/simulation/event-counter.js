export function advanceProcessedEventCounter(currentCount, fractionalRemainder, elapsedMilliseconds, speed) {
  const accruedEvents = fractionalRemainder + Math.max(0, elapsedMilliseconds) * Math.max(0, speed) * 0.04
  const wholeEvents = Math.floor(accruedEvents)

  return {
    count: currentCount + wholeEvents,
    remainder: accruedEvents - wholeEvents,
  }
}
