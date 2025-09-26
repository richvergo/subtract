/**
 * Browser-side analysis functions
 * These functions are injected into the browser context for website analysis
 */

export const browserAnalysisScript = `
// Browser-side analysis functions (injected into page)
const detectFramework = () => {
  // Check for React
  if (window.React || document.querySelector('[data-reactroot]')) return 'React'
  
  // Check for Vue
  if (window.Vue || document.querySelector('[data-v-]')) return 'Vue'
  
  // Check for Angular
  if (window.ng || document.querySelector('[ng-app]')) return 'Angular'
  
  // Check for Next.js
  if (document.querySelector('[data-nextjs-scroll-focus-boundary]')) return 'Next.js'
  
  // Check for Nuxt
  if (document.querySelector('[data-nuxt]')) return 'Nuxt'
  
  return 'vanilla'
}

const detectWebsiteType = () => {
  const body = document.body.innerHTML.toLowerCase()
  
  // E-commerce indicators
  if (body.includes('add to cart') || body.includes('checkout') || body.includes('price')) {
    return 'ecommerce'
  }
  
  // SaaS indicators
  if (body.includes('dashboard') || body.includes('login') || body.includes('sign up')) {
    return 'saas'
  }
  
  // Blog indicators
  if (body.includes('article') || body.includes('post') || body.includes('blog')) {
    return 'blog'
  }
  
  // SPA indicators
  if (document.querySelector('[data-spa]') || body.includes('single page')) {
    return 'spa'
  }
  
  return 'corporate'
}

const detectComplexity = () => {
  const elementCount = document.querySelectorAll('*').length
  const scriptCount = document.querySelectorAll('script').length
  const linkCount = document.querySelectorAll('link').length
  
  const complexityScore = elementCount + (scriptCount * 10) + (linkCount * 5)
  
  if (complexityScore > 1000) return 'high'
  if (complexityScore > 500) return 'medium'
  return 'low'
}

const detectAuthentication = () => {
  const authIndicators = [
    'login', 'signin', 'sign-in', 'auth', 'authentication',
    'password', 'username', 'email', 'sign up', 'register'
  ]
  
  const body = document.body.innerHTML.toLowerCase()
  return authIndicators.some(indicator => body.includes(indicator))
}

const detectAuthProviders = () => {
  const providers = []
  const body = document.body.innerHTML.toLowerCase()
  
  if (body.includes('google') && body.includes('oauth')) providers.push('google')
  if (body.includes('microsoft') && body.includes('oauth')) providers.push('microsoft')
  if (body.includes('github') && body.includes('oauth')) providers.push('github')
  if (body.includes('facebook') && body.includes('oauth')) providers.push('facebook')
  
  return providers
}

const detectSSO = () => {
  const body = document.body.innerHTML.toLowerCase()
  return body.includes('sso') || body.includes('saml') || body.includes('oauth')
}

const detectSlowSite = () => {
  // This would be detected by actual performance metrics
  return false
}

const detectAds = () => {
  const adSelectors = [
    '[class*="ad"]', '[class*="banner"]', '[id*="ad"]',
    '[class*="sponsor"]', '[class*="promo"]'
  ]
  
  return adSelectors.some(selector => document.querySelector(selector) !== null)
}

const detectSubdomains = () => {
  // This would be detected by analyzing the actual website
  return []
}

const detectCDNDomains = () => {
  const scripts = Array.from(document.querySelectorAll('script[src]'))
  const links = Array.from(document.querySelectorAll('link[href]'))
  
  const cdnDomains = new Set()
  
  scripts.forEach(element => {
    const src = element.getAttribute('src')
    if (src) {
      try {
        const url = new URL(src)
        if (url.hostname.includes('cdn') || url.hostname.includes('jsdelivr') || url.hostname.includes('unpkg')) {
          cdnDomains.add(url.hostname)
        }
      } catch (e) {
        // Ignore invalid URLs
      }
    }
  })
  
  links.forEach(element => {
    const href = element.getAttribute('href')
    if (href) {
      try {
        const url = new URL(href)
        if (url.hostname.includes('cdn') || url.hostname.includes('jsdelivr') || url.hostname.includes('unpkg')) {
          cdnDomains.add(url.hostname)
        }
      } catch (e) {
        // Ignore invalid URLs
      }
    }
  })
  
  return Array.from(cdnDomains)
}

const detectAdsDomains = () => {
  const scripts = Array.from(document.querySelectorAll('script[src]'))
  const adsDomains = new Set()
  
  scripts.forEach(script => {
    const src = script.getAttribute('src')
    if (src) {
      try {
        const url = new URL(src)
        if (url.hostname.includes('ads') || url.hostname.includes('doubleclick') || url.hostname.includes('googlesyndication')) {
          adsDomains.add(url.hostname)
        }
      } catch (e) {
        // Ignore invalid URLs
      }
    }
  })
  
  return Array.from(adsDomains)
}

const calculatePerformanceScore = () => {
  // Simple performance score based on page characteristics
  const elementCount = document.querySelectorAll('*').length
  const scriptCount = document.querySelectorAll('script').length
  const imageCount = document.querySelectorAll('img').length
  
  let score = 100
  
  // Penalize for too many elements
  if (elementCount > 1000) score -= 20
  if (elementCount > 2000) score -= 30
  
  // Penalize for too many scripts
  if (scriptCount > 20) score -= 15
  if (scriptCount > 50) score -= 25
  
  // Penalize for too many images
  if (imageCount > 50) score -= 10
  if (imageCount > 100) score -= 20
  
  return Math.max(0, Math.min(100, score))
}

const detectInteractivityLevel = () => {
  const interactiveElements = document.querySelectorAll('button, input, select, textarea, a[href]').length
  const totalElements = document.querySelectorAll('*').length
  
  const interactivityRatio = interactiveElements / totalElements
  
  if (interactivityRatio > 0.1) return 'high'
  if (interactivityRatio > 0.05) return 'medium'
  return 'low'
}

// Return analysis results
({
  framework: detectFramework(),
  type: detectWebsiteType(),
  complexity: detectComplexity(),
  hasAuth: detectAuthentication(),
  authProviders: detectAuthProviders(),
  hasSSO: detectSSO(),
  isSlow: detectSlowSite(),
  hasAds: detectAds(),
  subdomains: detectSubdomains(),
  cdnDomains: detectCDNDomains(),
  adsDomains: detectAdsDomains(),
  performanceScore: calculatePerformanceScore(),
  interactivityLevel: detectInteractivityLevel()
})
`

