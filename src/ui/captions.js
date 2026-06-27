// The two caption lines: GIDEON's words (large, white) and yours (small, below).

export class Captions {
  constructor() {
    this.aiEl = document.getElementById('aiCaption')
    this.userEl = document.getElementById('userCaption')
    this._aiHideT = null
    this._userHideT = null
  }

  ai(text, { streaming = false } = {}) {
    clearTimeout(this._aiHideT)
    this.aiEl.classList.add('show')
    this.aiEl.innerHTML = escapeHtml(text) + (streaming ? '<span class="cursor"></span>' : '')
    if (!streaming) this._aiHideT = setTimeout(() => this.aiEl.classList.remove('show'), 9000)
  }

  user(text, { interim = false } = {}) {
    clearTimeout(this._userHideT)
    this.userEl.classList.add('show')
    this.userEl.style.opacity = interim ? '0.6' : '1'
    this.userEl.textContent = text
    if (!interim) this._userHideT = setTimeout(() => this.userEl.classList.remove('show'), 6000)
  }

  clearUser() {
    this.userEl.classList.remove('show')
    this.userEl.textContent = ''
  }
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}
