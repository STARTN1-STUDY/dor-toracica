/* Protocolo de dor torácica — service worker (gerado por gen_app.py; não edite app/sw.js).
 *
 * CACHE PRIMEIRO, REVALIDA POR TRÁS — o contrário do app de coleta (04-app/sw.js), de propósito.
 * Lá, rede primeiro fazia sentido: 14 estagiários precisavam receber correções no meio da coleta.
 * Aqui é consulta à beira do leito com o 4G ruim da UPA: esperar 3,5 s pela rede antes de mostrar
 * a dose seria o defeito. Então abre do cache na hora e busca a versão nova em segundo plano; o app
 * mostra "Há versão nova do protocolo" quando ela chega (o protocolo VALIDADO precisa chegar a todos).
 *
 * Herdado do 04-app/sw.js, que aprendeu no ar: nada em /.netlify/ é do app (o Netlify injeta um
 * script de 33 KB); a chave ignora a query; caminho sem extensão também procura o .html (Pretty URLs).
 * Novo: resposta REDIRECIONADA não é guardada — o Netlify redireciona index.html → /, e servir um
 * redirect do cache numa navegação quebra a página.
 */
var VERSAO = 'dt-29b72da2';
var ESSENCIAIS = ['./', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-512-maskable.png', './icon-180.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSAO)
    .then(function (c) { return c.addAll(ESSENCIAIS); })
    .then(function () { return self.skipWaiting(); }));
});

/* Apaga só os caches DESTE app (prefixo dt-). No GitHub Pages o protocolo divide a origem
   startn1-study.github.io com o app N1 (raiz): Cache Storage é por origem, e apagar "tudo que não
   é a minha versão" derrubava o N1 offline de quem abrisse o protocolo. Medido em 24/09; G31. */
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys()
    .then(function (ks) { return Promise.all(ks.map(function (k) { return (k === VERSAO || k.indexOf('dt-') !== 0) ? null : caches.delete(k); })); })
    .then(function () { return self.clients.claim(); }));
});

function guarda(chave, r) {
  if (r && r.ok && !r.redirected && r.type === 'basic') {
    var copia = r.clone();
    caches.open(VERSAO).then(function (c) { c.put(chave, copia); });
  }
  return r;
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var u; try { u = new URL(req.url); } catch (err) { return; }
  if (u.origin !== self.location.origin) return;
  if (u.pathname.indexOf('/.netlify/') === 0) return;

  var chave = new Request(u.origin + u.pathname, { method: 'GET' });
  /* Só caminho SEM extensão e SEM barra final ganha a chave alternativa .html. Para "/", a conta
     antiga (herdada do 04-app) dava origem + "" + ".html" = "http://localhost:8761.html": URL
     inválida, o new Request lançava exceção ANTES do respondWith e o navegador ia à rede — offline,
     página de erro. No Netlify (sem porta) a URL saía válida e só não casava, por isso nunca apareceu.
     Medido em 24/09. */
  var alt = (/\/$/.test(u.pathname) || /\.[a-z0-9]+$/i.test(u.pathname)) ? null
    : new Request(u.origin + u.pathname + '.html', { method: 'GET' });
  var raiz = new Request(new URL('./', self.registration.scope).href, { method: 'GET' });

  /* A revalidação começa JÁ e o waitUntil é chamado aqui, de forma síncrona. A 1ª versão chamava
     e.waitUntil() de dentro de uma promise, depois do despacho: o Chrome pode recusar, a recusa
     derruba o respondWith e o app não abria offline. Medido em 24/09 (página de erro do Chrome). */
  var rede = fetch(req).then(function (r) { return guarda(chave, r); });
  e.waitUntil(rede.then(function () {}, function () {}));
  e.respondWith(
    caches.match(chave).then(function (hit) {
      if (hit) return hit;                                                     // na hora, do cache
      return rede.catch(function () {                                          // sem cópia: rede; sem rede:
        return (alt ? caches.match(alt) : Promise.resolve(null)).then(function (a) {
          return a || (req.mode === 'navigate' ? caches.match(raiz) : null) || Response.error();
        });
      });
    })
  );
});
