import re
import requests
from urllib.parse import urljoin, urlparse
from django.shortcuts import render
from django.http import HttpResponse, HttpResponseServerError
from django.views.decorators.clickjacking import xframe_options_exempt
import logging

logger = logging.getLogger(__name__)

# #region agent log
import json as _json, time as _time, os as _os
def _dbglog(hyp, message, data):
    try:
        rec = {"sessionId": "cbadb7", "runId": "run1", "hypothesisId": hyp,
               "location": "links/views.py", "message": message, "data": data,
               "timestamp": int(_time.time() * 1000)}
        _p = _os.path.join(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))), "debug-cbadb7.log")
        with open(_p, "a", encoding="utf-8") as _f:
            _f.write(_json.dumps(rec, ensure_ascii=False) + "\n")
    except Exception:
        pass
# #endregion

PROJECTS = [
    {
        'name': 'קטלוג בגדי תינוקות',
        'description': 'גלריית מוצרים עם סינון לפי גיל וגודל',
        'tag': 'Catalog',
        'icon': 'catalog',
        'icon_img': 'icons/thumb_catalog_white_logo.png',
        'url': '#',
        'preview': 'proxy_catalog',
        'preview_id': 'preview-1',
    },
    {
        'name': 'אפליקציית ניהול תורים',
        'description': 'קביעת תורים אונליין — ללא הורדת אפליקציה',
        'tag': 'Web App',
        'icon': 'calendar',
        'icon_img': 'icons/queuer.png',
        'url': '#',
        'preview': 'proxy_queuer',
        'preview_id': 'preview-2',
    },
    {
        'name': 'סדנאות גיל המעבר',
        'description': 'דף נחיתה לסדנאות לנשים — רישום וקביעת מקום',
        'tag': 'Landing Page',
        'icon': 'users',
        'icon_img': 'icons/seminars.png',
        'url': '#',
        'preview': 'proxy_seminars',
        'preview_id': 'preview-3',
    },
    {
        'name': 'אריה בוטיק',
        'description': 'חנות אונליין לבוטיק אופנה — קטלוג מוצרים, עגלת קניות ותשלום',
        'tag': 'E-Commerce',
        'icon': 'shop',
        'icon_img': 'icons/boutique.png',
        'url': '#',
        'preview': 'proxy_boutique',
        'preview_id': 'preview-4',
    },
]

@xframe_options_exempt
def personal_links(request):
    path_key = request.path.strip('/')
    if path_key == 'about':
        initial_route = 'about'
    elif path_key == 'projects':
        initial_route = 'projects'
    else:
        initial_route = 'home'
    return render(
        request,
        'links/personal_links.html',
        {'projects': PROJECTS, 'initial_route': initial_route},
    )


def morph_demo(request):
    return render(request, 'links/morph_demo.html', {'projects': PROJECTS})


def _proxy_site(request, base_site, proxy_prefix, default_path, path=''):
    target_url = base_site + '/' + (path if path else default_path.lstrip('/'))

    # #region agent log
    _t0 = _time.time()
    _dbglog("A", "proxy request start", {"base_site": base_site, "proxy_prefix": proxy_prefix,
            "path": path, "is_first_load": (path == ''), "target_url": target_url, "timeout": 15})
    # #endregion

    try:
        session = requests.Session()
        # Forward cookies from browser to external site
        for cookie_header in request.headers.get('Cookie', '').split(';'):
            cookie_header = cookie_header.strip()
            if '=' in cookie_header:
                name, value = cookie_header.split('=', 1)
                session.cookies.set(name.strip(), value.strip(), domain=urlparse(base_site).hostname)
        resp = session.get(
            target_url,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': request.headers.get('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'),
            },
            timeout=15,
            allow_redirects=True,
        )
        resp.raise_for_status()
        all_cookies = session.cookies
        # #region agent log
        _dbglog("A", "proxy request success", {"base_site": base_site, "path": path,
                "is_first_load": (path == ''), "status_code": resp.status_code,
                "elapsed_s": round(_time.time() - _t0, 2),
                "content_len": len(resp.content),
                "content_type": resp.headers.get('Content-Type', '')})
        # #endregion
    except Exception as e:
        # #region agent log
        _dbglog("A", "proxy request FAILED", {"base_site": base_site, "path": path,
                "is_first_load": (path == ''), "exc_type": type(e).__name__,
                "exc_msg": str(e)[:300], "elapsed_s": round(_time.time() - _t0, 2)})
        # #endregion
        return HttpResponseServerError(f'לא ניתן לטעון את האתר כרגע. שגיאה: {e}')

    host = urlparse(base_site).netloc
    content_type = resp.headers.get('Content-Type', '')
    print(f'[PROXY] {target_url} -> {content_type} | {len(resp.content)}b')

    # For non-HTML responses (JSON, JS, CSS etc.) return as-is
    if 'text/html' not in content_type:
        print(f'[PROXY NON-HTML] {target_url} -> {content_type} {len(resp.content)}b')
        response = HttpResponse(resp.content, content_type=content_type)
        response['Access-Control-Allow-Origin'] = '*'
        for name, value in all_cookies.items():
            response.cookies[name] = value
        return response

    html = resp.text

    # Make root-relative URLs absolute (fixes /static/, /media/, etc.)
    html = re.sub(
        r'((?:src|href|action)=")(/[^"]*)"',
        lambda m: f'{m.group(1)}{base_site}{m.group(2)}"',
        html,
    )
    html = re.sub(
        r"((?:src|href|action)=')(/[^']*)'",
        lambda m: f"{m.group(1)}{base_site}{m.group(2)}'",
        html,
    )
    # Rewrite url() in inline style attributes (background-image etc.)
    html = re.sub(
        r'url\(["\']?(/[^)"\']+)["\']?\)',
        lambda m: f'url({base_site}{m.group(1)})',
        html,
    )

    # Rewrite <a href> links through proxy
    def rewrite_a_tag(match):
        tag, href = match.group(1), match.group(2)
        if href.startswith(('#', 'javascript:', 'mailto:', 'tel:')):
            return match.group(0)
        abs_url = urljoin(target_url, href)
        parsed = urlparse(abs_url)
        if parsed.netloc == host:
            proxy_href = proxy_prefix + parsed.path
            if parsed.query:
                proxy_href += '?' + parsed.query
            return f'{tag}href="{proxy_href}"'
        return match.group(0)

    html = re.sub(r'(<a\b[^>]*)href="([^"]*)"', rewrite_a_tag, html)
    html = re.sub(r"(<a\b[^>]*)href='([^']*)'", rewrite_a_tag, html)

    # Inject JS intercept early to catch JS-driven navigation
    intercept_js = f"""<script>
(function() {{
  var HOST = '{host}';
  var PROXY = '{proxy_prefix}';
  function proxyUrl(href) {{
    try {{
      var url = new URL(href);
      if (url.hostname === HOST) return PROXY + url.pathname + url.search;
    }} catch(e) {{}}
    return null;
  }}
  document.addEventListener('click', function(e) {{
    var a = e.target.closest('a');
    if (!a || !a.href) return;
    var p = proxyUrl(a.href);
    if (p) {{ e.preventDefault(); e.stopImmediatePropagation(); window.location.href = p; }}
  }}, true);
  ['assign','replace'].forEach(function(fn) {{
    var orig = window.location[fn].bind(window.location);
    window.location[fn] = function(url) {{ orig(proxyUrl(url) || url); }};
  }});
  function rewriteApiUrl(url) {{
    if (typeof url !== 'string') return url;
    var p = proxyUrl(url);
    if (p) return p;
    // Root-relative URL (e.g. /api/...) — send through proxy
    if (url.startsWith('/') && !url.startsWith(PROXY)) return PROXY + url;
    return url;
  }}
  // Intercept fetch
  var _fetch = window.fetch;
  window.fetch = function(url, opts) {{
    return _fetch(rewriteApiUrl(url), opts);
  }};
  // Intercept XHR
  var _open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {{
    return _open.call(this, method, rewriteApiUrl(url));
  }};
}})();
</script>"""
    html = html.replace('<head>', '<head>' + intercept_js, 1)

    response = HttpResponse(html, content_type='text/html; charset=utf-8')
    for name, value in all_cookies.items():
        response.cookies[name] = value
    return response


@xframe_options_exempt
def proxy_catalog(request, path=''):
    return _proxy_site(request, 'https://arye-textil.co.il', '/proxy/catalog', '/white-catalog/', path)


@xframe_options_exempt
def proxy_queuer(request, path=''):
    return _proxy_site(request, 'https://queuer.co.il', '/proxy/queuer', '/accounts/demo/queueR-demo-2025/', path)


@xframe_options_exempt
def proxy_seminars(request, path=''):
    return _proxy_site(request, 'https://web-production-f2761.up.railway.app', '/proxy/seminars', '/', path)


@xframe_options_exempt
def proxy_boutique(request, path=''):
    return _proxy_site(request, 'https://arye-boutique.co.il', '/proxy/boutique', '/?demo=461671fc-ec16-43cf-84b2-61af6d0a2bd3', path)
