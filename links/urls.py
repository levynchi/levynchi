from django.urls import path, re_path
from . import views

urlpatterns = [
    path('', views.personal_links, name='personal_links'),
    path('proxy/catalog/', views.proxy_catalog, name='proxy_catalog'),
    re_path(r'^proxy/catalog/(?P<path>.+)$', views.proxy_catalog),
    path('proxy/queuer/', views.proxy_queuer, name='proxy_queuer'),
    re_path(r'^proxy/queuer/(?P<path>.+)$', views.proxy_queuer),
    path('proxy/seminars/', views.proxy_seminars, name='proxy_seminars'),
    re_path(r'^proxy/seminars/(?P<path>.+)$', views.proxy_seminars),
    path('proxy/boutique/', views.proxy_boutique, name='proxy_boutique'),
    re_path(r'^proxy/boutique/(?P<path>.+)$', views.proxy_boutique),
]
