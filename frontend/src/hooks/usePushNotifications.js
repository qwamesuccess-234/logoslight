/**
 * usePushNotifications.js
 * Browser Push Notifications for community messages.
 * Uses the Web Notifications API — no extra library needed.
 */
import { useState, useEffect, useCallback } from 'react'

const NOTIF_KEY = 'logoslight_notif_permission'

export function usePushNotifications() {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  )
  const [supported] = useState(typeof Notification !== 'undefined')

  const requestPermission = useCallback(async () => {
    if (!supported) return 'denied'
    const result = await Notification.requestPermission()
    setPermission(result)
    localStorage.setItem(NOTIF_KEY, result)
    return result
  }, [supported])

  const sendNotification = useCallback((title, options = {}) => {
    if (!supported || permission !== 'granted') return
    const n = new Notification(title, {
      icon:   '/icon-192.png',
      badge:  '/icon-192.png',
      silent: false,
      ...options,
    })
    // Auto-close after 5 seconds
    setTimeout(() => n.close(), 5000)
    // Click notification → focus the app
    n.onclick = () => { window.focus(); n.close() }
    return n
  }, [supported, permission])

  const notifyNewMessage = useCallback((authorUsername, channelName, messagePreview) => {
    sendNotification(`New message in #${channelName}`, {
      body: `${authorUsername}: ${messagePreview.substring(0, 80)}`,
      tag:  `community-${channelName}`, // prevents duplicate notifications
    })
  }, [sendNotification])

  return { supported, permission, requestPermission, sendNotification, notifyNewMessage }
}