import Stripe from 'stripe'
import type { Environment } from './environment.js'

let stripeClient: Stripe | null = null

export function getStripe(env: Environment): Stripe | null {
  if (!env.STRIPE_SECRET_KEY) {
    return null
  }
  if (!stripeClient) {
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia',
    })
  }
  return stripeClient
}
