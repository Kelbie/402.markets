export interface ApiEndpoint {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS" | "HEAD" | "TRACE"
  path: string
  description: string
  pricePerThousand: number
  parameters?: {
    name: string
    type: string
    required: boolean
    description: string
  }[]
  response?: {
    example: string
  }
  invoiceData?: {
    macaroon: string
    invoice: string
    decodedAmount?: number
    paymentHash?: string
  }
  cashuPaymentRequest?: {
    raw: string
    decoded?: {
      id: string
      amount?: number
      unit: string
      mints: string[]
      description?: string
      singleUse: boolean
      nut10?: {
        kind: string
        data: string
        tags?: string[][]
      }
    }
  }
}

export interface Api {
  id: string
  name: string
  domain: string
  description: string
  tags: string[]
  endpoints: ApiEndpoint[]
  minPrice: number
  maxPrice: number
  supportedMints: string[]
  supportedPaymentMethods: ("L402" | "P2PK" | "Cashu")[]
  creatorPubkey?: string
  creatorProfile?: {
    name?: string
    picture?: string
    nip05?: string
  }
  dTag?: string
  eventId?: string
  validationError?: string
}

export interface NostrUser {
  pubkey: string
  npub: string
  profile?: {
    name?: string
    displayName?: string
    picture?: string
    banner?: string
    about?: string
    nip05?: string
    lud16?: string
  }
}

export interface Reaction {
  emoji: string
  count: number
  userReacted: boolean
  eventIds: Array<{ id: string; pubkey: string }>
}

export interface NostrProfile {
  name?: string
  displayName?: string
  picture?: string
  banner?: string
  about?: string
  nip05?: string
  lud16?: string
}

export type ApiCallback = (api: Api) => void
