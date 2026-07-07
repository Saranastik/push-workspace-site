const API = 'https://api.github.com';

export function ghPath(path) {
  return path.split('/').map(encodeURIComponent).join('/');
}

function b64utf8(text) {
  return btoa(String.fromCharCode(...new TextEncoder().encode(text)));
}

export class GH {
  constructor(token, owner, repo, branch = 'main') {
    Object.assign(this, { token, owner, repo, branch });
  }

  async req(path, { accept = 'application/vnd.github+json', ...opts } = {}) {
    const r = await fetch(`${API}${path}`, {
      ...opts,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: accept,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
    if (r.status === 401 || r.status === 403) throw new Error('AUTH');
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`GitHub API ${r.status}: ${await r.text()}`);
    return r;
  }

  contents(path, extra = '') {
    return `/repos/${this.owner}/${this.repo}/contents/${ghPath(path)}?ref=${this.branch}${extra}`;
  }

  async getRaw(path) {
    const r = await this.req(this.contents(path, `&t=${Date.now()}`), { accept: 'application/vnd.github.raw+json' });
    return r ? await r.text() : null;
  }

  async getJson(path) {
    const raw = await this.getRaw(path);
    return raw === null ? null : JSON.parse(raw);
  }

  async listDir(path) {
    const r = await this.req(this.contents(path, `&t=${Date.now()}`));
    if (!r) return [];
    const arr = await r.json();
    return Array.isArray(arr) ? arr.map(({ name, path }) => ({ name, path })) : [];
  }

  async putFile(path, text, message) {
    const existing = await this.req(this.contents(path));
    const sha = existing ? (await existing.json()).sha : undefined;
    const r = await this.req(`/repos/${this.owner}/${this.repo}/contents/${ghPath(path)}`, {
      method: 'PUT',
      body: JSON.stringify({ message, branch: this.branch, content: b64utf8(text), ...(sha ? { sha } : {}) }),
    });
    return r.json();
  }

  async latestRuns(n = 3) {
    const r = await this.req(`/repos/${this.owner}/${this.repo}/actions/runs?per_page=${n}&t=${Date.now()}`);
    if (!r) return [];
    const { workflow_runs = [] } = await r.json();
    return workflow_runs.map(({ status, conclusion, html_url, created_at }) => ({ status, conclusion, html_url, created_at }));
  }
}
