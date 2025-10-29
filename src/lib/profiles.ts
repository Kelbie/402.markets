import { NDKEvent } from "@nostr-dev-kit/ndk"

export function parseProfileFromEvent(event: NDKEvent): { name?: string; picture?: string; nip05?: string } | null {
  try {
    const profileData = JSON.parse(event.content)
    
    return {
      name: profileData.name || profileData.display_name || profileData.displayName,
      picture: profileData.picture || profileData.image,
      nip05: profileData.nip05,
    }
  } catch (error) {
    return {
      name: "",
      picture: "",
      nip05: "",
    }
  }
}

export function processProfiles(events: NDKEvent[]): Map<string, { name?: string; picture?: string; nip05?: string }> {
  const profiles = new Map<string, { name?: string; picture?: string; nip05?: string }>()

  for (const event of events) {
    const profile = parseProfileFromEvent(event)
    if (profile) {
      profiles.set(event.pubkey, profile)
    }
  }

  return profiles
}
