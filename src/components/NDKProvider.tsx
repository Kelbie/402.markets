'use client';

import NDK from "@nostr-dev-kit/ndk";
import { NDKSessionLocalStorage, useNDKInit, useNDKSessionMonitor } from "@nostr-dev-kit/ndk-hooks";
import { useEffect } from "react";

const explicitRelayUrls = ["wss://relay.damus.io", "wss://relay.primal.net", "wss://nos.lol"];


const ndk = new NDK({ explicitRelayUrls });
if (typeof window !== "undefined") ndk.connect();

const sessionStorage = new NDKSessionLocalStorage();

/**
 * Use an NDKHeadless component to initialize NDK in order to prevent application-rerenders
 * when there are changes to the NDK or session state.
 * 
 * Include this headless component in your app layout to initialize NDK correctly.
 */
export default function NDKProvider() {
    const initNDK = useNDKInit();

    useNDKSessionMonitor(sessionStorage, {
        profile: true,
        follows: true,
    });

    useEffect(() => {
        console.log('[NDK Provider] Initializing NDK...');
        if (ndk) {
            initNDK(ndk);
            console.log('[NDK Provider] NDK initialized successfully');
            console.log('[NDK Provider] Relays:', explicitRelayUrls);
        } else {
            console.error('[NDK Provider] NDK instance is null');
        }
    }, [initNDK])

    return null;
}
