/* Endereço aposentado em 24/09/2026: o protocolo de dor torácica mudou para https://piepe-guanambi.github.io/
   (o domínio startn1-study.github.io é do app N1). Gerado por ferramentas/gen_aposentar.py.
   Apaga só os caches dt-* do protocolo, desregistra-se e leva as abas para o endereço novo. */
var NOVO = 'https://piepe-guanambi.github.io/';
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys()
    .then(function (ks) { return Promise.all(ks.filter(function (k) { return k.indexOf('dt-') === 0; })
      .map(function (k) { return caches.delete(k); })); })
    .then(function () { return self.registration.unregister(); })
    .then(function () { return self.clients.matchAll({ type: 'window' }); })
    .then(function (cs) { cs.forEach(function (c) { c.navigate(NOVO); }); }));
});
