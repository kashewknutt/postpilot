import { registerKeepAliveListeners, startKeepAlive } from './keepAlive.js'
import { registerMessageBroker } from './messageBroker.js'
import { initializeAuth } from './auth.js'

chrome.runtime.onInstalled.addListener(() => {
  startKeepAlive()
  void initializeAuth()
})

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return
  await chrome.sidePanel.open({ tabId: tab.id })
  await chrome.sidePanel.setOptions({
    tabId: tab.id,
    path: 'src/side-panel/sidePanel.html',
    enabled: true,
  })
})

registerKeepAliveListeners()
registerMessageBroker()

void initializeAuth()
