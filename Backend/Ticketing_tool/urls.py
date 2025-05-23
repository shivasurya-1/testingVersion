"""
URL configuration for Ticketing_tool project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path,include
from django.conf import settings
from django.conf.urls.static import static
urlpatterns = [
    path('admin/', admin.site.urls),
    path('user/',include('login_details.urls')),
    path('ticket/',include('timer.urls')),
    path('roles/',include('roles_creation.urls')),
    path('org/',include('organisation_details.urls')),
    path('category/',include('category.urls')),
    path('solution_grp/',include('solution_groups.urls')), 
    path('priority/',include('priority.urls')),
    path('knowledge_article/',include('knowledge_article.urls')),
    path('details/',include('personal_details.urls')),
    path('project/',include('project_details.urls')),
    path('resolution/',include('resolution.urls')),
    path('five_notifications/',include('five_notifications.urls')),
    # path('solution/',include('solution.urls')),
    path('ticket/',include('history.urls')),
    path('services/',include('services.urls')),

]
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
