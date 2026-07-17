(function () {
  'use strict';

  var Modal = function (options) {
    options = options || {};

    this.options = {
      title: options.title || '',
      content: options.content || '',
      footer: options.footer || '',
      closeOnOverlay: options.closeOnOverlay !== false,
      showConfirm: options.showConfirm !== false,
      showCancel: options.showCancel !== false,
      confirmText: options.confirmText || '确认',
      cancelText: options.cancelText || '取消',
      width: options.width || '500px',
      preventScroll: options.preventScroll !== false
    };

    this._confirmHandler = null;
    this._cancelHandler = null;
    this._open = false;
    this._focusableElements = [];
    this._focusedIndex = -1;

    this._build();
  };

  Modal.prototype._build = function () {
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:2000;opacity:0;visibility:hidden;transition:all 0.2s ease-out;';

    var content = document.createElement('div');
    content.className = 'modal-content';
    content.style.cssText =
      'background:var(--bg-secondary,#141428);border-radius:var(--radius-lg,12px);padding:var(--spacing-lg,24px);' +
      'max-width:' + this.options.width + ';width:90%;max-height:90vh;overflow-y:auto;' +
      'box-shadow:var(--shadow-lg,0 8px 32px rgba(0,0,0,0.5));border:1px solid rgba(255,255,255,0.06);' +
      'transform:scale(0.9);opacity:0;transition:all 0.2s ease-out;';

    var header = document.createElement('div');
    header.className = 'modal-header';
    header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--spacing-md,16px);';

    var title = document.createElement('span');
    title.className = 'modal-title';
    title.style.cssText = 'font-size:18px;font-weight:700;color:var(--text-primary,#e0e0e0);';
    title.textContent = this.options.title;

    var closeBtn = document.createElement('button');
    closeBtn.className = 'modal-close';
    closeBtn.style.cssText =
      'width:32px;height:32px;display:flex;align-items:center;justify-content:center;' +
      'border-radius:50%;color:var(--text-muted,#555577);transition:all 0.2s ease;background:none;border:none;cursor:pointer;font-size:16px;';
    closeBtn.textContent = '✕';
    closeBtn.setAttribute('aria-label', '关闭');

    header.appendChild(title);
    header.appendChild(closeBtn);

    var body = document.createElement('div');
    body.className = 'modal-body';
    body.style.cssText = 'margin-bottom:var(--spacing-md,16px);color:var(--text-secondary,#8888aa);font-size:14px;line-height:1.6;';
    if (this.options.content) {
      if (typeof this.options.content === 'string') {
        body.innerHTML = this.options.content;
      } else if (this.options.content instanceof HTMLElement) {
        body.appendChild(this.options.content);
      }
    }

    var footer = document.createElement('div');
    footer.className = 'modal-footer';
    footer.style.cssText =
      'display:flex;justify-content:flex-end;gap:var(--spacing-sm,8px);' +
      'padding-top:var(--spacing-md,16px);border-top:1px solid rgba(255,255,255,0.06);';

    if (this.options.footer) {
      if (typeof this.options.footer === 'string') {
        footer.innerHTML = this.options.footer;
      } else if (this.options.footer instanceof HTMLElement) {
        footer.appendChild(this.options.footer);
      }
    }

    if (this.options.showCancel) {
      var cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn btn-secondary';
      cancelBtn.textContent = this.options.cancelText;
      cancelBtn.style.cssText =
        'display:inline-flex;align-items:center;justify-content:center;gap:var(--spacing-sm,8px);' +
        'padding:10px 20px;border-radius:var(--radius-md,8px);font-size:14px;font-weight:600;cursor:pointer;' +
        'transition:all 0.2s ease-out;white-space:nowrap;user-select:none;' +
        'background:transparent;color:var(--color-primary-light,#a29bfe);border:1px solid var(--color-primary,#6c5ce7);';
      footer.appendChild(cancelBtn);
    }

    if (this.options.showConfirm) {
      var confirmBtn = document.createElement('button');
      confirmBtn.className = 'btn btn-primary';
      confirmBtn.textContent = this.options.confirmText;
      confirmBtn.style.cssText =
        'display:inline-flex;align-items:center;justify-content:center;gap:var(--spacing-sm,8px);' +
        'padding:10px 20px;border-radius:var(--radius-md,8px);font-size:14px;font-weight:600;cursor:pointer;' +
        'transition:all 0.2s ease-out;white-space:nowrap;user-select:none;' +
        'background:var(--color-primary,#6c5ce7);color:#fff;border:none;';
      footer.appendChild(confirmBtn);
    }

    content.appendChild(header);
    content.appendChild(body);
    content.appendChild(footer);
    overlay.appendChild(content);

    this.overlay = overlay;
    this.contentEl = content;
    this.titleEl = title;
    this.bodyEl = body;
    this.footerEl = footer;
    this.closeBtn = closeBtn;
    this.confirmBtn = footer.querySelector('.btn-primary');
    this.cancelBtn = footer.querySelector('.btn-secondary');

    document.body.appendChild(overlay);

    this._attachEvents();
  };

  Modal.prototype._attachEvents = function () {
    var self = this;

    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', function () { self.hide(); });
    }

    if (this.options.closeOnOverlay && this.overlay) {
      this.overlay.addEventListener('click', function (e) {
        if (e.target === self.overlay) self.hide();
      });
    }

    if (this.cancelBtn) {
      this.cancelBtn.addEventListener('click', function () {
        if (typeof self._cancelHandler === 'function') {
          self._cancelHandler();
        }
        self.hide();
      });
    }

    if (this.confirmBtn) {
      this.confirmBtn.addEventListener('click', function () {
        if (typeof self._confirmHandler === 'function') {
          self._confirmHandler();
        }
      });
    }

    this._keydownHandler = function (e) {
      if (e.key === 'Escape') self.hide();
      if (e.key === 'Tab') self._handleTab(e);
    };
    document.addEventListener('keydown', this._keydownHandler);
  };

  Modal.prototype.show = function (content) {
    if (content !== undefined) {
      if (typeof content === 'string') {
        this.bodyEl.innerHTML = content;
      } else if (content instanceof HTMLElement) {
        this.bodyEl.innerHTML = '';
        this.bodyEl.appendChild(content);
      }
    }

    this._open = true;
    this.overlay.style.visibility = 'visible';
    this.overlay.style.opacity = '1';
    this.contentEl.style.transform = 'scale(1)';
    this.contentEl.style.opacity = '1';

    if (this.options.preventScroll) {
      document.body.style.overflow = 'hidden';
    }

    this._focusableElements = this._getFocusableElements();
    this._focusedIndex = -1;
    if (this._focusableElements.length > 0) {
      setTimeout(function () {
        self._focusableElements[0].focus();
      }, 100);
    }

    var self = this;
    setTimeout(function () {
      if (self.confirmBtn) self.confirmBtn.focus();
    }, 150);
  };

  Modal.prototype.hide = function () {
    this._open = false;
    this.overlay.style.opacity = '0';
    this.contentEl.style.transform = 'scale(0.9)';
    this.contentEl.style.opacity = '0';

    document.body.style.overflow = '';

    var self = this;
    setTimeout(function () {
      self.overlay.style.visibility = 'hidden';
    }, 200);
  };

  Modal.prototype.setTitle = function (title) {
    if (this.titleEl) this.titleEl.textContent = title;
  };

  Modal.prototype.setContent = function (html) {
    if (this.bodyEl) {
      if (typeof html === 'string') {
        this.bodyEl.innerHTML = html;
      } else if (html instanceof HTMLElement) {
        this.bodyEl.innerHTML = '';
        this.bodyEl.appendChild(html);
      }
    }
  };

  Modal.prototype.setFooter = function (html) {
    if (this.footerEl) {
      if (typeof html === 'string') {
        this.footerEl.innerHTML = html;
      } else if (html instanceof HTMLElement) {
        this.footerEl.innerHTML = '';
        this.footerEl.appendChild(html);
      }
      this.confirmBtn = this.footerEl.querySelector('.btn-primary');
      this.cancelBtn = this.footerEl.querySelector('.btn-secondary');
    }
  };

  Modal.prototype.onConfirm = function (callback) {
    this._confirmHandler = callback;
  };

  Modal.prototype.onCancel = function (callback) {
    this._cancelHandler = callback;
  };

  Modal.prototype.destroy = function () {
    if (this._keydownHandler) {
      document.removeEventListener('keydown', this._keydownHandler);
    }
    if (this._scrollHandler) {
      window.removeEventListener('scroll', this._scrollHandler);
    }
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    document.body.style.overflow = '';
  };

  Modal.prototype._handleTab = function (e) {
    if (this._focusableElements.length === 0) return;

    var first = this._focusableElements[0];
    var last = this._focusableElements[this._focusableElements.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  Modal.prototype._getFocusableElements = function () {
    if (!this.overlay) return [];
    return Array.from(this.overlay.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ));
  };

  window.Modal = Modal;

  // Singleton instance for simple use cases
  if (!window._modalSingleton) {
    window._modalSingleton = null;
  }
  Modal.show = function (opts) {
    if (window._modalSingleton) {
      try { window._modalSingleton.hide(); } catch (e) {}
    }
    window._modalSingleton = new Modal(opts);
    window._modalSingleton.show();
    return window._modalSingleton;
  };
  Modal.hide = function () {
    if (window._modalSingleton) {
      window._modalSingleton.hide();
      window._modalSingleton = null;
    }
  };
})();
