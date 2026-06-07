/**
 * Modern Custom Toast Notification System
 * =======================================
 * A self-contained, premium notification system with glassmorphism,
 * smooth entrance/exit animations, and auto-checking for post-redirect notifications.
 */

const Toast = {
  init() {
    if (document.getElementById('toast-container')) return;

    // Inject CSS styling dynamically
    const style = document.createElement('style');
    style.textContent = `
      #toast-container {
        position: fixed;
        top: 25px;
        right: 25px;
        z-index: 1000000;
        display: flex;
        flex-direction: column;
        gap: 14px;
        max-width: 400px;
        width: calc(100% - 50px);
        pointer-events: none;
      }
      .custom-toast {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 16px 20px;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        border-left: 5px solid #64748b;
        color: #1e293b;
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        font-size: 0.95rem;
        font-weight: 500;
        line-height: 1.4;
        transform: translateX(120%);
        opacity: 0;
        transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.25), opacity 0.4s ease;
        pointer-events: auto;
      }
      .custom-toast.active {
        transform: translateX(0);
        opacity: 1;
      }
      .custom-toast.fade-out {
        transform: translateY(-20px) scale(0.95);
        opacity: 0;
        transition: transform 0.3s ease, opacity 0.3s ease;
      }
      .custom-toast-success { border-left-color: #10b981; }
      .custom-toast-success .toast-icon { color: #10b981; }
      
      .custom-toast-error { border-left-color: #ef4444; }
      .custom-toast-error .toast-icon { color: #ef4444; }
      
      .custom-toast-warning { border-left-color: #f59e0b; }
      .custom-toast-warning .toast-icon { color: #f59e0b; }
      
      .custom-toast-info { border-left-color: #3b82f6; }
      .custom-toast-info .toast-icon { color: #3b82f6; }
      
      .toast-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.3rem;
        flex-shrink: 0;
      }
      .toast-content {
        flex-grow: 1;
        white-space: pre-line;
      }
      .toast-close {
        background: transparent;
        border: none;
        color: #94a3b8;
        font-size: 1.3rem;
        cursor: pointer;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color 0.2s ease, transform 0.2s ease;
        margin-left: 8px;
        line-height: 1;
      }
      .toast-close:hover {
        color: #475569;
        transform: scale(1.15);
      }
    `;
    document.head.appendChild(style);

    // Create container element
    const container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  },

  show(message, type = 'info', duration = 4000) {
    this.init();
    const container = document.getElementById('toast-container');

    const toast = document.createElement('div');
    toast.className = `custom-toast custom-toast-${type}`;

    let iconClass = 'fa-circle-info';
    if (type === 'success') iconClass = 'fa-circle-check';
    else if (type === 'error') iconClass = 'fa-circle-exclamation';
    else if (type === 'warning') iconClass = 'fa-triangle-exclamation';

    toast.innerHTML = `
      <div class="toast-icon"><i class="fa-solid ${iconClass}"></i></div>
      <div class="toast-content">${message}</div>
      <button class="toast-close">&times;</button>
    `;

    container.appendChild(toast);

    // Animate in
    setTimeout(() => {
      toast.classList.add('active');
    }, 20);

    const closeToast = () => {
      toast.classList.remove('active');
      toast.classList.add('fade-out');
      setTimeout(() => {
        toast.remove();
      }, 300);
    };

    // Auto dismiss
    const dismissTimer = setTimeout(closeToast, duration);

    // Manual dismiss
    toast.querySelector('.toast-close').addEventListener('click', () => {
      clearTimeout(dismissTimer);
      closeToast();
    });
  },

  success(message, duration) { this.show(message, 'success', duration); },
  error(message, duration) { this.show(message, 'error', duration); },
  warning(message, duration) { this.show(message, 'warning', duration); },
  info(message, duration) { this.show(message, 'info', duration); }
};

// Auto-check for pending session toasts when page loads
document.addEventListener('DOMContentLoaded', () => {
  const pendingMessage = sessionStorage.getItem('toastMessage');
  const pendingType = sessionStorage.getItem('toastType') || 'info';
  if (pendingMessage) {
    setTimeout(() => {
      Toast.show(pendingMessage, pendingType);
      sessionStorage.removeItem('toastMessage');
      sessionStorage.removeItem('toastType');
    }, 200);
  }
});
