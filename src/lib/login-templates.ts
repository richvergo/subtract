import { LoginTemplate } from './schemas/agents';

export const LOGIN_TEMPLATES: Record<string, LoginTemplate> = {
  google: {
    id: 'google',
    name: 'Google',
    description: 'Google Workspace login (Gmail, Drive, Docs, etc.)',
    loginUrl: 'https://accounts.google.com/signin',
    steps: [
      {
        name: 'Navigate to login',
        type: 'navigate',
        timeout: 10000,
        waitFor: 'network'
      },
      {
        name: 'Enter email',
        type: 'fill',
        selector: 'input[type="email"], input[name="identifier"], #identifierId',
        value: '{{username}}',
        timeout: 10000,
        waitFor: 'selector'
      },
      {
        name: 'Click next',
        type: 'click',
        selector: '#identifierNext, button[type="submit"], [data-primary-action="next"]',
        timeout: 5000,
        waitFor: 'selector'
      },
      {
        name: 'Enter password',
        type: 'fill',
        selector: 'input[type="password"], input[name="password"], #password',
        value: '{{password}}',
        timeout: 10000,
        waitFor: 'selector'
      },
      {
        name: 'Sign in',
        type: 'click',
        selector: '#passwordNext, button[type="submit"], [data-primary-action="signIn"]',
        timeout: 5000,
        waitFor: 'selector'
      },
      {
        name: 'Wait for result',
        type: 'wait',
        timeout: 15000,
        waitFor: 'navigation'
      }
    ],
    fields: [
      {
        name: 'email',
        selector: 'input[type="email"], input[name="identifier"], #identifierId',
        type: 'email',
        required: true
      },
      {
        name: 'password',
        selector: 'input[type="password"], input[name="password"], #password',
        type: 'password',
        required: true
      }
    ],
    successUrlPattern: 'docs.google.com|slides.google.com|drive.google.com',
    errorUrlPattern: 'accounts.google.com/signin.*error'
  },

  microsoft: {
    id: 'microsoft',
    name: 'Microsoft',
    description: 'Microsoft 365 login (Outlook, Teams, OneDrive, etc.)',
    loginUrl: 'https://login.microsoftonline.com',
    steps: [
      {
        name: 'Navigate to login',
        type: 'navigate',
        timeout: 10000,
        waitFor: 'network'
      },
      {
        name: 'Enter email',
        type: 'fill',
        selector: 'input[type="email"], input[name="loginfmt"]',
        value: '{{username}}',
        timeout: 10000,
        waitFor: 'selector'
      },
      {
        name: 'Click next',
        type: 'click',
        selector: 'input[type="submit"], button[type="submit"]',
        timeout: 5000,
        waitFor: 'selector'
      },
      {
        name: 'Enter password',
        type: 'fill',
        selector: 'input[type="password"], input[name="passwd"]',
        value: '{{password}}',
        timeout: 10000,
        waitFor: 'selector'
      },
      {
        name: 'Sign in',
        type: 'click',
        selector: 'input[type="submit"], button[type="submit"]',
        timeout: 5000,
        waitFor: 'selector'
      },
      {
        name: 'Wait for result',
        type: 'wait',
        timeout: 15000,
        waitFor: 'navigation'
      }
    ],
    fields: [
      {
        name: 'email',
        selector: 'input[type="email"], input[name="loginfmt"]',
        type: 'email',
        required: true
      },
      {
        name: 'password',
        selector: 'input[type="password"], input[name="passwd"]',
        type: 'password',
        required: true
      }
    ],
    successUrlPattern: 'outlook.office.com|teams.microsoft.com|onedrive.live.com',
    errorUrlPattern: 'login.microsoftonline.com.*error'
  },

  github: {
    id: 'github',
    name: 'GitHub',
    description: 'GitHub login',
    loginUrl: 'https://github.com/login',
    steps: [
      {
        name: 'Navigate to login',
        type: 'navigate',
        timeout: 10000,
        waitFor: 'network'
      },
      {
        name: 'Enter username',
        type: 'fill',
        selector: 'input[name="login"]',
        value: '{{username}}',
        timeout: 10000,
        waitFor: 'selector'
      },
      {
        name: 'Enter password',
        type: 'fill',
        selector: 'input[name="password"]',
        value: '{{password}}',
        timeout: 10000,
        waitFor: 'selector'
      },
      {
        name: 'Sign in',
        type: 'click',
        selector: 'input[type="submit"], button[type="submit"]',
        timeout: 5000,
        waitFor: 'selector'
      },
      {
        name: 'Wait for result',
        type: 'wait',
        timeout: 15000,
        waitFor: 'navigation'
      }
    ],
    fields: [
      {
        name: 'username',
        selector: 'input[name="login"]',
        type: 'text',
        required: true
      },
      {
        name: 'password',
        selector: 'input[name="password"]',
        type: 'password',
        required: true
      }
    ],
    successUrlPattern: 'github.com/(?!login)',
    errorUrlPattern: 'github.com/login.*error'
  },

  slack: {
    id: 'slack',
    name: 'Slack',
    description: 'Slack workspace login',
    loginUrl: 'https://slack.com/signin',
    steps: [
      {
        name: 'Navigate to login',
        type: 'navigate',
        timeout: 10000,
        waitFor: 'network'
      },
      {
        name: 'Enter email',
        type: 'fill',
        selector: 'input[type="email"], input[name="email"]',
        value: '{{username}}',
        timeout: 10000,
        waitFor: 'selector'
      },
      {
        name: 'Click continue',
        type: 'click',
        selector: 'button[type="submit"], input[type="submit"]',
        timeout: 5000,
        waitFor: 'selector'
      },
      {
        name: 'Enter password',
        type: 'fill',
        selector: 'input[type="password"], input[name="password"]',
        value: '{{password}}',
        timeout: 10000,
        waitFor: 'selector'
      },
      {
        name: 'Sign in',
        type: 'click',
        selector: 'button[type="submit"], input[type="submit"]',
        timeout: 5000,
        waitFor: 'selector'
      },
      {
        name: 'Wait for result',
        type: 'wait',
        timeout: 15000,
        waitFor: 'navigation'
      }
    ],
    fields: [
      {
        name: 'email',
        selector: 'input[type="email"], input[name="email"]',
        type: 'email',
        required: true
      },
      {
        name: 'password',
        selector: 'input[type="password"], input[name="password"]',
        type: 'password',
        required: true
      }
    ],
    successUrlPattern: 'app.slack.com',
    errorUrlPattern: 'slack.com/signin.*error'
  },

  custom: {
    id: 'custom',
    name: 'Custom Form',
    description: 'Generic form-based login',
    loginUrl: '',
    steps: [
      {
        name: 'Navigate to login',
        type: 'navigate',
        timeout: 10000,
        waitFor: 'network'
      },
      {
        name: 'Enter username',
        type: 'fill',
        selector: 'input[type="text"], input[name="username"], input[name="email"]',
        value: '{{username}}',
        timeout: 10000,
        waitFor: 'selector'
      },
      {
        name: 'Enter password',
        type: 'fill',
        selector: 'input[type="password"], input[name="password"]',
        value: '{{password}}',
        timeout: 10000,
        waitFor: 'selector'
      },
      {
        name: 'Submit form',
        type: 'click',
        selector: 'button[type="submit"], input[type="submit"]',
        timeout: 5000,
        waitFor: 'selector'
      },
      {
        name: 'Wait for result',
        type: 'wait',
        timeout: 15000,
        waitFor: 'navigation'
      }
    ],
    fields: [
      {
        name: 'username',
        selector: 'input[type="text"], input[name="username"], input[name="email"]',
        type: 'text',
        required: true
      },
      {
        name: 'password',
        selector: 'input[type="password"], input[name="password"]',
        type: 'password',
        required: true
      }
    ],
    successUrlPattern: '',
    errorUrlPattern: ''
  }
};

export function getLoginTemplate(templateId: string): LoginTemplate | undefined {
  return LOGIN_TEMPLATES[templateId];
}

export function getAllLoginTemplates(): LoginTemplate[] {
  return Object.values(LOGIN_TEMPLATES);
}

export function getTemplateIds(): string[] {
  return Object.keys(LOGIN_TEMPLATES);
}
