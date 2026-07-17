(function () {
  'use strict';

  var container = null;

  function getContainer() {
    if (container) return container;
    container = document.createElement('div');
    container.className = 'toast-container';
    container.style.cssText =
      'position:fixed;bottom:24px;right:24px;z-index:3000;display:flex;flex-direction:column;' +
      'gap:8px;pointer-events:none;max-width:360px;width:auto;';

    var existing = document.querySelector('.toast-container');
    if (existing) {
      container = existing;
      return container;
    }

    document.body.appendChild(container);

    var style = document.createElement('style');
    style.textContent = '\n      .toast-item {\n        padding: 12px 20px;\n        border-radius: var(--radius-md, 8px);\n        font-size: 14px;\n        color: #fff;\n        box-shadow: var(--shadow-md, 0 4px 16px rgba(0,0,0,0.4));\n        backdrop-filter: blur(10px);\n        -webkit-backdrop-filter: blur(10px);\n        transform: translateX(120%);\n        transition: transform 0.3s ease-out, opacity 0.3s ease-out;\n        pointer-events: auto;\n        display: flex;\n        align-items: center;\n        gap: 8px;\n        max-width: 100%;\n        word-break: break-word;\n        line-height: 1.4;\n      }\n      .toast-item.show {\n        transform: translateX(0);\n      }\n      .toast-item.hiding {\n        transform: translateX(120%);\n        opacity: 0;\n      }\n      .toast-item.success {\n        background: rgba(0, 184, 148, 0.92);\n      }\n      .toast-item.error {\n        background: rgba(225, 112, 85, 0.92);\n      }\n      .toast-item.warning {\n        background: rgba(253, 203, 110, 0.92);\n        color: #1a1a2e;\n      }\n      .toast-item.info {\n        background: rgba(116, 185, 255, 0.92);\n      }\n      .toast-close {\n        background: none;\n        border: none;\n        color: inherit;\n        cursor: pointer;\n        padding: 0;\n        font-size: 16px;\n        opacity: 0.7;\n        flex-shrink: 0;\n        line-height: 1;\n        margin-left: auto;\n      }\n      .toast-close:hover {\n        opacity: 1;\n      }\n    ';
    document.head.appendChild(style);

    return container;
  }

  function show(message, type, duration, showClose) {
    if (type === undefined) type = 'info';
    if (duration === undefined) duration = 3000;
    if (showClose === undefined) showClose = true;

    var c = getContainer();

    var toast = document.createElement('div');
    toast.className = 'toast-item ' + type;

    var iconMap = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    var icon = document.createElement('span');
    icon.textContent = iconMap[type] || '';
    icon.style.cssText = 'font-weight:bold;flex-shrink:0;';

    var msgSpan = document.createElement('span');
    msgSpan.style.cssText = 'flex:1;';
    msgSpan.textContent = message;

    toast.appendChild(icon);
    toast.appendChild(msgSpan);

    if (showClose) {
      var closeBtn = document.createElement('button');
      closeBtn.className = 'toast-close';
      closeBtn.textContent = '✕';
      closeBtn.addEventListener('click', function () {
        dismiss(toast);
      });
      toast.appendChild(closeBtn);
    }

    c.appendChild(toast);

    requestAnimationFrame(function () {
      toast.classList.add('show');
    });

    if (duration > 0) {
      setTimeout(function () {
        dismiss(toast);
      }, duration);
    }

    return toast;
  }

  function dismiss(toast) {
    if (!toast || toast._dismissing) return;
    toast._dismissing = true;
    toast.classList.remove('show');
    toast.classList.add('hiding');

    setTimeout(function () {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }

  var Toast = {
    show: function (message, type, duration) {
      return show(message, type, duration, true);
    },
    success: function (message, duration) {
      return show(message, 'success', duration || 3000, true);
    },
    error: function (message, duration) {
      return show(message, 'error', duration || 4000, true);
    },
    warning: function (message, duration) {
      return show(message, 'warning', duration || 3500, true);
    },
    info: function (message, duration) {
      return show(message, 'info', duration || 3000, true);
    },
    dismiss: function (toast) {
      if (toast) dismiss(toast);
    },
    dismissAll: function () {
      if (!container) return;
      var toasts = container.querySelectorAll('.toast-item');
      toasts.forEach(function (t) { dismiss(t); });
    }
  };

  window.Toast = Toast;
})();
