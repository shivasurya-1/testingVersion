from django.urls import path
from .views import PriorityView,search_priorities

urlpatterns = [
      path('priority/', PriorityView.as_view(), name='priority_list'),
      path('priority/<int:pk>/', PriorityView.as_view(), name='priority_detail'),
      path('priority_earch/', search_priorities, name='search_priorities'),
]