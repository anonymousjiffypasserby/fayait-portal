const companyConfigs = {
  'acme': {
    name: 'Acme Corp',
    subdomain: 'acme',
    sla: 'Business',
    billingDay: 1,
    contact: 'anfarciodef@gmail.com',
    services: {
      tickets: 'active',
      assets: 'active',
      status: 'active',
      passwords: 'inactive',
      chat: 'active',
      storage: 'inactive',
      billing: 'active',
    }
  },
  'fayait': {
    name: 'Faya IT',
    subdomain: 'fayait',
    sla: 'Internal',
    billingDay: 1,
    contact: 'anfarciodef@gmail.com',
    services: {
      tickets: 'active',
      assets: 'active',
      status: 'active',
      passwords: 'active',
      chat: 'active',
      storage: 'active',
      billing: 'active',
    }
  }
}

export function getCompanyConfig(subdomain) {
  return companyConfigs[subdomain] || null
}

export function getServiceStatus(subdomain, service) {
  const config = companyConfigs[subdomain]
  if (!config) return 'inactive'
  return config.services[service] || 'inactive'
}

export default companyConfigs
