// Keepnet Whitelist Assistant - Background Service Worker v3.1
console.log("[Keepnet v3.1] Background service worker started")

let globalState = {
  currentStep: 0,
  screenshots: {},
  isActive: false
}

// Extension icon'a tıklama
chrome.action.onClicked.addListener(async (tab) => {
  console.log("[Keepnet] Extension clicked on tab:", tab.id)
  console.log("[Keepnet] Tab URL:", tab.url)
  
  try {
    // "Git ve Düzelt" modunda mıyız kontrol et
    const fixing = await chrome.storage.local.get('keepnet_fixing_step')
    
    if (!fixing.keepnet_fixing_step) {
      // Normal mod: Storage'ı temizle, yeni başlangıç
      console.log("[Keepnet] Clearing storage for fresh start...")
      await chrome.storage.local.remove(['ASSISTANT_AUTO_STARTED', 'keepnet_current_step'])
    } else {
      console.log("[Keepnet] Git ve Düzelt mode, preserving step")
      // Fixing flag'ini temizle
      await chrome.storage.local.remove('keepnet_fixing_step')
    }
    
    // Security veya Exchange sayfasında mıyız?
    const validHosts = ['security.microsoft.com', 'admin.exchange.microsoft.com']
    const url = new URL(tab.url)
    
    console.log("[Keepnet] Hostname:", url.hostname)
    
    if (!validHosts.includes(url.hostname)) {
      console.log("[Keepnet] Not on valid host, redirecting to Security Center...")
      // Otomatik olarak Security Center'a yönlendir
      await chrome.tabs.update(tab.id, {
        url: 'https://security.microsoft.com/homepage'
      })
      
      // Birkaç saniye sonra assistant'ı başlat
      setTimeout(async () => {
        await startAssistant(tab.id)
      }, 3000)
      return
    }
    
    console.log("[Keepnet] Already on valid host, starting assistant...")
    await startAssistant(tab.id)
  } catch (error) {
    console.error("[Keepnet] Extension click error:", error)
  }
})

// Asistanı başlat
async function startAssistant(tabId) {
  try {
    console.log("[Keepnet] Starting assistant on tab:", tabId)
    
    globalState.isActive = true
    
    // Storage flag'ini temizle ki auto-start çalışabilsin
    console.log("[Keepnet] Clearing auto-start flag...")
    await chrome.storage.local.remove('ASSISTANT_AUTO_STARTED')
    
    // Önce ping ile kontrol et
    try {
      console.log("[Keepnet] Sending ping to check content script...")
      const pingResponse = await chrome.tabs.sendMessage(tabId, { action: 'ping' })
      console.log("[Keepnet] Ping response:", pingResponse)
    } catch (pingError) {
      console.log("[Keepnet] Ping failed, content script not ready")
      throw pingError
    }
    
    // Content script'e mesaj gönder
    console.log("[Keepnet] Sending initAssistant message...")
    const response = await chrome.tabs.sendMessage(tabId, {
      action: 'initAssistant'
    })
    
    console.log("[Keepnet] initAssistant response:", response)
  } catch (error) {
    console.error("[Keepnet] Start assistant error:", error)
    
    // Content script yüklü değilse inject et
    try {
      console.log("[Keepnet] Injecting content script...")
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      })
      
      await chrome.scripting.insertCSS({
        target: { tabId: tabId },
        files: ['content.css']
      })
      
      console.log("[Keepnet] Content script injected, waiting 1s...")
      
      // Flag'i temizle
      await chrome.storage.local.remove('ASSISTANT_AUTO_STARTED')
      
      // Tekrar dene
      setTimeout(async () => {
        console.log("[Keepnet] Retrying initAssistant...")
        try {
          const response = await chrome.tabs.sendMessage(tabId, {
            action: 'initAssistant'
          })
          console.log("[Keepnet] initAssistant response (retry):", response)
        } catch (retryError) {
          console.error("[Keepnet] Retry failed:", retryError)
        }
      }, 1000)
    } catch (injectError) {
      console.error("[Keepnet] Inject error:", injectError)
    }
  }
}

// Content script'ten mesajlar
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("[Keepnet] Message received:", request.action)
  
  switch (request.action) {
    case 'captureScreenshot':
      handleCaptureScreenshot(sender.tab.id, request.stepName, sendResponse)
      return true // Async response
      
    case 'getState':
      sendResponse(globalState)
      break
      
    case 'updateState':
      globalState = { ...globalState, ...request.state }
      sendResponse({ ok: true })
      break
  }
  
  return false
})

// Screenshot çek ve kaydet
async function handleCaptureScreenshot(tabId, stepName, sendResponse) {
  try {
    console.log(`[Keepnet] Capturing screenshot for ${stepName}...`)
    
    // Sayfa fully visible olana kadar bekle
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const dataUrl = await chrome.tabs.captureVisibleTab(null, {
      format: 'png',
      quality: 90
    })
    
    globalState.screenshots[stepName] = {
      dataUrl: dataUrl,
      timestamp: new Date().toISOString()
    }
    
    console.log(`[Keepnet] Screenshot captured: ${stepName}.png (${Math.round(dataUrl.length / 1024)}KB)`)
    
    // Content script'e geri bildir
    chrome.tabs.sendMessage(tabId, {
      action: 'screenshotCaptured',
      stepName: stepName,
      dataUrl: dataUrl
    })
    
    sendResponse({ ok: true, dataUrl: dataUrl })
  } catch (error) {
    console.error("[Keepnet] Screenshot error:", error)
    sendResponse({ ok: false, error: error.message })
  }
}

// Tab güncellemelerini dinle
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && globalState.isActive) {
    const url = new URL(tab.url)
    const validHosts = ['security.microsoft.com', 'admin.exchange.microsoft.com']
    
    if (validHosts.includes(url.hostname)) {
      // Content script yüklendi mi kontrol et
      setTimeout(async () => {
        try {
          await chrome.tabs.sendMessage(tabId, { action: 'ping' })
        } catch {
          // Content script yok, inject et
          try {
            await chrome.scripting.executeScript({
              target: { tabId: tabId },
              files: ['content.js']
            })
            
            await chrome.scripting.insertCSS({
              target: { tabId: tabId },
              files: ['content.css']
            })
            
            console.log("[Keepnet] Content script injected")
          } catch (e) {
            console.error("[Keepnet] Inject failed:", e)
          }
        }
      }, 1000)
    }
  }
})

console.log("[Keepnet] Background service worker ready")
