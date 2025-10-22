// Keepnet Whitelist Assistant v3.1 - Third-Party Phishing Simulations Only
// Tek panel (sol-alt), otomatik tıklama, gerçek zamanlı validation, screenshot kanıt sistemi

console.log("[Keepnet v3.1] Content script loaded on", location.href)

/* ========== CONSTANTS & GLOBALS ========== */
const STORAGE_KEYS = {
  PANEL_STATE: 'keepnet_panel_state_v3',
  STEP_RESULTS: 'keepnet_step_results_v3',
  SCREENSHOTS: 'keepnet_screenshots_v3',
  CURRENT_STEP: 'keepnet_current_step_v3'
}

const PANEL_SIZE = { width: 340, height: 520 }
const AUTO_CLICK_TIMEOUT = 10000 // 10 saniye
const VALIDATION_INTERVAL = 1000 // 1 saniye

let CURRENT_STEP = 0
let TOTAL_STEPS = 12  // Third-Party Phishing: 12 adım
let LANGUAGE = 'tr'
let screenshotCounter = 0

/* ========== SPESIFIK AKIŞ: Third-Party Phishing Simulations ========== */
const WORKFLOW_STEPS = [
  {
    id: 1,
    name: 'step1_home',
    title: 'Security Center Ana Sayfası',
    description: 'Microsoft Security Center\'da olduğunuzdan emin olun ve devam edin.',
    navigate: 'https://security.microsoft.com/homepage',
    validation: () => {
      return document.location.href.startsWith('https://security.microsoft.com')
    }
  },
  {
    id: 2,
    name: 'step2_emailcollab',
    title: 'E-posta ve İşbirliği',
    description: 'E-posta ve işbirliği menüsünü açın',
    target: {
      selector: 'button[aria-label="E-posta ve işbirliği"]',
      fallback: [
        'button[aria-label*="E-posta"]',
        'button[aria-label*="Email"]',
        'button#Group_200_id12',
        'button#Group_150_id12',
        'button[data-icon-name="Mail"]'
      ]
    },
    tooltip: 'E-posta ve işbirliği\'ne tıklayın',
    autoClick: true,
    validation: () => {
      // Herhangi bir email butonunu bul
      const btn = document.querySelector('button[aria-label*="posta"], button[aria-label*="Email"]')
      return btn && btn.getAttribute('aria-expanded') === 'true'
    },
    waitAfterClick: 1000
  },
  {
    id: 3,
    name: 'step3_policies',
    title: 'İlkeler ve Kurallar',
    description: 'İlkeler ve kurallar sayfasına gidin',
    target: {
      selector: 'a[href*="securitypoliciesandrules"]',
      textMatch: /İlkeler ve kurallar|Policies & rules/i,
      fallback: [
        'a[data-automation-id*="securitypoliciesandrules"]',
        'a[href*="policy"]',
        'span:contains("İlkeler")'
      ]
    },
    tooltip: 'İlkeler ve kurallar\'a tıklayın',
    autoClick: false,  // Kullanıcı manuel tıklasın
    validation: () => {
      return document.location.href.includes('/securitypoliciesandrules') || 
             document.location.href.includes('/policy')
    },
    waitAfterClick: 3000
  },
  {
    id: 4,
    name: 'step4_threat_policies',
    title: 'Tehdit İlkeleri',
    description: 'Tehdit ilkeleri\'ne tıklayın',
    target: {
      selector: 'a[href*="threatpolicy"]',
      textMatch: /Tehdit ilkeleri|Threat policies/i,
      fallback: [
        'a[data-automation-id*="threatpolicy"]',
        'span:contains("Tehdit ilkeleri")',
        'a:contains("Threat")'
      ]
    },
    tooltip: 'Tehdit ilkeleri\'ne tıklayın',
    autoClick: false,  // Kullanıcı manuel tıklasın
    validation: () => {
      return document.location.href.includes('/threatpolicy')
    },
    waitAfterClick: 3000
  },
  {
    id: 5,
    name: 'step5_advanced_delivery',
    title: 'Advanced Delivery',
    description: 'Advanced delivery butonuna tıklayın',
    target: {
      selector: 'button[aria-label*="Advanced delivery"]',
      textMatch: /Advanced delivery/i,
      fallback: [
        'button[aria-label*="OverridePolicy"]',
        'button.ms-Link',
        'button[type="button"]'
      ]
    },
    tooltip: 'Advanced delivery\'ye tıklayın',
    autoClick: false,  // Kullanıcı manuel tıklasın
    validation: () => {
      return document.location.href.includes('/advanceddelivery')
    },
    waitAfterClick: 3000
  },
  {
    id: 6,
    name: 'step6_phishing_simulation',
    title: 'Phishing Simulation Tab',
    description: 'Phishing simulation sekmesine tıklayın',
    target: {
      selector: 'button[name="Phishing simulation"]',
      textMatch: /Phishing simulation/i,
      fallback: [
        'span.ms-Pivot-text',
        'button[role="tab"]',
        '[data-automation-id*="phishing"]',
        '.ms-Pivot button'
      ]
    },
    tooltip: 'Phishing simulation sekmesine tıklayın',
    autoClick: true,
    validation: () => {
      const tab = Array.from(document.querySelectorAll('button[role="tab"], .ms-Pivot-text')).find(el => 
        /Phishing simulation/i.test(el.textContent)
      )
      return tab && (tab.getAttribute('aria-selected') === 'true' || tab.classList.contains('is-selected'))
    },
    waitAfterClick: 1500
  },
  {
    id: 7,
    name: 'step7_edit_button',
    title: 'Düzenle Butonu',
    description: 'Düzenle butonuna tıklayın',
    target: {
      selector: 'button[aria-label*="Düzenle"]',
      textMatch: /Düzenle/i,
      fallback: [
        'span.ms-Button-label',
        'button.ms-Button',
        'button[type="button"]'
      ]
    },
    tooltip: 'Düzenle butonuna tıklayın',
    autoClick: true,
    validation: () => {
      // Panel veya modal açıldı mı kontrol et
      return !!document.querySelector('[role="dialog"], .ms-Panel, [data-automation-id="panel"]')
    },
    waitAfterClick: 2000
  },
  {
    id: 8,
    name: 'step8_domains_input',
    title: 'Etki Alanları',
    description: 'Etki alanlarını girin (örn: *.keepnetdomain.com)',
    target: {
      selector: 'label.ms-Label:contains("Etki Alanı")',
      textMatch: /Etki Alanı/i,
      fallback: [
        'label.ms-Label.root-995',
        'input[aria-label="Etki alanları"]',
        'input.ms-BasePicker-input'
      ]
    },
    tooltip: 'Etki alanlarını girin',
    autoClick: false,
    validation: () => {
      const label = Array.from(document.querySelectorAll('label.ms-Label')).find(el => 
        /Etki Alanı/i.test(el.textContent)
      )
      return label && !label.textContent.includes('(0 öğe)')
    },
    realTimeValidation: true,
    criticalStep: true,
    waitAfterClick: 500
  },
  {
    id: 9,
    name: 'step9_ip_input',
    title: 'IP Adresleri',
    description: 'White list IP adreslerini girin',
    target: {
      selector: 'input[aria-label="IP picker"]',
      fallback: [
        'input.ms-BasePicker-input',
        'input[id*="combobox"][aria-label*="IP"]'
      ]
    },
    tooltip: 'White list IP adreslerini girin',
    autoClick: false,
    validation: () => {
      const input = document.querySelector('input[aria-label="IP picker"]')
      return input && input.value && input.value.length > 0
    },
    realTimeValidation: true,
    criticalStep: true,
    waitAfterClick: 500
  },

  {
    id: 10,
    name: 'step10_simulation_urls_input',
    title: 'Simülasyon URL\'leri',
    description: 'Simülasyon URL\'lerini girin',
    target: {
      selector: 'label.ms-Label.root-985',
      textMatch: /İzin verilen simülasyon URL/i,
      fallback: [
        'label.ms-Label:contains("İzin verilen simülasyon URL")',
        'input[aria-label="URL picker"]',
        'input.ms-BasePicker-input'
      ]
    },
    tooltip: 'Simülasyon URL\'lerini girin',
    autoClick: false,
    validation: () => {
      const label = Array.from(document.querySelectorAll('label.ms-Label')).find(el => 
        /İzin verilen simülasyon URL/i.test(el.textContent)
      )
      return label && !label.textContent.includes('(0 öğe)')
    },
    realTimeValidation: true,
    criticalStep: false,
    waitAfterClick: 500
  },
  {
    id: 11,
    name: 'step11_save',
    title: 'Kaydet',
    description: 'Değişiklikleri kaydedin',
    target: {
      selector: 'button:has(span.ms-Button-label:contains("Save"))',
      textMatch: /Save|Kaydet/i,
      fallback: [
        'span.ms-Button-label[id*="id__"]',
        'button[aria-label*="Save"]',
        'button.ms-Button--primary'
      ]
    },
    tooltip: 'Kaydet butonuna tıklayın',
    autoClick: true,
    validation: () => {
      // Save işlemi başarılı mı kontrol et
      return true
    },
    waitAfterClick: 2000
  },
  {
    id: 12,
    name: 'step12_summary',
    title: 'Tamamlandı! ✅',
    description: 'Tüm adımlar başarıyla tamamlandı',
    isSummary: true
  }
]

/* ========== WORKFLOW 2: Threat Policies - Anti-Spam ========== */
const THREAT_POLICIES_STEPS = [
  {
    id: 1,
    name: 'antispam_step1_navigate',
    title: 'Anti-Spam Politikalarına Git',
    description: 'Anti-Spam politikalarına gitmek için "Sayfaya Git" butonuna tıklayın',
    navigate: 'https://security.microsoft.com/antispam',
    validation: () => {
      return document.location.href.includes('/antispam')
    },
    isNavigation: true
  },
  {
    id: 2,
    name: 'antispam_step2_select_checkbox',
    title: 'Connection Filter Policy Checkbox',
    description: 'Connection Filter Policy satırının checkbox\'ını seçin',
    target: {
      selector: 'div.ms-DetailsRow-cellCheck div[role="radio"][data-automationid="DetailsRowCheck"][aria-checked="false"]',
      fallback: [
        'div.ms-DetailsRow-cellCheck div[role="radio"][data-automationid="DetailsRowCheck"]',
        'div.checkCell-938 div[data-automationid="DetailsRowCheck"]',
        'div.ms-Check-checkHost:nth-of-type(2)',
        'div[data-automationid="DetailsRowCheck"]:not([aria-checked="true"]):first-of-type'
      ]
    },
    tooltip: 'Connection Filter Policy checkbox\'ını seçin',
    autoClick: false,
    validation: () => {
      // Seçili checkbox var mı kontrol et
      const checkedBoxes = document.querySelectorAll('div.ms-DetailsRow-cellCheck div[data-automationid="DetailsRowCheck"][aria-checked="true"]')
      return checkedBoxes.length > 0
    },
    waitAfterClick: 1000
  },
  {
    id: 3,
    name: 'antispam_step3_click_row',
    title: 'Connection Filter Policy',
    description: 'Connection filter policy (Varsayılan) satırına tıklayın',
    target: {
      selector: 'span.scc-list-first-column',
      textMatch: /Connection filter policy/i,
      fallback: [
        'div[data-automationid="DetailsRowCell"] span.scc-list-first-column',
        'span.scc-list-first-column',
        'div.ms-DetailsRow-cell span'
      ]
    },
    tooltip: 'Connection filter policy\'ye tıklayın',
    autoClick: false,
    validation: () => {
      return !!document.querySelector('button[aria-label*="Edit connection filter"]')
    },
    waitAfterClick: 2000
  },
  {
    id: 4,
    name: 'antispam_step4_edit_button',
    title: 'Edit Connection Filter',
    description: 'Edit connection filter policy butonuna tıklayın',
    target: {
      selector: 'button[aria-label="Edit connection filter policy"]',
      textMatch: /Edit connection filter/i,
      fallback: [
        'button[aria-label*="Edit connection"]',
        'button.ms-Link[aria-label*="Edit"]'
      ]
    },
    tooltip: 'Edit connection filter policy\'ye tıklayın',
    autoClick: false,
    validation: () => {
      return !!document.querySelector('textarea[aria-label*="IP"], input[aria-label*="IP"]')
    },
    waitAfterClick: 2000
  },
  {
    id: 5,
    name: 'antispam_step5_add_ips',
    title: 'IP Adresleri Ekle',
    description: 'IP adreslerini "Always allow messages from the following IP addresses" kısmına ekleyin (Her IP yeni satıra)',
    target: {
      selector: 'label.ms-Label[style*="margin-top"]',
      textMatch: /Always allow messages/i,
      fallback: [
        'input.ms-BasePicker-input',
        'textarea.ms-TextField-field',
        'textarea',
        'input[type="text"]'
      ]
    },
    tooltip: 'IP adreslerini girin (Her satıra bir IP)',
    autoClick: false,
    validation: () => {
      const input = document.querySelector('input.ms-BasePicker-input') ||
                    document.querySelector('textarea.ms-TextField-field') ||
                    document.querySelector('textarea')
      return input && input.value && input.value.length > 0
    },
    realTimeValidation: true,
    criticalStep: true,
    waitAfterClick: 500,
    isLabelStep: true  // Bu step label içeriyor, input'u bul
  },
  {
    id: 6,
    name: 'antispam_step6_safe_list',
    title: 'Turn on Safe List',
    description: '"Turn on safe list" checkbox\'ını işaretleyin',
    target: {
      selector: 'label.ms-Checkbox-label[for*="checkbox"]',
      textMatch: /Turn on safe list/i,
      fallback: [
        'input[type="checkbox"]',
        '.ms-Checkbox-label',
        '.ms-Checkbox input'
      ]
    },
    tooltip: 'Turn on safe list checkbox\'ını işaretleyin',
    autoClick: false,
    validation: () => {
      const checkbox = Array.from(document.querySelectorAll('input[type="checkbox"]')).find(el => {
        const label = el.id ? document.querySelector(`label[for="${el.id}"]`)?.textContent : el.parentElement?.textContent
        return label && /Turn on safe list/i.test(label)
      })
      return checkbox && checkbox.checked
    },
    waitAfterClick: 500
  },
  {
    id: 7,
    name: 'antispam_step7_save',
    title: 'Kaydet',
    description: 'Save (Kaydet) butonuna tıklayarak işlemi tamamlayın',
    target: {
      selector: 'span.ms-Button-label:contains("Kaydet"), span.ms-Button-label:contains("Save")',
      textMatch: /Kaydet|Save/i,
      fallback: [
        'button[aria-label*="Save"]',
        'button.ms-Button--primary',
        'span.ms-Button-label'
      ]
    },
    tooltip: 'Kaydet butonuna tıklayın',
    autoClick: false,
    validation: () => {
      return true
    },
    waitAfterClick: 2000
  },
  {
    id: 8,
    name: 'antispam_summary',
    title: 'Tamamlandı! ✅',
    description: 'Anti-Spam yapılandırması başarıyla tamamlandı',
    isSummary: true
  }
]

/* ========== WORKFLOW 3: Safe Links ========== */
const SAFE_LINKS_STEPS = [
  {
    id: 1,
    name: 'safelinks_step1_navigate',
    title: 'Security Center',
    description: 'Microsoft Security & Compliance Center\'a gidin',
    navigate: 'https://security.microsoft.com/threatpolicy',
    validation: () => {
      return document.location.href.includes('/threatpolicy')
    }
  },
  {
    id: 2,
    name: 'safelinks_step2_email_collab',
    title: 'E-posta ve İşbirliği',
    description: 'Email & Collaboration sekmesini açın',
    target: {
      selector: 'button[aria-label*="E-posta"]',
      fallback: [
        'button[aria-label*="Email"]',
        'button[data-icon-name="Mail"]'
      ]
    },
    tooltip: 'E-posta ve işbirliği\'ne tıklayın',
    autoClick: true,
    validation: () => {
      const btn = document.querySelector('button[aria-label*="posta"], button[aria-label*="Email"]')
      return btn && btn.getAttribute('aria-expanded') === 'true'
    },
    waitAfterClick: 1000
  },
  {
    id: 3,
    name: 'safelinks_step3_policies',
    title: 'Policies & Rules',
    description: 'Policies and rules > Threat Policies kısmına gidin',
    target: {
      selector: 'a[href*="threatpolicy"]',
      textMatch: /Threat policies/i,
      fallback: [
        'a[href*="policy"]'
      ]
    },
    tooltip: 'Threat Policies\'e tıklayın',
    autoClick: false,
    validation: () => {
      return document.location.href.includes('/threatpolicy')
    },
    waitAfterClick: 2000
  },
  {
    id: 4,
    name: 'safelinks_step4_safe_links',
    title: 'Safe Links',
    description: 'Safe Links\'e tıklayın',
    target: {
      selector: 'a:contains("Safe Links")',
      textMatch: /Safe Links/i,
      fallback: [
        'a[href*="safelinks"]',
        'button:contains("Safe Links")'
      ]
    },
    tooltip: 'Safe Links\'e tıklayın',
    autoClick: false,
    validation: () => {
      return document.location.href.includes('safelinks') || 
             document.querySelector('[aria-label*="Safe Links"]')
    },
    waitAfterClick: 2000
  },
  {
    id: 5,
    name: 'safelinks_step5_create',
    title: 'Create Butonu',
    description: 'Create butonuna tıklayın',
    target: {
      selector: 'button:contains("Create")',
      textMatch: /Create/i,
      fallback: [
        'button[aria-label*="Create"]',
        'button.ms-Button--primary'
      ]
    },
    tooltip: 'Create butonuna tıklayın',
    autoClick: false,
    validation: () => {
      return !!document.querySelector('[role="dialog"], .ms-Panel')
    },
    waitAfterClick: 2000
  },
  {
    id: 6,
    name: 'safelinks_step6_name',
    title: 'İsim ve Açıklama',
    description: 'Bir isim ve açıklama ekleyin',
    target: {
      selector: 'input[placeholder*="name"], input[aria-label*="Name"]',
      fallback: [
        'input[type="text"]',
        'textarea'
      ]
    },
    tooltip: 'İsim girin',
    autoClick: false,
    validation: () => {
      const input = document.querySelector('input[placeholder*="name"], input[type="text"]')
      return input && input.value && input.value.length > 0
    },
    realTimeValidation: true,
    waitAfterClick: 500
  },
  {
    id: 7,
    name: 'safelinks_step7_next1',
    title: 'Next (1)',
    description: 'Next butonuna tıklayın',
    target: {
      selector: 'button:contains("Next")',
      textMatch: /Next/i,
      fallback: [
        'button[aria-label*="Next"]',
        'button.ms-Button--primary'
      ]
    },
    tooltip: 'Next butonuna tıklayın',
    autoClick: false,
    validation: () => {
      return true
    },
    waitAfterClick: 2000
  },
  {
    id: 8,
    name: 'safelinks_step8_domain',
    title: 'Domain Ekle',
    description: 'Şirket domaininizi ekleyin',
    target: {
      selector: 'input[aria-label*="domain"]',
      fallback: [
        'input.ms-BasePicker-input',
        'input[type="text"]'
      ]
    },
    tooltip: 'Domain ekleyin',
    autoClick: false,
    validation: () => {
      const input = document.querySelector('input[aria-label*="domain"], input.ms-BasePicker-input')
      return input && input.value && input.value.length > 0
    },
    realTimeValidation: true,
    waitAfterClick: 500
  },
  {
    id: 9,
    name: 'safelinks_step9_next2',
    title: 'Next (2)',
    description: 'Next butonuna tıklayın',
    target: {
      selector: 'button:contains("Next")',
      textMatch: /Next/i,
      fallback: [
        'button[aria-label*="Next"]'
      ]
    },
    tooltip: 'Next\'e tıklayın',
    autoClick: false,
    validation: () => {
      return true
    },
    waitAfterClick: 2000
  },
  {
    id: 10,
    name: 'safelinks_step10_deselect_options',
    title: 'Seçenekleri Kaldır',
    description: '"Track user clicks" ve "Office 365 Apps" seçeneklerini deselect edin',
    target: {
      selector: 'input[type="checkbox"][aria-label*="Track"]',
      fallback: [
        'input[type="checkbox"]'
      ]
    },
    tooltip: 'Track user clicks seçeneğini kaldırın',
    autoClick: false,
    validation: () => {
      const checkbox = document.querySelector('input[type="checkbox"][aria-label*="Track"]')
      return checkbox && !checkbox.checked
    },
    waitAfterClick: 500
  },
  {
    id: 11,
    name: 'safelinks_step11_add_urls',
    title: 'Phishing Domain Ekle',
    description: 'Do not rewrite the following URLs kısmına *.domain.com/* formatında ekleyin',
    target: {
      selector: 'textarea[aria-label*="URL"], input[aria-label*="URL"]',
      fallback: [
        'textarea',
        'input.ms-BasePicker-input'
      ]
    },
    tooltip: 'Phishing domainlerini ekleyin',
    autoClick: false,
    validation: () => {
      const input = document.querySelector('textarea[aria-label*="URL"], textarea')
      return input && input.value && input.value.includes('*.')
    },
    realTimeValidation: true,
    criticalStep: true,
    waitAfterClick: 500
  },
  {
    id: 12,
    name: 'safelinks_step12_next3',
    title: 'Next (3)',
    description: 'Next butonuna tıklayın',
    target: {
      selector: 'button:contains("Next")',
      textMatch: /Next/i,
      fallback: [
        'button[aria-label*="Next"]'
      ]
    },
    tooltip: 'Next\'e tıklayın',
    autoClick: false,
    validation: () => {
      return true
    },
    waitAfterClick: 2000
  },
  {
    id: 13,
    name: 'safelinks_step13_submit',
    title: 'Submit',
    description: 'Submit diyerek işlemi tamamlayın',
    target: {
      selector: 'button:contains("Submit")',
      textMatch: /Submit/i,
      fallback: [
        'button[aria-label*="Submit"]',
        'button.ms-Button--primary'
      ]
    },
    tooltip: 'Submit butonuna tıklayın',
    autoClick: false,
    validation: () => {
      return true
    },
    waitAfterClick: 2000
  },
  {
    id: 14,
    name: 'safelinks_summary',
    title: 'Tamamlandı! ✅',
    description: 'Safe Links yapılandırması tamamlandı. Birkaç saat içinde etkili olacaktır.',
    isSummary: true
  }
]

/* ========== WORKFLOW 4: Spam Filter Bypass ========== */
const SPAM_FILTER_BYPASS_STEPS = [
  {
    id: 1,
    name: 'spambypass_step1_navigate',
    title: 'Admin Portalına Git',
    description: 'Exchange Admin Portalına gitmek için "Sayfaya Git" butonuna tıklayın',
    navigate: 'https://admin.exchange.microsoft.com/#/transportrules',
    validation: () => {
      return document.location.href.includes('admin.exchange.microsoft.com')
    },
    isNavigation: true
  },
  {
    id: 2,
    name: 'spambypass_step2_mail_flow',
    title: 'Mail Flow Menüsü',
    description: 'Mail flow butonuna tıklayın',
    target: {
      selector: 'button[data-value="mailflownode"]',
      textMatch: /Mail flow/i,
      fallback: [
        'button[aria-label*="mailflownode"]',
        'button[name="Mail flow"]',
        'button[data-automation-id*="mailflow"]'
      ]
    },
    tooltip: 'Mail flow menüsünü açın',
    autoClick: false,
    validation: () => {
      return !!document.querySelector('a[data-value="transportrules"]') || document.location.href.includes('transportrules')
    },
    waitAfterClick: 1000
  },
  {
    id: 3,
    name: 'spambypass_step3_rules',
    title: 'Rules Sayfası',
    description: 'Rules kısmına gidin',
    target: {
      selector: 'a[data-value="transportrules"]',
      textMatch: /Rules/i,
      fallback: [
        'a[name="Rules"]',
        'a#transportrules',
        'a[data-automation-id*="transportrules"]'
      ]
    },
    tooltip: 'Rules\'e tıklayın',
    autoClick: false,
    validation: () => {
      return document.location.href.includes('transportrules')
    },
    waitAfterClick: 2000
  },
  {
    id: 4,
    name: 'spambypass_step4_add_rule',
    title: 'Yeni Kural Ekle',
    description: '+ Add a rule butonuna tıklayın',
    target: {
      selector: 'button[aria-label*="Add"]',
      textMatch: /Add a rule/i,
      fallback: [
        'button[name*="Add"]',
        'button:contains("Add a rule")',
        'button.ms-Button--primary'
      ]
    },
    tooltip: '+  Add a rule butonuna tıklayın',
    autoClick: false,
    validation: () => {
      return !!document.querySelector('button[aria-label*="Bypass"]') || document.location.href.includes('new')
    },
    waitAfterClick: 2000
  },
  {
    id: 5,
    name: 'spambypass_step5_bypass_spam',
    title: 'Bypass Spam Filter Seçeneği',
    description: 'Bypass Spam Filter seçeneğini seçin',
    target: {
      selector: 'button[aria-label*="Bypass"]',
      textMatch: /Bypass Spam Filter/i,
      fallback: [
        'div[role="option"]:contains("Bypass Spam Filter")',
        'div[role="menuitem"]:contains("Bypass")',
        'button:contains("Bypass")'
      ]
    },
    tooltip: 'Bypass Spam Filter\'e tıklayın',
    autoClick: false,
    validation: () => {
      return !!document.querySelector('input[placeholder*="name"], input[aria-label*="name"]')
    },
    waitAfterClick: 1500
  },
  {
    id: 6,
    name: 'spambypass_step6_rule_name',
    title: 'Kural İsmi',
    description: 'Beyaz liste kuralı için bir isim girin (örn: "Whitelist Rule")',
    target: {
      selector: 'input[placeholder*="name"]',
      fallback: [
        'input[aria-label*="name"]',
        'input[aria-label*="Name"]',
        'input[type="text"]:first-of-type'
      ]
    },
    tooltip: 'Kural adını girin',
    autoClick: false,
    validation: () => {
      const input = document.querySelector('input[placeholder*="name"]') || document.querySelector('input[aria-label*="name"]')
      return input && input.value && input.value.length > 0
    },
    realTimeValidation: true,
    criticalStep: true,
    waitAfterClick: 500
  },
  {
    id: 7,
    name: 'spambypass_step7_apply_rule_if',
    title: 'Apply This Rule If',
    description: '"Apply this rule if..." kısmını ayarlayın - The sender > IP address seçeneğini tıklayın',
    target: {
      selector: 'button[aria-label*="Apply this rule"]',
      textMatch: /Apply this rule if/i,
      fallback: [
        'button:contains("Apply this rule")',
        'button[aria-label*="condition"]'
      ]
    },
    tooltip: '"Apply this rule if..." ayarlarını yapın',
    autoClick: false,
    validation: () => {
      return true
    },
    waitAfterClick: 2000
  },
  {
    id: 8,
    name: 'spambypass_step8_sender_ip',
    title: 'Gönderici IP Adresi',
    description: 'The sender > IP address is seçeneğini ayarlayın ve IP adreslerini girin',
    target: {
      selector: 'input.ms-BasePicker-input',
      fallback: [
        'textarea.ms-TextField-field',
        'input[aria-label*="IP"]',
        'textarea'
      ]
    },
    tooltip: 'IP adreslerini girin (Her satıra bir IP)',
    autoClick: false,
    validation: () => {
      const input = document.querySelector('input.ms-BasePicker-input') || document.querySelector('textarea')
      return input && input.value && input.value.length > 0
    },
    realTimeValidation: true,
    criticalStep: true,
    waitAfterClick: 500,
    isLabelStep: false
  },
  {
    id: 9,
    name: 'spambypass_step9_do_following',
    title: 'Do The Following',
    description: '"Do the following" kısmında Modify the message properties > Set SCL > -1 ve Bypass spam filtering seçeneğini ayarlayın',
    target: {
      selector: 'button[aria-label*="Do the following"]',
      textMatch: /Do the following/i,
      fallback: [
        'button:contains("Do the following")',
        'button[aria-label*="action"]'
      ]
    },
    tooltip: '"Do the following" ayarlarını yapın',
    autoClick: false,
    validation: () => {
      return true
    },
    waitAfterClick: 2000
  },
  {
    id: 10,
    name: 'spambypass_step10_message_header',
    title: 'Message Header Ayarı',
    description: 'Yeni kural: Modify the message properties > set a message header > X-MS-Exchange-Organization-BypassClutter = true',
    target: {
      selector: 'button[aria-label*="message header"]',
      textMatch: /message header|set a message/i,
      fallback: [
        'button:contains("message header")',
        'button[aria-label*="header"]'
      ]
    },
    tooltip: 'Message header ayarlarını yapın',
    autoClick: false,
    validation: () => {
      return true
    },
    waitAfterClick: 2000
  },
  {
    id: 11,
    name: 'spambypass_step11_save_final',
    title: 'Kaydet',
    description: 'Tüm ayarları kaydedip kuralı oluşturun',
    target: {
      selector: 'button[aria-label*="Save"]',
      textMatch: /Save|Kaydet/i,
      fallback: [
        'button.ms-Button--primary',
        'button[type="button"]:contains("Save")'
      ]
    },
    tooltip: 'Kuralı kaydedin',
    autoClick: false,
    validation: () => {
      return true
    },
    waitAfterClick: 2000
  },
  {
    id: 12,
    name: 'spambypass_summary',
    title: 'Tamamlandı! ✅',
    description: 'Spam Filter Bypass kuralı başarıyla oluşturuldu.',
    isSummary: true
  }
]

/* ========== WORKFLOW 5: ATP Link Bypass (SkipSafeLinksProcessing) ========== */
const ATP_LINK_BYPASS_STEPS = [
  {
    id: 1,
    name: 'atplink_step1_add_rule',
    title: 'Yeni Kural Ekle',
    description: 'Exchange Admin Rules sayfasında + Add a rule butonuna tıklayın',
    target: {
      selector: 'button[aria-label*="Add"]',
      textMatch: /Add a rule/i,
      fallback: [
        'button[name*="Add"]',
        'button:contains("Add a rule")',
        'button.ms-Button--primary'
      ]
    },
    tooltip: '+ Add a rule butonuna tıklayın',
    autoClick: false,
    validation: () => {
      return !!document.querySelector('input[placeholder*="name"], input[aria-label*="name"]')
    },
    waitAfterClick: 3000
  },
  {
    id: 2,
    name: 'atplink_step2_rule_name',
    title: 'Kural İsmi',
    description: 'Beyaz liste kuralı için bir isim girin (örn: "ATP Link Bypass")',
    target: {
      selector: 'input[placeholder*="name"]',
      fallback: [
        'input[aria-label*="name"]',
        'input[aria-label*="Name"]',
        'input[type="text"]:first-of-type'
      ]
    },
    tooltip: 'Kural adını girin',
    autoClick: false,
    validation: () => {
      const input = document.querySelector('input[placeholder*="name"]') || document.querySelector('input[aria-label*="name"]')
      return input && input.value && input.value.length > 0
    },
    realTimeValidation: true,
    criticalStep: true,
    waitAfterClick: 500
  },
  {
    id: 3,
    name: 'atplink_step3_apply_rule_if',
    title: 'Apply This Rule If',
    description: '"Apply this rule if..." > The sender > IP address is in any of these ranges or exactly matches',
    target: {
      selector: 'button[aria-label*="Apply this rule"]',
      textMatch: /Apply this rule if/i,
      fallback: [
        'button:contains("Apply this rule")',
        'button[aria-label*="condition"]'
      ]
    },
    tooltip: '"Apply this rule if..." ayarlarını yapın',
    autoClick: false,
    validation: () => {
      return true
    },
    waitAfterClick: 2000
  },
  {
    id: 4,
    name: 'atplink_step4_sender_ip',
    title: 'Gönderici IP Adresi',
    description: 'The sender > IP address is seçeneğini ayarlayın ve IP adreslerini girin',
    target: {
      selector: 'input.ms-BasePicker-input',
      fallback: [
        'textarea.ms-TextField-field',
        'input[aria-label*="IP"]',
        'textarea'
      ]
    },
    tooltip: 'IP adreslerini girin (Her satıra bir IP)',
    autoClick: false,
    validation: () => {
      const input = document.querySelector('input.ms-BasePicker-input') || document.querySelector('textarea')
      return input && input.value && input.value.length > 0
    },
    realTimeValidation: true,
    criticalStep: true,
    waitAfterClick: 500
  },
  {
    id: 5,
    name: 'atplink_step5_do_following',
    title: 'Do The Following',
    description: '"Do the following" > Modify the message properties > Set a message header',
    target: {
      selector: 'button[aria-label*="Do the following"]',
      textMatch: /Do the following/i,
      fallback: [
        'button:contains("Do the following")',
        'button[aria-label*="action"]'
      ]
    },
    tooltip: '"Do the following" ayarlarını yapın',
    autoClick: false,
    validation: () => {
      return true
    },
    waitAfterClick: 2000
  },
  {
    id: 6,
    name: 'atplink_step6_message_header',
    title: 'Message Header Ayarı',
    description: 'X-MS-Exchange-Organization-SkipSafeLinksProcessing başlığını girin ve 1 değeriyle kaydedin',
    target: {
      selector: 'input[aria-label*="header name"]',
      fallback: [
        'input[placeholder*="header"]',
        'input.ms-TextField-field'
      ]
    },
    tooltip: 'Header name: X-MS-Exchange-Organization-SkipSafeLinksProcessing, Value: 1',
    autoClick: false,
    validation: () => {
      return true
    },
    waitAfterClick: 2000
  },
  {
    id: 7,
    name: 'atplink_step7_save',
    title: 'Kaydet',
    description: 'Kuralı kaydetmek için Save butonuna tıklayın',
    target: {
      selector: 'button[aria-label*="Save"]',
      textMatch: /Save|Kaydet/i,
      fallback: [
        'button.ms-Button--primary',
        'button[type="button"]:contains("Save")'
      ]
    },
    tooltip: 'Kuralı kaydedin',
    autoClick: false,
    validation: () => {
      return true
    },
    waitAfterClick: 2000
  },
  {
    id: 8,
    name: 'atplink_summary',
    title: 'Tamamlandı! ✅',
    description: 'ATP Link Bypass (SkipSafeLinksProcessing) kuralı başarıyla oluşturuldu.',
    isSummary: true
  }
]

/* ========== WORKFLOW 6: ATP Attachment Bypass (SkipSafeAttachmentProcessing) ========== */
const ATP_ATTACHMENT_BYPASS_STEPS = [
  {
    id: 1,
    name: 'atpattach_step1_add_rule',
    title: 'Yeni Kural Ekle',
    description: '+ Add a rule butonuna tıklayın',
    target: {
      selector: 'button[aria-label*="Add"]',
      textMatch: /Add a rule/i,
      fallback: [
        'button[name*="Add"]',
        'button:contains("Add a rule")',
        'button.ms-Button--primary'
      ]
    },
    tooltip: '+ Add a rule butonuna tıklayın',
    autoClick: false,
    validation: () => {
      return !!document.querySelector('input[placeholder*="name"], input[aria-label*="name"]')
    },
    waitAfterClick: 2000
  },
  {
    id: 2,
    name: 'atpattach_step2_rule_name',
    title: 'Kural İsmi',
    description: 'Beyaz liste kuralı için bir isim girin (örn: "ATP Attachment Bypass")',
    target: {
      selector: 'input[placeholder*="name"]',
      fallback: [
        'input[aria-label*="name"]',
        'input[aria-label*="Name"]',
        'input[type="text"]:first-of-type'
      ]
    },
    tooltip: 'Kural adını girin',
    autoClick: false,
    validation: () => {
      const input = document.querySelector('input[placeholder*="name"]') || document.querySelector('input[aria-label*="name"]')
      return input && input.value && input.value.length > 0
    },
    realTimeValidation: true,
    criticalStep: true,
    waitAfterClick: 500
  },
  {
    id: 3,
    name: 'atpattach_step3_apply_rule_if',
    title: 'Apply This Rule If',
    description: '"Apply this rule if..." > The sender > IP address is in any of these ranges or exactly matches',
    target: {
      selector: 'button[aria-label*="Apply this rule"]',
      textMatch: /Apply this rule if/i,
      fallback: [
        'button:contains("Apply this rule")',
        'button[aria-label*="condition"]'
      ]
    },
    tooltip: '"Apply this rule if..." ayarlarını yapın',
    autoClick: false,
    validation: () => {
      return true
    },
    waitAfterClick: 2000
  },
  {
    id: 4,
    name: 'atpattach_step4_sender_ip',
    title: 'Gönderici IP Adresi',
    description: 'The sender > IP address is seçeneğini ayarlayın ve IP adreslerini girin',
    target: {
      selector: 'input.ms-BasePicker-input',
      fallback: [
        'textarea.ms-TextField-field',
        'input[aria-label*="IP"]',
        'textarea'
      ]
    },
    tooltip: 'IP adreslerini girin (Her satıra bir IP)',
    autoClick: false,
    validation: () => {
      const input = document.querySelector('input.ms-BasePicker-input') || document.querySelector('textarea')
      return input && input.value && input.value.length > 0
    },
    realTimeValidation: true,
    criticalStep: true,
    waitAfterClick: 500
  },
  {
    id: 5,
    name: 'atpattach_step5_do_following',
    title: 'Do The Following',
    description: '"Do the following" > Modify the message properties > Set a message header',
    target: {
      selector: 'button[aria-label*="Do the following"]',
      textMatch: /Do the following/i,
      fallback: [
        'button:contains("Do the following")',
        'button[aria-label*="action"]'
      ]
    },
    tooltip: '"Do the following" ayarlarını yapın',
    autoClick: false,
    validation: () => {
      return true
    },
    waitAfterClick: 2000
  },
  {
    id: 6,
    name: 'atpattach_step6_message_header',
    title: 'Message Header Ayarı',
    description: 'X-MS-Exchange-Organization-SkipSafeAttachmentProcessing başlığını girin ve 1 değeriyle kaydedin',
    target: {
      selector: 'input[aria-label*="header name"]',
      fallback: [
        'input[placeholder*="header"]',
        'input.ms-TextField-field'
      ]
    },
    tooltip: 'Header name: X-MS-Exchange-Organization-SkipSafeAttachmentProcessing, Value: 1',
    autoClick: false,
    validation: () => {
      return true
    },
    waitAfterClick: 2000
  },
  {
    id: 7,
    name: 'atpattach_step7_save',
    title: 'Kaydet',
    description: 'Kuralı kaydetmek için Save butonuna tıklayın',
    target: {
      selector: 'button[aria-label*="Save"]',
      textMatch: /Save|Kaydet/i,
      fallback: [
        'button.ms-Button--primary',
        'button[type="button"]:contains("Save")'
      ]
    },
    tooltip: 'Kuralı kaydedin',
    autoClick: false,
    validation: () => {
      return true
    },
    waitAfterClick: 2000
  },
  {
    id: 8,
    name: 'atpattach_summary',
    title: '🎊 Tebrikler! Tüm Adımları Tamamladınız!',
    description: 'ATP Attachment Bypass kuralı başarıyla oluşturuldu. Office 365 ortamında IP adreslerini beyaz listeye aldınız ve güvenlik simülasyonları, spam filtreleme ve tehdit öncesi (ATP) özelliklerini başarıyla yapılandırdınız!',
    isSummary: true
  }
]

/* ========== STORAGE HELPERS ========== */
const Storage = {
  async get(key) {
    return new Promise((resolve) => {
        chrome.storage.local.get([key], (result) => {
          resolve(result[key] || null)
        })
    })
  },
  
  async set(key, value) {
    return new Promise((resolve) => {
        chrome.storage.local.set({ [key]: value }, () => resolve(true))
    })
  }
}

/* ========== ANIMATION UTILITIES ========== */
const AnimationUtils = {
  // Framer Motion benzeri spring animasyon
  animate(element, animation, duration = 300, easing = 'cubic-bezier(0.34, 1.56, 0.64, 1)') {
    if (!element) return
    
    const animations = {
      'fadeIn': 'keepnet-fade-in',
      'fadeInUp': 'keepnet-fade-in-up',
      'slideInRight': 'keepnet-slide-in-right',
      'slideInBottom': 'keepnet-slide-in-bottom',
      'scaleIn': 'keepnet-scale-in',
      'rotateIn': 'keepnet-rotate-in',
      'pulse': 'keepnet-pulse',
      'bounce': 'keepnet-bounce',
      'shake': 'keepnet-shake'
    }
    
    const animationName = animations[animation] || animation
    
    element.style.animation = `${animationName} ${duration}ms ${easing} forwards`
    element.style.opacity = '1'
    
    return new Promise(resolve => {
      setTimeout(() => {
        element.style.animation = ''
        resolve()
      }, duration)
    })
  },
  
  // Stagger animasyon (çocukları sırayla animasyon yap)
  async staggerChildren(parent, animation, staggerDelay = 50) {
    if (!parent) return
    
    const children = Array.from(parent.children)
    for (let i = 0; i < children.length; i++) {
      await Utils.sleep(staggerDelay)
      this.animate(children[i], animation, 300)
    }
  },
  
  // Smooth scroll to element
  scrollToElement(element, offset = -100) {
    if (!element) return
    
    const elementPosition = element.getBoundingClientRect().top
    const offsetPosition = elementPosition + window.pageYOffset + offset
    
    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    })
  },
  
  // Highlight element with animation
  highlightElement(element) {
    if (!element) return
    
    element.classList.add('keepnet-highlight')
    this.animate(element, 'pulse', 600)
    this.scrollToElement(element)
  },
  
  // Remove highlight with fade out
  removeHighlight(element) {
    if (!element) return
    
    element.style.animation = 'keepnet-fade-out 300ms ease-out forwards'
    setTimeout(() => {
      element.classList.remove('keepnet-highlight')
      element.style.animation = ''
    }, 300)
  },
  
  // Progress bar animation
  animateProgressBar(element, from, to, duration = 500) {
    if (!element) return
    
    const startTime = performance.now()
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Easing function (easeOutCubic)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = from + (to - from) * eased
      
      element.style.width = `${current}%`
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    
    requestAnimationFrame(animate)
  },
  
  // Counter animation
  animateCounter(element, from, to, duration = 1000, suffix = '') {
    if (!element) return
    
    const startTime = performance.now()
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(from + (to - from) * eased)
      
      element.textContent = current + suffix
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    
    requestAnimationFrame(animate)
  },
  
  // Confetti effect for completion
  showConfetti(container) {
    const colors = ['#7c3aed', '#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd']
    const confettiCount = 50
    
    for (let i = 0; i < confettiCount; i++) {
      setTimeout(() => {
        const confetti = document.createElement('div')
        confetti.style.cssText = `
          position: fixed;
          width: 10px;
          height: 10px;
          background: ${colors[Math.floor(Math.random() * colors.length)]};
          top: 50%;
          left: 50%;
          border-radius: 50%;
          pointer-events: none;
          z-index: 999999;
        `
        
        container.appendChild(confetti)
        
        const angle = Math.random() * Math.PI * 2
        const velocity = 15 + Math.random() * 15
        const tx = Math.cos(angle) * velocity * 30
        const ty = Math.sin(angle) * velocity * 30
        
        confetti.animate([
          { transform: 'translate(0, 0) scale(0)', opacity: 1 },
          { transform: `translate(${tx}px, ${ty}px) scale(1)`, opacity: 0 }
        ], {
          duration: 1000 + Math.random() * 500,
          easing: 'cubic-bezier(0, .9, .57, 1)'
        }).onfinish = () => confetti.remove()
      }, i * 10)
    }
  }
}

/* ========== UTILITY FUNCTIONS ========== */
const Utils = {
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  },
  
  findElement(target) {
    if (!target) return null
    
    // Önce selector dene (text match olmadan)
    if (target.selector && !target.textMatch) {
      try {
        // :contains() gibi pseudo-selector'ları temizle
        const cleanSelector = target.selector.replace(/:contains\([^)]+\)/g, '')
        if (cleanSelector.trim()) {
          const el = document.querySelector(cleanSelector)
          if (el && this.isVisible(el)) return el
        }
      } catch (e) {}
    }
    
    // Text match varsa
    if (target.textMatch) {
      const regex = typeof target.textMatch === 'string' 
        ? new RegExp(target.textMatch, 'i') 
        : target.textMatch
      
      // Önce selector ile sınırla (eğer varsa)
      let candidates = []
      
      if (target.selector) {
        const selectorBase = target.selector.replace(/:contains\([^)]+\)/g, '').trim()
        if (selectorBase) {
          try {
            candidates = Array.from(document.querySelectorAll(selectorBase))
          } catch (e) {}
        }
      }
      
      // Selector yoksa veya bulunamadıysa fallback dene
      if (candidates.length === 0 && target.fallback) {
        const fallbacks = Array.isArray(target.fallback) ? target.fallback : [target.fallback]
        
        for (const fb of fallbacks) {
          const fallbackBase = fb.replace(/:contains\([^)]+\)/g, '').trim()
          if (fallbackBase) {
            try {
              const fbCandidates = Array.from(document.querySelectorAll(fallbackBase))
              if (fbCandidates.length > 0) {
                candidates = fbCandidates
                break
              }
            } catch (e) {}
          }
        }
      }
      
      // Hiçbiri yoksa tüm elementleri ara
      if (candidates.length === 0) {
        candidates = Array.from(document.querySelectorAll('button, a, span, div[role="tab"], [role="button"]'))
      }
      
      // Text match ile filtrele
      for (const el of candidates) {
        const text = el.textContent || el.innerText || ''
        if (regex.test(text) && this.isVisible(el)) {
          return el
        }
      }
    }
    
    // Fallback dene (text match olmadan) - array veya string olabilir
    if (target.fallback) {
      const fallbacks = Array.isArray(target.fallback) ? target.fallback : [target.fallback]
      
      for (const fb of fallbacks) {
        try {
          const cleanFallback = fb.replace(/:contains\([^)]+\)/g, '').trim()
          if (cleanFallback) {
            const el = document.querySelector(cleanFallback)
            if (el && this.isVisible(el)) {
              console.log('[Keepnet] Element found with fallback:', fb)
              return el
            }
          }
        } catch (e) {
          console.warn('[Keepnet] Fallback selector error:', fb)
        }
      }
    }
    
    return null
  },
  
  isVisible(el) {
    if (!el) return false
    return !!(el.offsetWidth && el.offsetHeight && el.offsetParent)
  },
  
  scrollToElement(el) {
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

/* ========== SCREENSHOT MANAGER ========== */
class ScreenshotManager {
  constructor() {
    this.screenshots = {}
  }
  
  async init() {
    this.screenshots = await Storage.get(STORAGE_KEYS.SCREENSHOTS) || {}
  }
  
  async capture(stepName) {
    try {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'captureScreenshot',
          stepName: stepName
        }, (response) => {
          resolve(response?.dataUrl || null)
        })
      })
    } catch (error) {
      console.error("[Keepnet] Screenshot error:", error)
      return null
    }
  }
  
  async save(stepName, dataUrl, validationResult = {}) {
    this.screenshots[stepName] = {
      dataUrl,
      timestamp: new Date().toISOString(),
      validation: validationResult
    }
    
    await Storage.set(STORAGE_KEYS.SCREENSHOTS, this.screenshots)
    console.log(`[Keepnet] Screenshot saved: ${stepName}.png`)
  }
  
  getAll() {
    return this.screenshots
  }
}

/* ========== AUTO CLICK ENGINE ========== */
class AutoClickEngine {
  constructor() {
    this.timeout = null
    this.countdown = null
    this.onTimeout = null
  }
  
  start(element, delay, callback) {
    this.stop()
    
    let remaining = delay
    this.onTimeout = callback
    
    // Countdown göster
    this.countdown = setInterval(() => {
      remaining -= 1000
      if (remaining <= 0) {
        clearInterval(this.countdown)
      } else {
        console.log(`[Keepnet] Auto-click in ${remaining / 1000}s...`)
      }
    }, 1000)
    
    // Timeout
    this.timeout = setTimeout(() => {
      console.log("[Keepnet] Auto-clicking element:", element)
      this.clickElement(element)
      if (callback) callback()
    }, delay)
  }
  
  stop() {
    if (this.timeout) {
      clearTimeout(this.timeout)
      this.timeout = null
    }
    if (this.countdown) {
      clearInterval(this.countdown)
      this.countdown = null
    }
  }
  
  clickElement(el) {
    if (!el) return
    
    try {
      // Mouse events dispatch et
      const rect = el.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      
      const clickEvent = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true,
        clientX: centerX,
        clientY: centerY
      })
      
      el.dispatchEvent(clickEvent)
      
      // Fallback
      if (el.click) {
        el.click()
      }
    } catch (e) {
      console.error("[Keepnet] Click error:", e)
    }
  }
}

/* ========== FLOATING PANEL (SOL-ALT) ========== */
class FloatingPanel {
  constructor() {
    this.container = null
    this.header = null
    this.body = null
    this.footer = null
    this.isDragging = false
    this.dragOffset = { x: 0, y: 0 }
    this.position = { x: 20, y: window.innerHeight - PANEL_SIZE.height - 20 } // SOL-ALT
  }
  
  async init() {
    const savedState = await Storage.get(STORAGE_KEYS.PANEL_STATE)
    if (savedState?.position) {
      this.position = savedState.position
    }
    
    this.createPanel()
    this.attachEventListeners()
    this.injectStyles()
  }
  
  createPanel() {
    if (this.container) return
    
    this.container = document.createElement('div')
    this.container.id = 'keepnet-floating-panel'
    this.container.style.cssText = `
      position: fixed !important;
      top: ${this.position.y}px !important;
      left: ${this.position.x}px !important;
      width: ${PANEL_SIZE.width}px !important;
      height: ${PANEL_SIZE.height}px !important;
      background: white !important;
      border-radius: 12px !important;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.1) !important;
      z-index: 2147483647 !important;
      display: flex !important;
      flex-direction: column !important;
      overflow: hidden !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      opacity: 0 !important;
      visibility: visible !important;
      pointer-events: auto !important;
      transform: translateX(100px) scale(0.95) !important;
      transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
    `
    
    console.log("[Keepnet] Panel created at:", this.position)
    
    // Trigger entrance animation
    requestAnimationFrame(() => {
      this.container.style.opacity = '1'
      this.container.style.transform = 'translateX(0) scale(1)'
    })
    
    // Header
    this.header = document.createElement('div')
    this.header.style.cssText = `
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 14px;
      cursor: move;
      display: flex;
      align-items: center;
      justify-content: space-between;
      user-select: none;
    `
    
    this.header.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <div style="font-size: 16px;">🛡️</div>
        <div>
          <div style="font-size: 13px; font-weight: 600;">Keepnet White List</div>
          <div style="font-size: 11px; opacity: 0.85;" id="keepnet-step-indicator">Adım 0 / ${TOTAL_STEPS}</div>
        </div>
      </div>
      <button id="keepnet-close-btn" style="
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        width: 24px;
        height: 24px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 16px;
        line-height: 1;
      ">×</button>
    `
    
    // Progress bar
    const progressBar = document.createElement('div')
    progressBar.style.cssText = `
      width: 100%;
      height: 3px;
      background: rgba(0,0,0,0.1);
    `
    progressBar.innerHTML = `
      <div id="keepnet-progress-bar" style="
        width: 0%;
        height: 100%;
        background: #22c55e;
        transition: width 0.4s ease;
      "></div>
    `
    this.header.appendChild(progressBar)
    
    // Body
    this.body = document.createElement('div')
    this.body.id = 'keepnet-panel-body'
    this.body.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      background: #f9fafb;
    `
    
    // Footer
    this.footer = document.createElement('div')
    this.footer.id = 'keepnet-panel-footer'
    this.footer.style.cssText = `
      padding: 12px 14px;
      background: white;
      border-top: 1px solid #e5e7eb;
      display: flex;
      gap: 8px;
      justify-content: space-between;
    `
    
    this.footer.innerHTML = `
      <button id="keepnet-prev-btn" class="keepnet-btn keepnet-btn-secondary" style="flex: 1;">
        ← Geri
      </button>
      <button id="keepnet-next-btn" class="keepnet-btn keepnet-btn-primary" style="flex: 2;">
        Devam Et →
      </button>
      <button id="keepnet-summary-btn" class="keepnet-btn keepnet-btn-secondary" style="flex: 1; font-size: 11px;" title="Tamamlanmamış adımları atla ve özet rapora git">
        📊 Özet
      </button>
    `
    
    this.container.appendChild(this.header)
    this.container.appendChild(this.body)
    this.container.appendChild(this.footer)
    
    console.log("[Keepnet] Appending panel to body...")
    document.body.appendChild(this.container)
    console.log("[Keepnet] Panel appended! Visible:", this.container.offsetWidth > 0)
    
    // Force visibility check
    setTimeout(() => {
      if (this.container.style.display === 'none' || !this.container.offsetWidth) {
        console.warn("[Keepnet] Panel not visible! Forcing...")
        this.container.style.display = 'flex'
        this.container.style.opacity = '1'
        this.container.style.visibility = 'visible'
      }
    }, 100)
  }
  
  attachEventListeners() {
    // Dragging
    this.header.addEventListener('mousedown', (e) => {
      if (e.target.id === 'keepnet-close-btn') return
      this.isDragging = true
      this.dragOffset = {
        x: e.clientX - this.position.x,
        y: e.clientY - this.position.y
      }
    })
    
    document.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return
      
      this.position = {
        x: e.clientX - this.dragOffset.x,
        y: e.clientY - this.dragOffset.y
      }
      
      this.updatePosition()
    })
    
    document.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false
        this.saveState()
      }
    })
    
    // Close button
    const closeBtn = document.getElementById('keepnet-close-btn')
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        console.log("[Keepnet] Close button clicked")
        this.container.style.display = 'none'
      })
    }
  }
  
  updatePosition() {
    if (this.container) {
      this.container.style.left = `${this.position.x}px`
      this.container.style.top = `${this.position.y}px`
    }
  }
  
  setContent(html) {
    this.body.innerHTML = html
  }
  
  updateProgress(current, total) {
    const percent = Math.round((current / total) * 100)
    
    const progressBar = document.getElementById('keepnet-progress-bar')
    if (progressBar) {
      const currentWidth = parseInt(progressBar.style.width) || 0
      AnimationUtils.animateProgressBar(progressBar, currentWidth, percent, 600)
      
      // Add shimmer effect on progress
      progressBar.style.background = `linear-gradient(90deg, 
        #22c55e 0%, 
        #16a34a 50%, 
        #22c55e 100%)`
      progressBar.style.backgroundSize = '200% 100%'
      progressBar.style.animation = 'keepnet-shimmer 2s linear infinite'
    }
    
    const indicator = document.getElementById('keepnet-step-indicator')
    if (indicator) {
      indicator.style.transition = 'all 0.3s ease'
      indicator.textContent = `Adım ${current} / ${total}`
      AnimationUtils.animate(indicator, 'pulse', 300)
    }
  }
  
  showError(message) {
    const existing = this.body.querySelector('.keepnet-error-message')
    if (existing) {
      AnimationUtils.animate(existing, 'shake', 500)
      return
    }
    
    const errorEl = document.createElement('div')
    errorEl.className = 'keepnet-error-message'
    errorEl.style.cssText = `
      background: #fee2e2;
      border: 1px solid #fecaca;
      color: #991b1b;
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 12px;
      font-size: 13px;
      font-weight: 500;
      opacity: 0;
      transform: translateY(-10px);
    `
    errorEl.textContent = message
    
    this.body.insertBefore(errorEl, this.body.firstChild)
    
    // Animate entrance
    AnimationUtils.animate(errorEl, 'fadeInUp', 400)
  }
  
  showSuccess(message) {
    const existing = this.body.querySelector('.keepnet-success-message')
    if (existing) existing.remove()
    
    const successEl = document.createElement('div')
    successEl.className = 'keepnet-success-message'
    successEl.style.cssText = `
      background: #d1fae5;
      border: 1px solid #a7f3d0;
      color: #065f46;
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 12px;
      font-size: 13px;
      font-weight: 500;
      opacity: 0;
      transform: scale(0.9);
    `
    successEl.textContent = message
    
    this.body.insertBefore(successEl, this.body.firstChild)
    
    // Animate entrance with scale
    AnimationUtils.animate(successEl, 'scaleIn', 500)
  }
  
  async saveState() {
    await Storage.set(STORAGE_KEYS.PANEL_STATE, {
      position: this.position
    })
  }
  
  injectStyles() {
    if (document.getElementById('keepnet-styles')) {
      console.log("[Keepnet] Styles already injected")
      return
    }
    
    console.log("[Keepnet] Injecting styles...")
    const style = document.createElement('style')
    style.id = 'keepnet-styles'
    style.textContent = `
      .keepnet-btn {
        padding: 8px 14px;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 500;
        border: none;
        cursor: pointer;
        transition: all 0.2s;
        font-family: inherit;
      }
      
      .keepnet-btn-primary {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }
      
      .keepnet-btn-primary:hover {
        opacity: 0.9;
        transform: translateY(-1px);
      }
      
      .keepnet-btn-secondary {
        background: white;
        color: #374151;
        border: 1px solid #d1d5db;
      }
      
      .keepnet-btn-secondary:hover {
        background: #f3f4f6;
      }
      
      #keepnet-panel-body::-webkit-scrollbar {
        width: 6px;
      }
      
      #keepnet-panel-body::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 3px;
      }
      
      .keepnet-highlight {
        outline: 4px solid #10b981 !important;
        outline-offset: 4px !important;
        background-color: rgba(16, 185, 129, 0.15) !important;
        box-shadow: 
          0 0 0 6px rgba(16, 185, 129, 0.3),
          0 0 20px rgba(16, 185, 129, 0.5),
          inset 0 0 20px rgba(16, 185, 129, 0.1) !important;
        position: relative !important;
        z-index: 999998 !important;
        animation: keepnet-pulse 2s ease-in-out infinite !important;
        cursor: pointer !important;
        transform: scale(1.02) !important;
        transition: all 0.3s ease !important;
      }
      
      @keyframes keepnet-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
      
      @keyframes keepnet-bounce {
        0%, 100% { 
          transform: translateY(0px); 
          opacity: 1;
        }
        50% { 
          transform: translateY(-8px); 
          opacity: 0.8;
        }
      }
      
      .keepnet-tooltip {
        position: fixed;
        background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
        color: white;
        padding: 12px 20px;
        border-radius: 12px;
        font-size: 16px;
        font-weight: 600;
        pointer-events: none;
        z-index: 1000000;
        box-shadow: 0 8px 24px rgba(124, 58, 237, 0.5), 0 0 0 2px rgba(255,255,255,0.8);
        white-space: nowrap;
        animation: keepnet-tooltip-pulse 2s ease-in-out infinite;
      }
      
      .keepnet-tooltip::before {
        content: '→';
        display: inline-block;
        margin-right: 8px;
        font-size: 20px;
        animation: keepnet-bounce 1s ease-in-out infinite;
      }
      
      @keyframes keepnet-tooltip-pulse {
        0%, 100% { 
          transform: scale(1);
          box-shadow: 0 8px 24px rgba(124, 58, 237, 0.5), 0 0 0 2px rgba(255,255,255,0.8);
        }
        50% { 
          transform: scale(1.05);
          box-shadow: 0 12px 32px rgba(124, 58, 237, 0.7), 0 0 0 3px rgba(255,255,255,1);
        }
      }
    `
    
    document.head.appendChild(style)
  }
}

/* ========== MAIN ORCHESTRATOR ========== */
class KeepnetAssistant {
  constructor() {
    this.panel = null
    this.autoClick = null
    this.screenshots = null
    this.currentStep = 0
    this.stepResults = {}
    this.highlightedElement = null
    this.tooltip = null
    this.validationInterval = null
    this.currentWorkflow = WORKFLOW_STEPS  // Aktif workflow
    this.workflowName = 'WORKFLOW_1'  // Workflow adı
  }
  
  async init() {
    try {
      console.log("[Keepnet] Initializing assistant...")
      
      // Hangi workflow'dayız? URL'ye göre belirle
      const currentUrl = window.location.href
      const nextWorkflowName = await Storage.get('keepnet_next_workflow')
      
      if (nextWorkflowName) {
        // Yeni workflow başlatılıyor
        console.log("[Keepnet] 🚀 Starting new workflow from storage:", nextWorkflowName)
        
        if (nextWorkflowName === 'WORKFLOW_2') {
          this.currentWorkflow = THREAT_POLICIES_STEPS
          this.workflowName = 'WORKFLOW_2'
        } else if (nextWorkflowName === 'WORKFLOW_3') {
          this.currentWorkflow = SAFE_LINKS_STEPS
          this.workflowName = 'WORKFLOW_3'
        } else if (nextWorkflowName === 'WORKFLOW_4') {
          this.currentWorkflow = SPAM_FILTER_BYPASS_STEPS
          this.workflowName = 'WORKFLOW_4'
          console.log("[Keepnet] ✅ WORKFLOW_4 (Spam Filter Bypass) selected!")
        } else if (nextWorkflowName === 'WORKFLOW_5') {
          this.currentWorkflow = ATP_LINK_BYPASS_STEPS
          this.workflowName = 'WORKFLOW_5'
          console.log("[Keepnet] ✅ WORKFLOW_5 (ATP Link Bypass) selected!")
        } else if (nextWorkflowName === 'WORKFLOW_6') {
          this.currentWorkflow = ATP_ATTACHMENT_BYPASS_STEPS
          this.workflowName = 'WORKFLOW_6'
          console.log("[Keepnet] ✅ WORKFLOW_6 (ATP Attachment Bypass) selected!")
        }
        
        // Workflow değiştiği için tüm state'i temizle
        console.log("[Keepnet] 🧹 Clearing all state for new workflow...")
        this.currentStep = 0
        this.stepResults = {}
        await Storage.set(STORAGE_KEYS.CURRENT_STEP, 0)
        await Storage.set(STORAGE_KEYS.STEP_RESULTS, {})
        
        // ⚠️ ÖNEMLI: nextWorkflowName varsa, URL kontrolünü ATLAMA!
        // Workflow zaten yukarıda seçildi, URL'ye bakmaya gerek yok
      } else {
        // nextWorkflowName YOK, URL'ye göre workflow belirle
        if (currentUrl.includes('/antispam')) {
          console.log("[Keepnet] Detected Anti-Spam page, setting WORKFLOW_2")
          this.currentWorkflow = THREAT_POLICIES_STEPS
          this.workflowName = 'WORKFLOW_2'
        } else if (currentUrl.includes('/safelinks') || currentUrl.includes('/threatpolicy')) {
          console.log("[Keepnet] Detected Safe Links page, setting WORKFLOW_3")
          this.currentWorkflow = SAFE_LINKS_STEPS
          this.workflowName = 'WORKFLOW_3'
        } else if (currentUrl.includes('admin.exchange.microsoft.com')) {
          console.log("[Keepnet] Detected Exchange Admin page, setting WORKFLOW_4 (default)")
          // Exchange admin sayfasında varsayılan olarak WORKFLOW_4
          this.currentWorkflow = SPAM_FILTER_BYPASS_STEPS
          this.workflowName = 'WORKFLOW_4'
        } else {
          console.log("[Keepnet] Default to WORKFLOW_1 (Phishing Simulation)")
          this.currentWorkflow = WORKFLOW_STEPS
          this.workflowName = 'WORKFLOW_1'
        }
      }
      
      console.log("[Keepnet] Current workflow:", this.workflowName)
      
      // Load saved progress (ama sadece yeni workflow değilse)
      if (!nextWorkflowName) {
      const saved = await Storage.get(STORAGE_KEYS.CURRENT_STEP)
      if (saved && saved > 0) {
        this.currentStep = saved
          console.log("[Keepnet] 📂 Loaded saved step:", saved)
      } else {
        this.currentStep = 1
      }
      
      const savedResults = await Storage.get(STORAGE_KEYS.STEP_RESULTS)
        if (savedResults) {
          this.stepResults = savedResults
          console.log("[Keepnet] 📂 Loaded saved results")
        }
      } else {
        // Yeni workflow başlatıyoruz, saved state yükleme
        this.currentStep = 1
        console.log("[Keepnet] 🆕 New workflow, starting from step 1")
      }
      
      // Initialize components
      this.panel = new FloatingPanel()
      await this.panel.init()
      
      this.autoClick = new AutoClickEngine()
      
      this.screenshots = new ScreenshotManager()
      await this.screenshots.init()
      
      // Attach button handlers
      this.attachButtonHandlers()
      
      // Global fonksiyonları tanımla (summary ekranı için)
      this.setupGlobalFunctions()
      
      // Start first step (navigation step ise 2. adımdan başla)
      const firstStep = this.currentWorkflow[this.currentStep - 1]
      if (firstStep && firstStep.isNavigation && this.currentStep === 1) {
        // Navigation adımını atla, 2. adıma geç
        console.log("[Keepnet] Skipping navigation step, starting from step 2")
        this.currentStep = 2
        await Storage.set(STORAGE_KEYS.CURRENT_STEP, 2)
        await this.executeStep(2)
      } else {
        // Normal şekilde başlat
      await this.executeStep(this.currentStep)
      }
      
      console.log("[Keepnet] Assistant ready!")
    } catch (error) {
      console.error("[Keepnet] Init error:", error)
      alert("Keepnet Asistanı başlatılamadı. Lütfen sayfayı yenileyip tekrar deneyin.\n\nHata: " + error.message)
    }
  }
  
  setupGlobalFunctions() {
    const assistant = this
    
    console.log("[Keepnet] setupGlobalFunctions() called")
    
    // Global function - Sonraki workflow'a git
    window.keepnetContinueWorkflow = async () => {
      console.log("[Keepnet] keepnetContinueWorkflow() called!")
      console.log("[Keepnet] Continuing to next workflow...")
      console.log("[Keepnet] Current workflow:", assistant.workflowName)
      
      try {
        // Hangi workflow'a geçeceğiz?
        let nextWorkflow = null
        let nextWorkflowName = ''
        
        if (assistant.workflowName === 'WORKFLOW_1') {
          console.log("[Keepnet] Starting WORKFLOW_2 (THREAT_POLICIES_STEPS)...")
          nextWorkflow = THREAT_POLICIES_STEPS
          nextWorkflowName = 'WORKFLOW_2'
        } else if (assistant.workflowName === 'WORKFLOW_2') {
          console.log("[Keepnet] Starting WORKFLOW_3 (SAFE_LINKS_STEPS)...")
          nextWorkflow = SAFE_LINKS_STEPS
          nextWorkflowName = 'WORKFLOW_3'
        } else if (assistant.workflowName === 'WORKFLOW_3') {
          console.log("[Keepnet] Starting WORKFLOW_4 (SPAM_FILTER_BYPASS_STEPS)...")
          nextWorkflow = SPAM_FILTER_BYPASS_STEPS
          nextWorkflowName = 'WORKFLOW_4'
        } else if (assistant.workflowName === 'WORKFLOW_4') {
          console.log("[Keepnet] Starting WORKFLOW_5 (ATP_LINK_BYPASS_STEPS)...")
          nextWorkflow = ATP_LINK_BYPASS_STEPS
          nextWorkflowName = 'WORKFLOW_5'
        } else if (assistant.workflowName === 'WORKFLOW_5') {
          console.log("[Keepnet] Starting WORKFLOW_6 (ATP_ATTACHMENT_BYPASS_STEPS)...")
          nextWorkflow = ATP_ATTACHMENT_BYPASS_STEPS
          nextWorkflowName = 'WORKFLOW_6'
        } else if(assistant.workflowName === 'WORKFLOW_6'){
          console.log("[Keepnet] No more workflows!")
          assistant.panel?.showSuccess('✅ Tüm workflow\'lar tamamlandı!')
          return
        }
        
        // Step results'ı temizle
        assistant.stepResults = {}
        await Storage.set(STORAGE_KEYS.STEP_RESULTS, {})
        
        // Yeni workflow'u storage'a kaydet
        await Storage.set('keepnet_next_workflow', nextWorkflowName)
        
        // İlk adımın navigation adımı olup olmadığını kontrol et
        const firstStep = nextWorkflow[0]
        
        if (firstStep.isNavigation && firstStep.navigate) {
          // Navigation adımı varsa direkt sayfaya git
          console.log("[Keepnet] First step is navigation, going to:", firstStep.navigate)
          
          // Adım 1'i kaydet (sayfa yüklendiğinde devam etmek için)
          await Storage.set(STORAGE_KEYS.CURRENT_STEP, 1)
          
          // Şu anki URL ile karşılaştır
          const currentUrl = window.location.href
          const targetUrl = firstStep.navigate
          
          console.log("[Keepnet] Current URL:", currentUrl)
          console.log("[Keepnet] Target URL:", targetUrl)
          
          // WORKFLOW_5'ten WORKFLOW_6'ya geçerken reload yapma!
          if (nextWorkflowName === 'WORKFLOW_6' && currentUrl.includes('admin.exchange.microsoft.com')) {
            console.log("[Keepnet] 🚀 WORKFLOW_6 - Same page transition, no reload needed!")
            // Aynı sayfada devam et, reload yapma
            assistant.currentWorkflow = nextWorkflow
            assistant.workflowName = nextWorkflowName
            assistant.currentStep = 0
            await Storage.set(STORAGE_KEYS.CURRENT_STEP, 0)
            
            // Footer'ı tekrar göster
            const footer = document.getElementById('keepnet-panel-footer')
            if (footer) {
              footer.style.display = 'flex'
            }
            
            console.log("[Keepnet] 🚀 Starting WORKFLOW_6 on same page...")
            await assistant.executeStep(1, nextWorkflow)
            return
          } else if (currentUrl.includes('admin.exchange.microsoft.com') && targetUrl.includes('admin.exchange.microsoft.com')) {
            console.log("[Keepnet] ⚠️ Already on Exchange Admin, reloading page to start new workflow...")
            window.location.reload()
          } else {
            // Farklı sayfaya git
            console.log("[Keepnet] Navigating to:", targetUrl)
            window.location.href = targetUrl
          }
        } else {
          // Navigation adımı yoksa - aynı sayfada devam et!
          console.log("[Keepnet] No navigation step, starting workflow on same page...")
          console.log("[Keepnet] Next workflow:", nextWorkflowName)
          
          // WORKFLOW_6 için özel mantık
          if (nextWorkflowName === 'WORKFLOW_6') {
            console.log("[Keepnet] 🎯 WORKFLOW_6 detected - special handling!")
            
            // Footer'ı tekrar göster
            const footer = document.getElementById('keepnet-panel-footer')
            if (footer) {
              footer.style.display = 'flex'
            }
            
            // Workflow ve state'i güncelle
            assistant.currentWorkflow = nextWorkflow
            assistant.workflowName = nextWorkflowName
            assistant.currentStep = 0
            await Storage.set(STORAGE_KEYS.CURRENT_STEP, 0)
            
            console.log("[Keepnet] 🚀 Starting WORKFLOW_6 on same page...")
            
            // Yeni workflow'u başlat
            await assistant.executeStep(1, nextWorkflow)
            console.log("[Keepnet] ✅ WORKFLOW_6 Step 1 executed successfully!")
            return
          }
          
          // Diğer workflow'lar için normal mantık
          // Footer'ı tekrar göster
          const footer = document.getElementById('keepnet-panel-footer')
          if (footer) {
            footer.style.display = 'flex'
          }
          
          // Workflow ve state'i güncelle
          assistant.currentWorkflow = nextWorkflow
          assistant.workflowName = nextWorkflowName
          assistant.currentStep = 0
          await Storage.set(STORAGE_KEYS.CURRENT_STEP, 0)
          
          console.log("[Keepnet] 🚀 Starting", nextWorkflowName, "on same page...")
          
          // Yeni workflow'u başlat
          await assistant.executeStep(1, nextWorkflow)
          console.log("[Keepnet] ✅ Step 1 executed successfully!")
        }
      } catch (error) {
        console.error("[Keepnet] Error continuing workflow:", error)
        assistant.panel?.showError(`❌ Hata: ${error.message}`)
      }
    }
    
    // Global function - Git ve Düzelt için
    window.keepnetGoToStep = async (stepId) => {
      console.log(`[Keepnet] Git ve Düzelt clicked for step ${stepId}`)
      
      // Adıma göre doğru URL'yi belirle
      const urlMap = {
        1: 'https://security.microsoft.com/homepage',
        2: 'https://security.microsoft.com/homepage',
        3: 'https://security.microsoft.com/securitypoliciesandrules',
        4: 'https://security.microsoft.com/threatpolicy',
        5: 'https://security.microsoft.com/advanceddelivery',
        6: 'https://security.microsoft.com/advanceddelivery?viewid=PhishingSimulation',
        7: 'https://security.microsoft.com/advanceddelivery?viewid=PhishingSimulation',
        8: 'https://security.microsoft.com/advanceddelivery?viewid=PhishingSimulation',
        9: 'https://security.microsoft.com/advanceddelivery?viewid=PhishingSimulation',
        10: 'https://security.microsoft.com/advanceddelivery?viewid=PhishingSimulation',
        11: 'https://security.microsoft.com/advanceddelivery?viewid=PhishingSimulation'
      }
      
      const targetUrl = urlMap[stepId]
      if (targetUrl) {
        const currentUrl = window.location.href
        // Farklı sayfadaysak, önce doğru sayfaya git
        if (!currentUrl.startsWith(targetUrl.split('?')[0])) {
          console.log(`[Keepnet] Git ve Düzelt: Navigating to ${targetUrl}`)
          
          // "Git ve Düzelt" modunu işaretle
          await Storage.set('keepnet_fixing_step', true)
          // Step'i kaydet
          await Storage.set(STORAGE_KEYS.CURRENT_STEP, stepId)
          
          // Sayfayı değiştir
          window.location.href = targetUrl
          return
        }
      }
      
      // Aynı sayfadayız, direkt adıma geç
      assistant.executeStep(stepId)
    }
    
    console.log("[Keepnet] Global functions registered")
  }
  
  attachButtonHandlers() {
    // setTimeout ile bekle ki DOM hazır olsun
    setTimeout(() => {
      const nextBtn = document.getElementById('keepnet-next-btn')
      const prevBtn = document.getElementById('keepnet-prev-btn')
      const summaryBtn = document.getElementById('keepnet-summary-btn')
      
      if (nextBtn) {
        nextBtn.onclick = (e) => {
          e.preventDefault()
          e.stopPropagation()
          console.log("[Keepnet] Next button clicked")
          this.nextStep()
        }
      }
      
      if (prevBtn) {
        prevBtn.onclick = (e) => {
          e.preventDefault()
          e.stopPropagation()
          console.log("[Keepnet] Prev button clicked")
          this.prevStep()
        }
      }
      
      if (summaryBtn) {
        summaryBtn.onclick = (e) => {
          e.preventDefault()
          e.stopPropagation()
          console.log("[Keepnet] Summary button clicked - jumping to summary")
          this.showSummary()
        }
      }
      
      console.log("[Keepnet] Button handlers attached")
    }, 100)
  }
  
  async executeStep(stepNum, customSteps = null) {
    try {
      // Hangi steps array'ini kullanacağız?
      if (customSteps) {
        this.currentWorkflow = customSteps
        this.workflowName = customSteps === THREAT_POLICIES_STEPS ? 'WORKFLOW_2' : 
                           customSteps === SAFE_LINKS_STEPS ? 'WORKFLOW_3' : 'WORKFLOW_1'
        console.log(`[Keepnet] Switching to ${this.workflowName}`)
      }
      
      const stepsArray = this.currentWorkflow
      const step = stepsArray[stepNum - 1]
      
      if (!step) {
        console.error("[Keepnet] Step not found:", stepNum)
        return
      }
      
      console.log(`[Keepnet] Executing step ${stepNum}: ${step.title}`)
      
      this.currentStep = stepNum
      await Storage.set(STORAGE_KEYS.CURRENT_STEP, stepNum)
      
      // Update panel
      const totalSteps = stepsArray.length
      this.panel.updateProgress(stepNum, totalSteps)
      
      // Footer'ı göster (summary değilse)
      const footer = document.getElementById('keepnet-panel-footer')
      if (footer && !step.isSummary) {
        footer.style.display = 'flex'
      }
      
      // Clear previous highlights
      this.clearHighlight()
      
      // Summary step?
      if (step.isSummary) {
        await this.showSummary()
        return
      }
      
      // Render step content
      this.renderStepContent(step)
      
      // Navigate if needed - AMA sadece navigation step DEĞİLSE otomatik git
      // Navigation step ise butonu göster, kullanıcı bassın
      if (step.navigate && !step.isNavigation) {
        const currentUrl = window.location.href
        const targetUrl = step.navigate
        
        // Daha akıllı URL karşılaştırması
        const needsNavigation = !currentUrl.startsWith(targetUrl.split('?')[0])
        
        if (needsNavigation) {
          console.log(`[Keepnet] Navigating to: ${targetUrl}`)
          window.location.href = targetUrl
          // Wait for load
          await Utils.sleep(2000)
          return
        } else {
          console.log(`[Keepnet] Already on target page, skipping navigation`)
        }
      }
      
      // isNavigation step ise, sadece butonu göster (renderStepContent zaten gösterdi)
      if (step.isNavigation) {
        console.log(`[Keepnet] Navigation step - waiting for user to click button`)
        return
      }
      
      // Wait a bit for page to settle
      await Utils.sleep(500)
      
      // Find and highlight target
      if (step.target) {
        const element = Utils.findElement(step.target)
        
        if (element) {
          this.highlightElement(element, step.tooltip)
          
          // Auto-click?
          if (step.autoClick) {
            this.autoClick.start(element, AUTO_CLICK_TIMEOUT, async () => {
              await this.onElementClicked(step)
            })
          }
          
          // Manual click listener
          element.addEventListener('click', async () => {
            this.autoClick.stop()
            await this.onElementClicked(step)
          }, { once: true })
        } else {
          console.warn("[Keepnet] Element not found:", step.title)
          this.panel.showError(`⚠️ Element bulunamadı: ${step.title}\n\nLütfen manuel olarak devam edin.`)
        }
      }
      
      // Real-time validation?
      if (step.realTimeValidation) {
        this.startRealTimeValidation(step)
      }
      
      // Auto-fill for IP step?
      if (step.autoFill && step.id === 8) {
        this.setupAutoFillForIPs(step)
      }
    } catch (error) {
      console.error("[Keepnet] executeStep error:", error)
      this.panel?.showError(`❌ Hata: ${error.message}`)
    }
  }
  
  renderStepContent(step) {
    let html = `
      <div class="keepnet-step-content">
        <h3 style="margin: 0 0 8px 0; font-size: 15px; color: #111827;">
          ${step.title}
        </h3>
        <p style="margin: 0 0 12px 0; font-size: 13px; color: #6b7280; line-height: 1.5;">
          ${step.description}
        </p>
    `
    
    // Navigation step için "Sayfaya Git" butonu
    if (step.isNavigation && step.navigate) {
      html += `
        <div style="background: linear-gradient(135deg, rgba(124, 58, 237, 0.08), rgba(99, 102, 241, 0.08)); border: 2px solid #7c3aed; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
          <div style="font-size: 13px; font-weight: 600; color: #5b21b6; margin-bottom: 8px;">
            ${step.title}
          </div>
          <button id="keepnet-navigate-btn" data-url="${step.navigate}" style="
            width: 100%;
            background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
            color: white;
            border: none;
            border-radius: 6px;
            padding: 10px 16px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 2px 4px rgba(124, 58, 237, 0.3);
          " onmouseover="this.style.transform='scale(1.02)'; this.style.boxShadow='0 4px 8px rgba(124, 58, 237, 0.5)'"
             onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 2px 4px rgba(124, 58, 237, 0.3)'">
            🌐 Sayfaya Git
          </button>
        </div>
      `
    }
    
    // Step 1 Workflow 1 için eski buton (geriye dönük uyumluluk)
    if (step.id === 1 && step.name === 'step1_home') {
      html += `
        <div style="background: linear-gradient(135deg, rgba(124, 58, 237, 0.08), rgba(99, 102, 241, 0.08)); border: 2px solid #7c3aed; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
          <div style="font-size: 13px; font-weight: 600; color: #5b21b6; margin-bottom: 8px;">
            Microsoft Security Center'a git
          </div>
          <button id="keepnet-go-to-security-btn" style="
            width: 100%;
            background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
            color: white;
            border: none;
            border-radius: 6px;
            padding: 10px 16px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 2px 4px rgba(124, 58, 237, 0.3);
          " onmouseover="this.style.transform='scale(1.02)'; this.style.boxShadow='0 4px 8px rgba(124, 58, 237, 0.5)'"
             onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 2px 4px rgba(124, 58, 237, 0.3)'">
            🌐 Sayfaya Git
          </button>
        </div>
      `
    }
    
    // IP Adresleri için özel liste (Workflow 1 step 9 veya Workflow 2 step 5)
    if (step.id === 9 || step.name === 'antispam_step5_add_ips') {
      html += `
        <div style="background: linear-gradient(135deg, rgba(124, 58, 237, 0.08), rgba(99, 102, 241, 0.08)); border: 2px solid #7c3aed; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
          <div style="font-size: 13px; font-weight: 600; color: #5b21b6; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
            📋 White List IP Adresleri
          </div>
          <div style="background: white; border-radius: 6px; padding: 8px; margin-bottom: 8px; font-family: 'Courier New', monospace; font-size: 13px; color: #1f2937;">
            <div style="padding: 4px 0;">149.72.161.59</div>
            <div style="padding: 4px 0;">149.72.42.201</div>
            <div style="padding: 4px 0;">149.72.154.87</div>
          </div>
          <button id="keepnet-copy-ips-btn" style="
            width: 100%;
            background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
            color: white;
            border: none;
            border-radius: 6px;
            padding: 8px 12px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 2px 4px rgba(124, 58, 237, 0.3);
          " onmouseover="this.style.transform='scale(1.02)'; this.style.boxShadow='0 4px 8px rgba(124, 58, 237, 0.5)'"
             onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 2px 4px rgba(124, 58, 237, 0.3)'">
            📋 Tümünü Kopyala
          </button>
        </div>
      `
    }
    
    if (step.requiredIPs) {
      html += `
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 10px; margin-bottom: 12px;">
          <div style="font-size: 12px; font-weight: 600; color: #1e40af; margin-bottom: 4px;">
            Gerekli IP'ler:
          </div>
          <div style="font-size: 12px; color: #1e3a8a; font-family: monospace;">
            ${step.requiredIPs.map(ip => `• ${ip}`).join('<br>')}
          </div>
        </div>
      `
    }
    
    if (step.autoClick) {
      html += `
        <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 6px; padding: 8px; font-size: 11px; color: #92400e;">
          ⏱️ 5 saniye içinde otomatik tıklanacak...
        </div>
      `
    }
    
    html += '</div>'
    
    this.panel.setContent(html)
    
    // Navigation butonları için event listener
      setTimeout(() => {
      const navBtn = document.getElementById('keepnet-navigate-btn')
      if (navBtn) {
        navBtn.addEventListener('click', () => {
          const url = navBtn.getAttribute('data-url')
          console.log('[Keepnet] Navigate button clicked, going to:', url)
          window.location.href = url
        })
      }
      
        const goBtn = document.getElementById('keepnet-go-to-security-btn')
        if (goBtn) {
          goBtn.addEventListener('click', () => {
            console.log('[Keepnet] Sayfaya Git clicked')
            window.location.href = 'https://security.microsoft.com/homepage'
          })
        }
      }, 100)
    
    // IP copy butonu için event listener ekle (Workflow 1 step 9 veya Workflow 2 step 5)
    if (step.id === 9 || step.name === 'antispam_step5_add_ips') {
      setTimeout(() => {
        const copyBtn = document.getElementById('keepnet-copy-ips-btn')
        if (copyBtn) {
          copyBtn.addEventListener('click', () => {
            const ips = '149.72.161.59\n149.72.42.201\n149.72.154.87'
            navigator.clipboard.writeText(ips).then(() => {
              copyBtn.textContent = '✅ Kopyalandı!'
              copyBtn.style.background = 'linear-gradient(135deg, #5b21b6 0%, #4c1d95 100%)'
              setTimeout(() => {
                copyBtn.textContent = '📋 Tümünü Kopyala'
                copyBtn.style.background = 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)'
              }, 2000)
            }).catch(err => {
              console.error('[Keepnet] Clipboard error:', err)
              copyBtn.textContent = '❌ Hata'
              setTimeout(() => {
                copyBtn.textContent = '📋 Tümünü Kopyala'
              }, 2000)
            })
          })
        }
      }, 100)
    }
  }
  
  highlightElement(element, tooltipText) {
    this.clearHighlight()
    
    this.highlightedElement = element
    element.classList.add('keepnet-highlight')
    
    // Animate highlight with pulse
    AnimationUtils.animate(element, 'pulse', 600)
    AnimationUtils.scrollToElement(element)
    
    // Tooltip - element'in üstünde ortalı
    if (tooltipText) {
      const rect = element.getBoundingClientRect()
      
      this.tooltip = document.createElement('div')
      this.tooltip.className = 'keepnet-tooltip'
      this.tooltip.textContent = tooltipText
      this.tooltip.style.opacity = '0'
      this.tooltip.style.transform = 'translateY(10px) scale(0.9)'
      
      // Tooltip'i önce append et ki genişliğini ölçebilelim
      document.body.appendChild(this.tooltip)
      
      // Tooltip genişliğini al
      const tooltipWidth = this.tooltip.offsetWidth
      
      // Element'in üstünde ortalı konumlandır
      const centerX = rect.left + (rect.width / 2) - (tooltipWidth / 2)
      const topY = rect.top - 60 // Element'in 60px üstünde
      
      // Ekran sınırlarını kontrol et
      const finalX = Math.max(10, Math.min(centerX, window.innerWidth - tooltipWidth - 10))
      const finalY = Math.max(10, topY)
      
      this.tooltip.style.top = `${finalY}px`
      this.tooltip.style.left = `${finalX}px`
      
      // Animate tooltip entrance
      AnimationUtils.animate(this.tooltip, 'fadeInUp', 400)
      
      console.log(`[Keepnet] Tooltip positioned at (${finalX}, ${finalY})`)
    }
  }
  
  clearHighlight() {
    if (this.highlightedElement) {
      AnimationUtils.removeHighlight(this.highlightedElement)
      this.highlightedElement = null
    }
    
    if (this.tooltip) {
      this.tooltip.style.animation = 'keepnet-fade-out 200ms ease-out forwards'
      setTimeout(() => {
        this.tooltip?.remove()
      this.tooltip = null
      }, 200)
    }
    
    this.autoClick.stop()
    this.stopRealTimeValidation()
  }
  
  async onElementClicked(step) {
    console.log(`[Keepnet] Element clicked for step ${step.id}`)
    
    // Eğer bir LABEL'a tıklandıysa, altındaki INPUT'u bul ve focus et
    if (this.highlightedElement && this.highlightedElement.tagName === 'LABEL') {
      console.log("[Keepnet] Label clicked, finding input...")
      
      // Label'ın parent container'ını bul (birkaç level yukarı çık)
      let container = this.highlightedElement.closest('div')
      
      // Container içinde input ara - fallback ile
      let input = container?.querySelector('input.ms-BasePicker-input') || 
                  container?.querySelector('input[role="combobox"]') ||
                  container?.querySelector('textarea.ms-TextField-field') ||
                  container?.querySelector('textarea') ||
                  container?.querySelector('input[type="text"]')
      
      // Container'ı yukarı çıkarak bul (3 level kadar)
      if (!input && container) {
        for (let i = 0; i < 3; i++) {
          container = container.parentElement
      if (container) {
            input = container.querySelector('input.ms-BasePicker-input') || 
                      container.querySelector('input[role="combobox"]') ||
                    container.querySelector('textarea.ms-TextField-field') ||
                    container.querySelector('textarea') ||
                      container.querySelector('input[type="text"]')
            if (input) break
          }
        }
      }
        
        if (input) {
          console.log("[Keepnet] Input found, focusing...")
          input.focus()
          input.click()
          
          // Highlight'ı input'a taşı
          this.clearHighlight()
          this.highlightElement(input, `${step.tooltip} (buraya yazın)`)
      } else {
        console.warn("[Keepnet] Input not found for label step")
      }
    }
    
    // Wait if specified
    if (step.waitAfterClick) {
      await Utils.sleep(step.waitAfterClick)
    }
    
    // Validate
    const isValid = await this.validateStep(step)
    
    // Screenshot
    await this.captureScreenshot(step, isValid)
    
    // Save result
    this.stepResults[step.id] = {
      title: step.title,
      valid: isValid,
      timestamp: new Date().toISOString()
    }
    await Storage.set(STORAGE_KEYS.STEP_RESULTS, this.stepResults)
    
    // Clear highlight (eğer valid değilse temizleme, kullanıcı girsin)
    if (isValid) {
      this.clearHighlight()
    }
    
    // OTOMATIK SONRAKI ADIMA GEÇ - Sadece valid ise!
    if (isValid) {
      console.log(`[Keepnet] Step ${step.id} tamamlandı, otomatik sonraki adıma geçiliyor...`)
      await Utils.sleep(500)
      await this.nextStep()
    } else if (step.criticalStep) {
      // Kritik adımda validation başarısızsa uyar
      this.panel.showError(`❌ Lütfen ${step.title} alanını doldurun!`)
    } else {
      // Kritik olmayan adımda da geç
      await Utils.sleep(500)
      await this.nextStep()
    }
  }
  
  async validateStep(step) {
    if (!step.validation) return true
    
    try {
      const result = step.validation()
      return result
    } catch (e) {
      console.error("[Keepnet] Validation error:", e)
      return false
    }
  }
  
  startRealTimeValidation(step) {
    this.stopRealTimeValidation()
    
    this.validationInterval = setInterval(async () => {
      const isValid = await this.validateStep(step)
      
      if (step.id === 8) {
        // IP validation
        const panel = document.querySelector('.ms-Panel-main')
        if (!panel) return
        
        const text = panel.innerText
        const requiredIPs = step.requiredIPs || []
        const found = requiredIPs.filter(ip => text.includes(ip))
        const missing = requiredIPs.filter(ip => !text.includes(ip))
        
        if (missing.length > 0) {
          this.panel.showError(`❌ IP girmeyi unuttunuz: ${missing.join(', ')}`)
        } else {
          this.panel.showSuccess(`✅ Tüm IP'ler eklendi! (${found.length}/3)`)
        }
      }
    }, VALIDATION_INTERVAL)
  }
  
  stopRealTimeValidation() {
    if (this.validationInterval) {
      clearInterval(this.validationInterval)
      this.validationInterval = null
    }
  }
  
  setupAutoFillForIPs(step) {
    const autoFillTimer = setTimeout(async () => {
      // Kullanıcı 10s içinde giriş yapmadı mı?
      const panel = document.querySelector('.ms-Panel-main')
      if (!panel) return
      
      const text = panel.innerText
      const hasAnyIP = step.requiredIPs.some(ip => text.includes(ip))
      
      if (!hasAnyIP) {
        // Otomatik doldur seçeneği sun
        const confirmFill = confirm('IP\'leri otomatik doldurmak ister misiniz?')
        if (confirmFill) {
          await this.autoFillIPs(step.requiredIPs)
        }
      }
    }, step.autoFillDelay || 10000)
    
    // Kullanıcı bir şey girerse timer'ı iptal et
    document.addEventListener('input', () => {
      clearTimeout(autoFillTimer)
    }, { once: true })
  }
  
  async autoFillIPs(ips) {
    // IP input field'ını bul ve doldur
    const panel = document.querySelector('.ms-Panel-main')
    if (!panel) return
    
    const input = panel.querySelector('input[type="text"], textarea')
    if (!input) return
    
    for (const ip of ips) {
      input.value = ip
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
      
      // "Add" butonunu bul ve tıkla
      const addBtn = Array.from(panel.querySelectorAll('button')).find(btn => 
        /Add|Ekle/i.test(btn.textContent)
      )
      if (addBtn) {
        addBtn.click()
      }
      
      await Utils.sleep(500)
    }
    
    this.panel.showSuccess('✅ IP\'ler otomatik eklendi!')
  }
  
  async captureScreenshot(step, isValid) {
    const stepName = step.name
    const dataUrl = await this.screenshots.capture(stepName)
    
    if (dataUrl) {
      await this.screenshots.save(stepName, dataUrl, { valid: isValid })
      console.log(`[Keepnet] Screenshot saved: ${stepName}.png`)
    }
  }
  
  async nextStep() {
    console.log("[Keepnet] Next step clicked")
    
    // Current step validation (sadece uyarı, bloklama yok)
    const currentStepConfig = this.currentWorkflow[this.currentStep - 1]
    if (currentStepConfig && currentStepConfig.validation) {
      const isValid = await this.validateStep(currentStepConfig)
      if (!isValid && currentStepConfig.criticalStep) {
        // Kritik adım tamamlanmamış - sadece uyarı göster
        console.warn("[Keepnet] Critical step not completed, but continuing anyway")
        this.panel.showError(`⚠️ Bu adım tamamlanmamış ama devam ediliyor...`)
      }
    }
    
    // Screenshot current step
    if (currentStepConfig && !currentStepConfig.isSummary) {
      await this.captureScreenshot(currentStepConfig, true)
    }
    
    // Next
    const totalSteps = this.currentWorkflow.length
    if (this.currentStep >= totalSteps) {
      await this.showSummary()
    } else {
      await this.executeStep(this.currentStep + 1)
    }
  }
  
  async prevStep() {
    if (this.currentStep <= 1) return
    await this.executeStep(this.currentStep - 1)
  }
  
  async showSummary() {
    this.clearHighlight()
    
    // Footer'ı gizle (summary ekranında footer butonu gösterme)
    const footer = document.getElementById('keepnet-panel-footer')
    if (footer) {
      footer.style.display = 'none'
    }
    
    const screenshots = this.screenshots.getAll()
    
    let html = `
      <div class="keepnet-summary">
        <h2 style="margin: 0 0 16px 0; font-size: 16px; color: #111827;">
          📊 Özet Rapor - ${this.workflowName}
        </h2>
        <div style="background: white; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
    `
    
    // Summary adımını hariç tut
    const stepsToShow = this.currentWorkflow.filter(s => !s.isSummary)
    
    for (let i = 0; i < stepsToShow.length; i++) {
      const step = stepsToShow[i]
      const result = this.stepResults[step.id]
      const screenshot = screenshots[step.name]
      
      const status = result?.valid ? '✅' : (result ? '❌' : '⏳')
      
      html += `
        <div style="display: flex; align-items: center; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
          <div style="font-size: 18px; margin-right: 10px;">${status}</div>
          <div style="flex: 1;">
            <div style="font-size: 13px; font-weight: 500; color: #111827;">
              ${step.title}
            </div>
            ${screenshot ? `<div style="font-size: 11px; color: #6b7280;">Screenshot: ${step.name}.png</div>` : ''}
          </div>
          ${!result?.valid ? `
            <button class="keepnet-goto-step-btn" data-step-id="${step.id}" style="
              padding: 4px 8px;
              font-size: 11px;
              background: #667eea;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
            ">Git ve Düzelt</button>
          ` : ''}
        </div>
      `
    }
    
    html += `
        </div>
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 10px; font-size: 12px; color: #1e40af;">
          💾 Tüm screenshot'lar chrome.storage'da kaydedildi
        </div>
    `
    
    // WORKFLOW_6 için özel tebrik mesajı
    if (this.workflowName === 'WORKFLOW_6') {
      html += `
        <div style="
          background: linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%);
          border-radius: 12px;
          padding: 20px;
          margin-top: 16px;
          color: white;
          text-align: center;
          box-shadow: 0 4px 16px rgba(124, 58, 237, 0.3);
        ">
          <div style="font-size: 48px; margin-bottom: 12px;">🎊</div>
          <div style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">
            Tebrikler! Tüm Adımları Tamamladınız!
          </div>
          <div style="font-size: 13px; line-height: 1.6; opacity: 0.95;">
            Bu adımlar ile Office 365 ortamında IP adreslerini beyaz listeye aldınız ve<br>
            güvenlik simülasyonları, spam filtreleme ve tehdit öncesi (ATP) özelliklerini<br>
            başarıyla yapılandırdınız!
          </div>
          <div style="font-size: 14px; font-weight: 600; margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.3);">
            ✅ 6 Workflow Tamamlandı • 62 Adım Başarılı • 🎉
          </div>
        </div>
      `
    }
    
    // Sonraki workflow var mı kontrol et
    let nextWorkflowText = ''
    let hasNextWorkflow = false
    
    if (this.workflowName === 'WORKFLOW_1') {
      nextWorkflowText = 'Devam Et (Workflow 2: Anti-Spam)'
      hasNextWorkflow = true
    } else if (this.workflowName === 'WORKFLOW_2') {
      nextWorkflowText = 'Devam Et (Workflow 3: Safe Links)'
      hasNextWorkflow = true
    } else if (this.workflowName === 'WORKFLOW_3') {
      nextWorkflowText = 'Devam Et (Workflow 4: Spam Filter Bypass)'
      hasNextWorkflow = true
    } else if (this.workflowName === 'WORKFLOW_4') {
      nextWorkflowText = 'Devam Et (Workflow 5: ATP Link Bypass)'
      hasNextWorkflow = true
    } else if (this.workflowName === 'WORKFLOW_5') {
      nextWorkflowText = 'Devam Et (Workflow 6: ATP Attachment Bypass)'
      hasNextWorkflow = true
    } else if (this.workflowName === 'WORKFLOW_6') {
      nextWorkflowText = '🎊 Tebrikler! Tüm Workflow\'lar Tamamlandı'
      hasNextWorkflow = false
    } else {
      nextWorkflowText = '✅ Tüm Workflow\'lar Tamamlandı'
      hasNextWorkflow = false
    }
    
    html += `
        <div style="margin-top: 12px; display: flex; gap: 8px;">
          <button id="keepnet-continue-workflow-btn" ${!hasNextWorkflow ? 'disabled' : ''} class="keepnet-workflow-btn" style="
            flex: 1;
            padding: 10px 16px;
            background: ${hasNextWorkflow ? 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)' : '#9ca3af'};
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            cursor: ${hasNextWorkflow ? 'pointer' : 'not-allowed'};
            transition: all 0.2s;
            box-shadow: 0 2px 4px rgba(124, 58, 237, 0.3);
          ">
            ${hasNextWorkflow ? '➡️' : '✅'} ${nextWorkflowText}
          </button>
        </div>
      </div>
    `
    
    this.panel.setContent(html)
    
    // Show confetti celebration ONLY on final workflow! 🎉
    if (this.workflowName === 'WORKFLOW_6') {
      console.log("[Keepnet] 🎊 FINAL WORKFLOW COMPLETED! Showing confetti celebration!")
      setTimeout(() => {
        AnimationUtils.showConfetti(document.body)
      }, 300)
      
      // Extra confetti for final workflow
      setTimeout(() => {
        AnimationUtils.showConfetti(document.body)
      }, 800)
    }
    
    // Animate summary items with stagger
    setTimeout(() => {
      const summaryItems = this.panel.body.querySelectorAll('.keepnet-summary > div > div')
      if (summaryItems.length > 0) {
        AnimationUtils.staggerChildren(summaryItems[0].parentElement, 'fadeInUp', 80)
      }
    }, 100)
    
    // Global fonksiyonları yeniden kaydet (emin olmak için)
    console.log("[Keepnet] Re-registering global functions for summary...")
    this.setupGlobalFunctions()
    
    // Event listeners
    setTimeout(() => {
      // Continue butonu için
      const continueBtn = document.getElementById('keepnet-continue-workflow-btn')
      if (continueBtn && hasNextWorkflow) {
        console.log("[Keepnet] Attaching click handler to continue button")
        
        // Click handler
        continueBtn.addEventListener('click', async (e) => {
          e.preventDefault()
          e.stopPropagation()
          console.log("[Keepnet] Continue workflow button clicked!")
          
          if (typeof window.keepnetContinueWorkflow === 'function') {
            await window.keepnetContinueWorkflow()
          } else {
            console.error("[Keepnet] window.keepnetContinueWorkflow is not a function!")
            alert("Hata: Fonksiyon bulunamadı. Lütfen extension'ı yeniden yükleyin.")
          }
        })
        
        // Hover animations (CSP-safe)
        continueBtn.addEventListener('mouseenter', () => {
          continueBtn.style.transform = 'scale(1.02)'
          continueBtn.style.boxShadow = '0 4px 8px rgba(124, 58, 237, 0.5)'
        })
        
        continueBtn.addEventListener('mouseleave', () => {
          continueBtn.style.transform = 'scale(1)'
          continueBtn.style.boxShadow = '0 2px 4px rgba(124, 58, 237, 0.3)'
        })
        
        console.log("[Keepnet] Click handler and hover effects attached successfully")
      }
      
      // Git ve Düzelt butonları için
      const gotoButtons = document.querySelectorAll('.keepnet-goto-step-btn')
      gotoButtons.forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.preventDefault()
          e.stopPropagation()
          const stepId = parseInt(btn.getAttribute('data-step-id'))
          console.log("[Keepnet] Git ve Düzelt clicked for step:", stepId)
          
          if (typeof window.keepnetGoToStep === 'function') {
            await window.keepnetGoToStep(stepId)
          } else {
            console.error("[Keepnet] window.keepnetGoToStep is not a function!")
          }
        })
      })
      console.log("[Keepnet] Git ve Düzelt handlers attached:", gotoButtons.length)
    }, 100)
    
    console.log("[Keepnet] Summary displayed, global functions:", {
      keepnetContinueWorkflow: typeof window.keepnetContinueWorkflow,
      keepnetGoToStep: typeof window.keepnetGoToStep
    })
  }
  
  async waitForPageLoad() {
    return new Promise((resolve) => {
      if (document.readyState === 'complete') {
        resolve()
      } else {
        window.addEventListener('load', resolve, { once: true })
      }
    })
  }
}

/* ========== MESSAGE HANDLERS ========== */
let assistantInstance = null

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("[Keepnet] Message received:", request.action)
  
  switch (request.action) {
    case 'ping':
      console.log("[Keepnet] Ping received, responding...")
      sendResponse({ ok: true })
      return false
      
    case 'initAssistant':
      console.log("[Keepnet] initAssistant received!")
      if (!assistantInstance) {
        assistantInstance = new KeepnetAssistant()
        assistantInstance.init().then(() => {
          console.log("[Keepnet] Assistant initialized successfully")
          sendResponse({ ok: true })
        }).catch((error) => {
          console.error("[Keepnet] Init failed:", error)
          sendResponse({ ok: false, error: error.message })
        })
        return true // Async response
      } else {
        console.log("[Keepnet] Assistant already running")
        sendResponse({ ok: true })
        return false
      }
      
    case 'screenshotCaptured':
      console.log("[Keepnet] Screenshot captured notification received")
      sendResponse({ ok: true })
      return false
  }
  
  return false
})

/* ========== READY ========== */
console.log("[Keepnet] Content script ready! Waiting for initAssistant message...")
console.log("[Keepnet] Current URL:", location.href)

// Sayfa yüklendiğinde assistant'ı restore et
window.addEventListener('load', async () => {
  console.log("[Keepnet] Page loaded, checking for active session...")
  
  // Workflow geçiş modu kontrolü (yeni workflow başlatılacak mı?)
  const nextWorkflow = await Storage.get('keepnet_next_workflow')
  if (nextWorkflow) {
    console.log("[Keepnet] 🚀 New workflow detected:", nextWorkflow)
    
    // Flag'i temizle
    await Storage.set('keepnet_next_workflow', null)
    
    // Kısa bekleme, sonra asistan başlat
    setTimeout(async () => {
      console.log("[Keepnet] Starting new workflow after page load...")
      chrome.runtime.sendMessage({ action: 'initAssistant' }, (response) => {
        console.log("[Keepnet] initAssistant response:", response)
        
        // Panel'i force visible et
        setTimeout(() => {
          const panel = document.querySelector('#keepnet-floating-panel')
          if (panel) {
            panel.style.display = 'flex'
            panel.style.opacity = '1'
            panel.style.visibility = 'visible'
            panel.style.zIndex = '2147483647'
            console.log("[Keepnet] Panel force visible!")
          }
        }, 500)
      })
    }, 1000)
    return
  }
  
  // "Git ve Düzelt" modu kontrolü
  const fixing = await Storage.get('keepnet_fixing_step')
  if (fixing) {
    console.log("[Keepnet] 🔧 Fixing mode detected! Auto-starting assistant...")
    
    // Fixing flag'ini temizle
    await Storage.set('keepnet_fixing_step', null)
    
    // Asistan başlat
    setTimeout(async () => {
      chrome.runtime.sendMessage({ action: 'initAssistant' }, (response) => {
        console.log("[Keepnet] initAssistant response:", response)
        
        // Panel'i force visible et
        setTimeout(() => {
          const panel = document.querySelector('#keepnet-floating-panel')
          if (panel) {
            panel.style.display = 'flex'
            panel.style.opacity = '1'
            panel.style.visibility = 'visible'
            panel.style.zIndex = '2147483647'
            console.log("[Keepnet] Panel force visible!")
          }
        }, 500)
      })
    }, 1000)
    return
  }
  
  // Normal mod - aktif session var mı?
  const currentStep = await Storage.get(STORAGE_KEYS.CURRENT_STEP)
  if (currentStep && currentStep > 0) {
    console.log("[Keepnet] 🔄 Active session detected! Restoring assistant from step:", currentStep)
    
    // Asistan başlat
    setTimeout(async () => {
      chrome.runtime.sendMessage({ action: 'initAssistant' }, (response) => {
        console.log("[Keepnet] initAssistant response:", response)
        
        // Panel'i force visible et
        setTimeout(() => {
          const panel = document.querySelector('#keepnet-floating-panel')
          if (panel) {
            panel.style.display = 'flex'
            panel.style.opacity = '1'
            panel.style.visibility = 'visible'
            panel.style.zIndex = '2147483647'
            console.log("[Keepnet] Panel force visible!")
          }
        }, 500)
      })
    }, 1000)
  }
})

// Sayfa yüklenince ayrıca kontrol et (load event'i çalışmazsa)
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  console.log("[Keepnet] Document already loaded, checking state...")
  
  setTimeout(async () => {
    const nextWorkflow = await Storage.get('keepnet_next_workflow')
    if (nextWorkflow) {
      console.log("[Keepnet] nextWorkflow found, starting assistant...")
      await Storage.set('keepnet_next_workflow', null)
      chrome.runtime.sendMessage({ action: 'initAssistant' })
    }
  }, 500)
}

// TEST: Panel var mı kontrol et (10 saniyede bir)
setInterval(() => {
  const panel = document.querySelector('#keepnet-floating-panel')
  if (panel) {
    console.log("[Keepnet] ✅ Panel exists! Display:", panel.style.display, "Size:", panel.offsetWidth, "x", panel.offsetHeight)
  } else {
    console.log("[Keepnet] ❌ Panel NOT found in DOM!")
  }
}, 10000)

