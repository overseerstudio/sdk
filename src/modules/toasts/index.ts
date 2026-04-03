/** @format */

import type { ToastKind, ToastOptions } from './types';

export function sendToast(type: ToastKind, title: string, message: string, options?: ToastOptions) {
  window.Overseer.send('overseer:toast#sendToast', {
    title,
    message,
    type,
    options,
  });
}

export const toast = {
  error: (title: string, message: string, options?: ToastOptions) =>
    sendToast('error', title, message, options),
  success: (title: string, message: string, options?: ToastOptions) =>
    sendToast('success', title, message, options),
  warning: (title: string, message: string, options?: ToastOptions) =>
    sendToast('warning', title, message, options),
  info: (title: string, message: string, options?: ToastOptions) =>
    sendToast('info', title, message, options),
};
