const KEEP_ALIVE_ALARM = 'postpilot-keep-alive'
const KEEP_ALIVE_INTERVAL_MINUTES = 0.33

export function startKeepAlive(): void {
  void chrome.alarms.create(KEEP_ALIVE_ALARM, {
    periodInMinutes: KEEP_ALIVE_INTERVAL_MINUTES,
  })
}

export function registerKeepAliveListeners(): void {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name !== KEEP_ALIVE_ALARM) return
    void chrome.runtime.getPlatformInfo(() => {
      console.debug('[postpilot] keep-alive tick')
    })
  })

  chrome.runtime.onConnect.addListener((port) => {
    port.onDisconnect.addListener(() => {
      console.debug('[postpilot] port disconnected')
    })
  })
}
