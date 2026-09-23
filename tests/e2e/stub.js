// Supabase / Chart.js / jsPDF simulados en memoria, para probar la app
// en un navegador real sin tocar la base de datos de producción.
(() => {
  const BID = 'biz-1';
  const DB = {
    business_members: [],
    businesses: [{
      id: BID, name: 'Le Salon de Nathalie', onboarding_completed: true,
      language: 'es', theme: 'dark', background_url: null,
      currency_symbol: '$', tax_enabled: true, tax_percentage: 18,
      tax_included_in_price: false,
      payment_methods: { efectivo: true, transferencia: true, tarjeta: true, credito: true },
      business_type: 'individual'
    }],
    business_settings: [],
    services: [
      { id: 'svc-corte', business_id: BID, name: 'Corte', price: 500, duration_minutes: 30, active: true },
      { id: 'svc-tinte', business_id: BID, name: 'Tinte', price: 1500, duration_minutes: 90, active: true },
      { id: 'svc-unas', business_id: BID, name: 'Manicure', price: 300, duration_minutes: 45, active: true }
    ],
    specialist_services: [],
    customers: [{ id: 'cli-1', business_id: BID, name: 'Ana Pérez', phone: '809', email: 'a@b.c', address: 'Calle 1' }],
    appointments: [],
    invoices: [],
    customer_credits: [],
    activity_log: [],
    employee_invites: [],
    products: [], sales: []
  };
  window.__DB = DB;
  window.__WRITES = [];
  window.__PDF = [];

  let seq = 0;
  const uid = () => 'gen-' + (++seq);

  class Q {
    constructor(table) { this.t = table; this.f = []; this.op = 'select'; this.payload = null; }
    select() { return this; }
    eq(c, v) { this.f.push([c, v]); return this; }
    neq() { return this; } gte() { return this; } lte() { return this; }
    order() { return this; } limit() { return this; }
    _rows() {
      return (DB[this.t] || []).filter(r => this.f.every(([c, v]) => r[c] === v));
    }
    _run() {
      if (this.op === 'insert') {
        const rows = this.payload.map(r => ({ id: r.id || uid(), created_at: new Date().toISOString(), ...r }));
        DB[this.t] = (DB[this.t] || []).concat(rows);
        window.__WRITES.push({ op: 'insert', table: this.t, rows: this.payload });
        return { data: rows, error: null };
      }
      if (this.op === 'update') {
        const rows = this._rows();
        rows.forEach(r => Object.assign(r, this.payload));
        window.__WRITES.push({ op: 'update', table: this.t, patch: this.payload });
        return { data: rows, error: null };
      }
      if (this.op === 'delete') {
        const rows = this._rows();
        DB[this.t] = DB[this.t].filter(r => !rows.includes(r));
        window.__WRITES.push({ op: 'delete', table: this.t });
        return { data: rows, error: null };
      }
      return { data: this._rows(), error: null };
    }
    insert(p) { this.op = 'insert'; this.payload = Array.isArray(p) ? p : [p]; return this; }
    upsert(p) { return this.insert(p); }
    update(p) { this.op = 'update'; this.payload = p; return this; }
    delete() { this.op = 'delete'; return this; }
    single() { const r = this._run(); return Promise.resolve({ data: r.data[0] || null, error: r.error }); }
    maybeSingle() { return this.single(); }
    then(res, rej) { return Promise.resolve(this._run()).then(res, rej); }
  }

  const session = { user: { id: BID, email: 'nathalie@salon.test' } };
  // Expuesta para que una prueba pueda simular otra sesión (p. ej. un
  // empleado) mutando session.user DESPUÉS de este script, sin tener que
  // preocuparse por el orden de los addInitScript.
  window.__SESSION = session;
  window.supabase = {
    createClient: () => ({
      from: (t) => new Q(t),
      rpc: () => Promise.resolve({ data: null, error: null }),
      removeAllChannels: () => {},
      channel: () => ({ on: () => ({ subscribe: () => {} }), subscribe: () => {} }),
      storage: { from: () => ({
        upload: () => Promise.resolve({ error: null }),
        getPublicUrl: () => ({ data: { publicUrl: 'https://example.test/bg.png' } })
      }) },
      auth: {
        onAuthStateChange: (cb) => { setTimeout(() => cb('SIGNED_IN', session), 0); return { data: { subscription: { unsubscribe() {} } } }; },
        getUser: () => Promise.resolve({ data: { user: session.user } }),
        getSession: () => Promise.resolve({ data: { session } }),
        updateUser: () => Promise.resolve({ error: null }),
        signOut: () => Promise.resolve({ error: null }),
        signUp: () => Promise.resolve({ error: null }),
        signInWithPassword: () => Promise.resolve({ error: null }),
        signInWithOAuth: () => Promise.resolve({ error: null })
      }
    })
  };

  window.Chart = function () { return { destroy() {}, update() {} }; };
  window.Chart.register = () => {};

  // jsPDF simulado: registra cada texto dibujado para poder inspeccionar la factura
  window.jspdf = { jsPDF: function () {
    const lines = [];
    const api = {
      setFont: () => api, setFontSize: () => api, setTextColor: () => api,
      setDrawColor: () => api, setFillColor: () => api,
      rect: () => api, line: () => api, addImage: () => api,
      getTextWidth: () => 10,
      text: (s, x, y) => { lines.push({ text: String(s), x, y }); return api; },
      output: () => { window.__PDF.push(lines); return 'blob:fake'; },
      save: () => { window.__PDF.push(lines); }
    };
    return api;
  } };

  window.open = () => null;
})();
